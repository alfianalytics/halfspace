import { LensClient } from "@anvia/lens";
import "dotenv/config";

let client: LensClient | undefined;

export function getLens(): LensClient {
  if (!client) {
    client = new LensClient({
      baseUrl: process.env.ANVIA_LENS_BASE_URL || "http://localhost",
      publicKey: process.env.ANVIA_LENS_PUBLIC_KEY || "pk-lens-demo",
      secretKey: process.env.ANVIA_LENS_SECRET_KEY || "sk-lens-demo",
      serviceName: "halfspace-liga1-agent",
    });
  }
  return client;
}

export type TurnTraceRecord = {
  traceId: string;
  sessionId: string;
  timestamp: string;
  durationMs: number;
  workflowSteps: string[];
  mcpToolsCalled: string[];
  ragDocsCited: string[];
  modelId: string;
};

const recentTraces: TurnTraceRecord[] = [];

export function recordTurnTrace(trace: TurnTraceRecord) {
  recentTraces.unshift(trace);
  if (recentTraces.length > 100) recentTraces.pop();
}

export function getRecentTraces(sessionId?: string): TurnTraceRecord[] {
  if (sessionId) return recentTraces.filter((t) => t.sessionId === sessionId);
  return recentTraces.slice(0, 30);
}
