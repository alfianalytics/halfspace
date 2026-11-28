/**
 * Comprehensive End-to-End Verification Suite for Halfspace
 * Tests: Health, Upcoming Fixtures (Multi-League), Visual Studio APIs (Team & Player),
 * Web UI routes (`/` and `/studio`), and Live AI Chat Streaming (`anvia.client.v3`) across all 7 modes.
 *
 * Usage (while API on :8000 and Web on :3000 are running):
 *   pnpm.cmd --filter @halfspace/api exec tsx ../../scripts/e2e-verify.ts
 */

const API_BASE = process.env.API_URL || "http://localhost:8000";
const WEB_BASE = process.env.WEB_URL || "http://localhost:3000";

async function testJsonEndpoint(name: string, url: string, check: (data: any) => void) {
  const t0 = Date.now();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    check(data);
    console.log(`✅ PASS [${Date.now() - t0}ms] GET ${name}`);
    return true;
  } catch (err: any) {
    console.error(`❌ FAIL [${Date.now() - t0}ms] GET ${name}:`, err?.message || err);
    return false;
  }
}

async function testHtmlEndpoint(name: string, url: string) {
  const t0 = Date.now();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes("<html") && !html.includes("<!doctype") && !html.includes("<!DOCTYPE")) {
      throw new Error("Response is not HTML");
    }
    console.log(`✅ PASS [${Date.now() - t0}ms] HTML ${name}`);
    return true;
  } catch (err: any) {
    console.error(`❌ FAIL [${Date.now() - t0}ms] HTML ${name}:`, err?.message || err);
    return false;
  }
}

async function testChatPrompt(label: string, text: string, expectTool?: string) {
  const t0 = Date.now();
  const sessionId = `e2e-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "messages",
        messages: [{ role: "user", content: [{ type: "text", text }] }],
        metadata: { sessionId },
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`❌ FAIL [${Date.now() - t0}ms] CHAT [${label}] HTTP ${res.status}: ${errBody}`);
      return false;
    }

    const raw = await res.text();
    const lines = raw.split("\n").filter(Boolean);
    const events: any[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "stream_event" && parsed.event) {
          events.push(parsed.event);
        }
      } catch {
        // ignore
      }
    }

    const runErrors = events.filter((e) => e.type === "error" || (e.type === "run_end" && e.status === "error"));
    const toolErrors = events.filter((e) => e.type === "tool_result" && e.result?.status === "error");
    const toolCalls = events.filter((e) => e.type === "tool_result").map((e) => e.toolName);
    const cardTypes = events
      .filter((e) => e.type === "tool_result" && e.result?.status !== "error")
      .map((e) => e.result?.output?.visualCard?.cardType)
      .filter(Boolean);
    const textDeltas = events
      .filter((e) => e.type === "text_delta")
      .map((e) => e.delta)
      .join("");

    if (runErrors.length > 0 || toolErrors.length > 0) {
      console.error(
        `❌ FAIL [${Date.now() - t0}ms] CHAT [${label}] Error:`,
        JSON.stringify({ runErrors, toolErrors }).slice(0, 500),
      );
      return false;
    }
    if (textDeltas.trim().length < 20) {
      console.error(`❌ FAIL [${Date.now() - t0}ms] CHAT [${label}] Empty/short text`);
      return false;
    }
    if (expectTool && !toolCalls.includes(expectTool)) {
      console.error(
        `❌ FAIL [${Date.now() - t0}ms] CHAT [${label}] Expected tool ${expectTool}, got [${toolCalls.join(", ")}]`,
      );
      return false;
    }

    console.log(
      `✅ PASS [${Date.now() - t0}ms] CHAT [${label}] Tools=[${toolCalls.join(", ")}] Cards=[${cardTypes.join(", ")}] TextLen=${textDeltas.length}`,
    );
    return true;
  } catch (err: any) {
    console.error(`❌ FAIL [${Date.now() - t0}ms] CHAT [${label}]:`, err?.message || err);
    return false;
  }
}

async function main() {
  console.log("=== 1. API, STUDIO & WEB ENDPOINTS ===");
  const apiChecks = await Promise.all([
    testJsonEndpoint("Health /", `${API_BASE}/`, (d) => {
      if (d.status !== "ok") throw new Error("not ok");
    }),
    testJsonEndpoint("/api/fixtures?league=Liga 1", `${API_BASE}/api/fixtures?league=Liga%201`, (d) => {
      if (!d.fixtures?.length) throw new Error("no fixtures");
    }),
    testJsonEndpoint("/api/fixtures?league=Premier League", `${API_BASE}/api/fixtures?league=Premier%20League`, (d) => {
      if (!d.fixtures?.length) throw new Error("no EPL fixtures");
    }),
    testJsonEndpoint("/api/studio/options", `${API_BASE}/api/studio/options?league=Liga%201&season=26/27`, (d) => {
      if (!d.teams?.length || !d.players?.length) throw new Error("missing teams/players");
    }),
    testJsonEndpoint("/api/studio/team-style (Persib)", `${API_BASE}/api/studio/team-style?league=Liga%201&season=26/27&teamName=Persib`, (d) => {
      if (d.card?.cardType !== "team_style_profile") throw new Error("bad card");
    }),
    testJsonEndpoint("/api/studio/team-scatter", `${API_BASE}/api/studio/team-scatter?league=Liga%201&season=26/27`, (d) => {
      if (d.card?.cardType !== "team_scatter") throw new Error("bad card");
    }),
    testJsonEndpoint("/api/studio/player-card (Peralta)", `${API_BASE}/api/studio/player-card?league=Liga%201&season=26/27&playerName=Peralta`, (d) => {
      if (d.card?.cardType !== "player_scouting") throw new Error("bad card");
    }),
    testJsonEndpoint("/api/studio/player-scatter", `${API_BASE}/api/studio/player-scatter?league=Liga%201&season=25/26`, (d) => {
      if (d.card?.cardType !== "peer_comparison") throw new Error("bad card");
    }),
    testJsonEndpoint("/api/studio/player-ranking", `${API_BASE}/api/studio/player-ranking?league=Liga%201&season=26/27`, (d) => {
      if (d.card?.cardType !== "player_ranking") throw new Error("bad card");
    }),
    testHtmlEndpoint("Web /", `${WEB_BASE}/`),
    testHtmlEndpoint("Web /studio", `${WEB_BASE}/studio`),
  ]);

  console.log("\n=== 2. LIVE AI CHAT E2E STREAMING (ALL 7 MODES) ===");
  const chatChecks = [
    await testChatPrompt("Persib Lineup Next Match", "prediksi lineup persib untuk next match", "get_prematch_context"),
    await testChatPrompt("Persib vs Persija Prematch", "Analisis prematch Persib Bandung vs Persija Jakarta dan prediksi Starting XI", "get_prematch_context"),
    await testChatPrompt("Team Style Persib", "Bedah gaya main, strengths, weaknesses, dan key players Persib Bandung", "get_team_style_profile"),
    await testChatPrompt("Upcoming Schedule", "Jadwal Liga 1 minggu ini lawan siapa aja?", "get_upcoming_fixtures"),
    await testChatPrompt("Player Report Peralta", "Buatkan visual report scouting untuk Mariano Peralta", "get_player_report_data"),
    await testChatPrompt("Scouting U23 CM", "Carikan gelandang tengah (CM) U-23 lokal di Liga 1 musim 25/26 dengan progresi bola dan PAdj defense terbaik", "scout_players"),
    await testChatPrompt("Out of Scope Salary", "Berapa gaji Marc Klok di Persib Bandung?"),
  ];

  const totalPass = apiChecks.filter(Boolean).length + chatChecks.filter(Boolean).length;
  const totalTests = apiChecks.length + chatChecks.length;
  console.log(`\n========================================`);
  console.log(`FINAL E2E SUITE RESULT: ${totalPass}/${totalTests} PASSED`);
  console.log(`========================================`);
  process.exit(totalPass === totalTests ? 0 : 1);
}

void main();
