import type { AgentResponse } from "@anvia/core/agent";
import { agentEvalTarget, contains, runEvalCli } from "@anvia/core/evals";
import { ensureHalfspaceSchema } from "@halfspace/db";
import "dotenv/config";
import { createHalfspaceAgent } from "../agent.js";
import { getLens } from "../lens.js";
import { HALFSPACE_EVAL_CASES } from "./cases.js";

await ensureHalfspaceSchema();

const agent = createHalfspaceAgent({ maxTurns: 5 });

// Allow running a fast subset (`pnpm eval -- --quick`) or the full 25 golden cases
const isQuick = process.argv.includes("--quick");
const selectedCases = isQuick ? HALFSPACE_EVAL_CASES.slice(0, 6) : HALFSPACE_EVAL_CASES;

const casesForAnvia = selectedCases.map((c) => ({
  id: c.id,
  input: c.input,
  expected: c.expectedKeywords[0]!.toLowerCase(),
}));

console.log(`Running Halfspace Eval Suite (${casesForAnvia.length} cases)...`);

await runEvalCli({
  name: "halfspace-liga1-v1",
  cases: casesForAnvia,
  target: agentEvalTarget<string>({
    agent,
    request: ({ input }) => ({ prompt: input }),
  }),
  metrics: [
    contains<string, AgentResponse<string>, string>({
      actual: ({ output }) => (output.output || "").toLowerCase(),
    }),
  ],
  concurrency: 1,
  format: "pretty",
  exitCode: false,
});

await getLens().flush().catch(() => {});
