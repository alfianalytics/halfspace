import { existsSync, readFileSync } from "node:fs";
import { McpClient, McpClientGroup, type McpServer } from "@anvia/mcp";

type McpServerConfig = {
  type: "http";
  url: string;
  headers?: Record<string, string>;
  ssrfProtection?: "strict" | "disabled";
};

const CONFIG_URL = new URL("../../../mcp.json", import.meta.url);
const CONNECT_TIMEOUT_MS = 8_000;

function loadClients(): McpClient[] {
  if (!existsSync(CONFIG_URL)) return [];
  try {
    const { mcpServers = {} } = JSON.parse(readFileSync(CONFIG_URL, "utf8")) as {
      mcpServers?: Record<string, McpServerConfig>;
    };

    return Object.entries(mcpServers).map(
      ([name, config]) =>
        new McpClient({
          name,
          versionNegotiation: { mode: "auto" },
          transport: {
            type: "streamableHttp",
            url: config.url,
            headers: config.headers,
            ssrfProtection: config.ssrfProtection ?? "disabled",
          },
        }),
    );
  } catch {
    return [];
  }
}

let group: Promise<McpClientGroup> | undefined;

export async function getMcpServers(): Promise<readonly McpServer[]> {
  const clients = loadClients();
  if (clients.length === 0) return [];

  group ??= McpClientGroup.connect({
    clients,
    abortSignal: AbortSignal.timeout(CONNECT_TIMEOUT_MS),
  });

  try {
    return (await group).servers;
  } catch (error) {
    group = undefined;
    console.warn("[Halfspace MCP Client] Optional HTTP MCP connection skipped:", error);
    return [];
  }
}
