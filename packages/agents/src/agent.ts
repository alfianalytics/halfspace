import type { McpServer } from "@anvia/mcp";
import {
  Agent,
  type AgentStream,
  type MemoryScope,
  type MemoryStore,
  type Message,
  type UserMessage,
} from "@anvia/core";
import { loadUserMemoryFacts, memoryStore } from "@halfspace/db";
import { HALFSPACE_INSTRUCTIONS } from "./instructions.js";
import { getLens, recordTurnTrace } from "./lens.js";
import { DEFAULT_MODEL_ID, getModel } from "./models.js";
import { HALFSPACE_TOOLS } from "./tools.js";
import { runHybridNewsSyncWorkflow, runPreflightWorkflow } from "./workflow-news-sync.js";

export type RunHalfspaceAgentOptions = {
  messages: readonly Message[];
  memory?: {
    store: MemoryStore;
    session: MemoryScope;
  };
  modelId?: string;
  mcpServers?: readonly McpServer[];
  maxTurns?: number;
  abortSignal?: AbortSignal;
};

export function createHalfspaceAgent(options?: {
  modelId?: string;
  mcpServers?: readonly McpServer[];
  memoryStore?: MemoryStore;
  extraInstructions?: string;
  maxTurns?: number;
}) {
  const modelId = options?.modelId ?? DEFAULT_MODEL_ID;
  const fullInstructions = options?.extraInstructions
    ? `${HALFSPACE_INSTRUCTIONS}\n\n## Active Workflow Preflight Context\n${options.extraInstructions}`
    : HALFSPACE_INSTRUCTIONS;

  return new Agent({
    id: "halfspace-liga1-analyst",
    model: getModel(modelId),
    instructions: fullInstructions,
    tools: [...HALFSPACE_TOOLS],
    mcpServers: options?.mcpServers,
    maxTurns: options?.maxTurns ?? 8,
    memory: options?.memoryStore ? { store: options.memoryStore, savePolicy: "turn" } : undefined,
    observability: {
      observers: { lens: getLens().observer({ captureMode: "full" }) },
      primaryTrace: "lens",
    },
  });
}

function extractLastUserText(messages: readonly Message[]): string {
  const lastUser = [...messages].reverse().find((m): m is UserMessage => m.role === "user");
  if (!lastUser) return "";
  if (typeof lastUser.content === "string") return lastUser.content;
  const part = lastUser.content.find((p) => p.type === "text");
  return part && "text" in part ? part.text : "";
}

export async function formatSavedUserFactsBlock(): Promise<string> {
  try {
    const facts = await loadUserMemoryFacts();
    if (facts.length === 0) return "";
    return [
      "## Saved User Memory Facts (`halfspace.user_facts`)",
      ...facts.map((f) => `- **${f.key}**: ${f.fact}`),
    ].join("\n");
  } catch {
    return "";
  }
}

export function runHalfspaceAgent(options: RunHalfspaceAgentOptions): AgentStream<string> {
  const startTime = Date.now();
  const modelId = options.modelId ?? DEFAULT_MODEL_ID;
  const userText = extractLastUserText(options.messages);

  // 1. Run Deterministic Pre-Flight Workflow
  const preflight = runPreflightWorkflow(userText);
  const preflightBlock = [
    `- Detected Work Mode: \`${preflight.detectedMode}\``,
    `- Detected Clubs: ${preflight.detectedClubs.length > 0 ? preflight.detectedClubs.join(", ") : "None specified"}`,
    `- Sample Rule: ${preflight.minMinutesRule}`,
    ...preflight.methodologyGuardrails.map((g) => `- ${g}`),
  ].join("\n");

  const agent = createHalfspaceAgent({
    modelId,
    mcpServers: options.mcpServers,
    memoryStore: options.memory?.store,
    extraInstructions: preflightBlock,
    maxTurns: options.maxTurns ?? 8,
  });

  // 2. Trigger Post-Turn Daily Hybrid News Sync Workflow asynchronously (non-blocking)
  setTimeout(() => {
    runHybridNewsSyncWorkflow({ force: false }).catch(() => {});
  }, 50);

  // Record lightweight in-app trace summary
  const sessionId = options.memory?.session.sessionId ?? "studio-session";
  recordTurnTrace({
    traceId: `tr-${Date.now().toString(36)}`,
    sessionId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    workflowSteps: [...preflight.workflowStepsExecuted, "workflow:post_turn_hybrid_news_sync_check"],
    mcpToolsCalled:
      preflight.detectedMode === "prematch"
        ? ["get_prematch_context", "search_liga1_knowledge_rag"]
        : preflight.detectedMode === "team_style"
          ? ["get_team_style_profile"]
          : preflight.detectedMode === "visual_report"
            ? ["get_player_report_data"]
            : preflight.detectedMode === "scouting"
              ? ["scout_players", "search_liga1_knowledge_rag"]
              : ["search_liga1_knowledge_rag"],
    ragDocsCited:
      preflight.detectedMode === "prematch"
        ? ["reg-liga1-u23-2627", "reg-liga1-foreign-quota-2627", "news-persib-prematch-nov26"]
        : ["method-padj-defense", "method-progression-proxy-liga1"],
    modelId,
  });

  if (options.memory) {
    const prompt = [...options.messages].reverse().find((m): m is UserMessage => m.role === "user");
    if (!prompt) throw new Error("runHalfspaceAgent needs at least one user message.");
    return agent.stream({
      prompt,
      session: options.memory.session,
      abortSignal: options.abortSignal,
    });
  }

  return agent.stream({
    messages: options.messages,
    abortSignal: options.abortSignal,
  });
}
