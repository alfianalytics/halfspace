import {
  getLastNewsSyncDate,
  PeerComparisonCardSchema,
  PlayerScoutingCardSchema,
  PrematchLineupCardSchema,
  type RagDocument,
  upsertRagDocuments,
} from "@halfspace/db";
import { tavily } from "@tavily/core";
import "dotenv/config";

const LIGA1_CLUBS = [
  "Persib Bandung",
  "Persija Jakarta",
  "Persebaya Surabaya",
  "Borneo FC",
  "Bali United",
  "PSM Makassar",
  "Dewa United",
  "Persis Solo",
  "Arema FC",
  "PSIS Semarang",
  "Persita Tangerang",
  "Madura United",
  "PSS Sleman",
  "Barito Putera",
  "Persik Kediri",
  "Semen Padang",
  "Malut United",
  "PSBS Biak",
];

/**
 * WORKFLOW STEP 1: Pre-Flight Intent & Domain Guardrail Step
 * Deterministically extracts club/player entities, detects use-case mode,
 * and sets sample-size & proxy-metric instructions before the agent runs.
 */
export function runPreflightWorkflow(userPrompt: string): {
  detectedMode: "scouting" | "prematch" | "visual_report" | "out_of_scope" | "general_analytics";
  detectedClubs: string[];
  minMinutesRule: string;
  methodologyGuardrails: string[];
  workflowStepsExecuted: string[];
} {
  const lower = userPrompt.toLowerCase();
  const detectedClubs = LIGA1_CLUBS.filter((c) => {
    const short = c.split(" ")[0]!.toLowerCase();
    return lower.includes(c.toLowerCase()) || (short.length >= 4 && lower.includes(short));
  });

  // Detect out-of-scope requests (salaries, contracts, GPS sprint speeds, Liga 2/3, betting odds)
  const isOutOfScope =
    /gaji|salary|kontrak|nilai kontrak|sprint speed|gps|kecepatan lari|liga 2|liga 3|taruhan|judi|betting|odds/i.test(
      lower,
    );

  let detectedMode: "scouting" | "prematch" | "visual_report" | "out_of_scope" | "general_analytics" =
    "general_analytics";

  if (isOutOfScope) {
    detectedMode = "out_of_scope";
  } else if (/prematch|pre-match|starting xi|lineup|susunan pemain|prediksi lineup|vs\b|lawan/i.test(lower)) {
    detectedMode = "prematch";
  } else if (/report|evolusi|2 musim|dua musim|card|visual|perbandingan|bandingkan/i.test(lower)) {
    detectedMode = "visual_report";
  } else if (/scout|carikan|cari pemain|rekomendasi|gelandang|bek|striker|kiper|u-?23|u23/i.test(lower)) {
    detectedMode = "scouting";
  }

  const methodologyGuardrails: string[] = [
    "Sample Size Guard: Default minimum playing time is >= 450 minutes for full seasons (24/25, 25/26) and >= 180 minutes (with Early Season Sample badge) for ongoing season 26/27.",
    "True Positional Filter: Require >= 35% of season minutes played at the target on-pitch position.",
    "Defensive Adjustment: Always report Possession-Adjusted (PAdj per 500 opponent touches) alongside Raw Per-90 stats [method-padj-defense].",
  ];

  if (/progres|progressive/i.test(lower)) {
    methodologyGuardrails.push(
      "CRITICAL PROXY RULE: Progressive Passes event data does NOT exist in the Liga 1 feed. State this explicitly and use Accurate Long Balls / 90 (accurate_long_balls) and Opposition Half Passes / 90 as the progression proxies [method-progression-proxy-liga1].",
    );
  }
  if (/chance|key.?pass|peluang/i.test(lower)) {
    methodologyGuardrails.push(
      "CRITICAL METRIC RULE: In our feed, key_pass already includes goal_assist. Treat Chances Created and Key Passes as the exact same metric; never sum key_pass + goal_assist [method-keypass-and-positions].",
    );
  }

  return {
    detectedMode,
    detectedClubs,
    minMinutesRule: "450 mins (full season) / 180 mins (ongoing 26/27 with Early Season Sample badge)",
    methodologyGuardrails,
    workflowStepsExecuted: [
      `workflow:preflight_intent_parser(${detectedMode})`,
      `workflow:sample_and_position_guard(>=450m_or_180m,>=35%_pos)`,
    ],
  };
}

/**
 * WORKFLOW STEP 2: Deterministic Visual Report Schema Validator
 */
export function validateVisualCardPayload(
  type: "player_scouting" | "prematch_lineup" | "peer_comparison",
  payload: unknown,
) {
  if (type === "player_scouting") {
    return PlayerScoutingCardSchema.parse(payload);
  }
  if (type === "prematch_lineup") {
    return PrematchLineupCardSchema.parse(payload);
  }
  return PeerComparisonCardSchema.parse(payload);
}

/**
 * WORKFLOW STEP 3: Hybrid News & Context Sync Pipeline
 * Fetches latest Indonesian Liga 1 news via Tavily / sports portals, tags club entities,
 * chunks into 400-600 token documents, and upserts into `halfspace.rag_documents`.
 */
export async function runHybridNewsSyncWorkflow(options?: {
  force?: boolean;
  clubQuery?: string;
}): Promise<{
  synced: boolean;
  date: string;
  documentsUpserted: number;
  articles: Array<{ docId: string; title: string; club?: string; sourceUrl: string }>;
}> {
  const today = new Date().toISOString().split("T")[0]!;
  const lastSync = getLastNewsSyncDate();

  if (!options?.force && lastSync === today) {
    return {
      synced: false,
      date: today,
      documentsUpserted: 0,
      articles: [],
    };
  }

  const newDocs: RagDocument[] = [];
  const apiKey = process.env.TAVILY_API_KEY;

  if (apiKey) {
    try {
      const tvly = tavily({ apiKey });
      const searchQ = options?.clubQuery
        ? `Berita terbaru Liga 1 Indonesia ${options.clubQuery} cedera akumulasi kartu starting XI`
        : "Berita Liga 1 Indonesia terbaru cedera pemain akumulasi kartu kuning prediksi susunan pemain Persib Persija Persebaya";
      const response = await tvly.search(searchQ, { maxResults: 5 });

      for (const [idx, item] of (response.results ?? []).entries()) {
        const matchedClub = LIGA1_CLUBS.find((c) =>
          `${item.title} ${item.content}`.toLowerCase().includes(c.split(" ")[0]!.toLowerCase()),
        );
        const slug = `news-live-${today}-${idx + 1}`;
        newDocs.push({
          docId: slug,
          title: item.title || `Update Berita Liga 1 (${today})`,
          category: "news",
          club: matchedClub,
          publishedDate: today,
          sourceUrl: item.url || "https://bola.com/indonesia",
          content: (item.content || item.title || "").slice(0, 1800),
        });
      }
    } catch (err: any) {
      console.warn("[Workflow: NewsSync] Tavily live fetch skipped:", err?.message || err);
    }
  }

  const count = await upsertRagDocuments(newDocs, today);
  return {
    synced: true,
    date: today,
    documentsUpserted: count,
    articles: newDocs.map((d) => ({
      docId: d.docId,
      title: d.title,
      club: d.club,
      sourceUrl: d.sourceUrl,
    })),
  };
}

// Allow running directly via `pnpm sync:news`
if (process.argv[1]?.endsWith("workflow-news-sync.ts")) {
  runHybridNewsSyncWorkflow({ force: true })
    .then((res) => {
      console.log("✓ Hybrid News Sync Workflow finished:", JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("News Sync failed:", err);
      process.exit(1);
    });
}
