import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createLiga1McpServer } from "./server.js";

serveStdio(() => createLiga1McpServer());
