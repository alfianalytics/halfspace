import { Studio } from "@anvia/studio";
import { ensureHalfspaceSchema } from "@halfspace/db";
import "dotenv/config";
import { createHalfspaceAgent } from "./agent.js";
import { getLens } from "./lens.js";

const port = Number(process.env.STUDIO_PORT || 3001);

await ensureHalfspaceSchema();

const agent = createHalfspaceAgent();

console.log(`========================================================`);
console.log(`⚽ Starting Halfspace Anvia Studio on http://localhost:${port}`);
console.log(`   Agent ID: ${agent.id}`);
console.log(`   Connected to PostgreSQL: ${process.env.DB_HOST || "43.156.8.165"}/${process.env.DB_NAME || "football_db"}`);
console.log(`========================================================`);

export const studio = new Studio([agent]).serve({
  port,
  onShutdown: async () => {
    await getLens().flush().catch(() => {});
  },
});
