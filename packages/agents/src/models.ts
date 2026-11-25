import path from "node:path";
import { fileURLToPath } from "node:url";
import { OpenAIClient } from "@anvia/openai";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const DEFAULT_MODEL_ID = process.env.MODEL_ID || "deepseek-v4.1-flash:fast";

export const MODEL_OPTIONS = [
  { id: "deepseek-v4.1-flash:fast", label: "DeepSeek v4.1 Flash (Fast)", provider: "openai" },
  { id: "deepseek-v4-pro", label: "DeepSeek v4 Pro", provider: "openai" },
  { id: "gpt-4o", label: "GPT-4o (OpenAI)", provider: "openai" },
  { id: "gemini/gemini-3.7-flash", label: "Gemini 3.7 Flash", provider: "openai" },
] as const;

let client: OpenAIClient | undefined;

function getOpenAIClient(): OpenAIClient {
  if (!client) {
    client = new OpenAIClient({
      apiKey: process.env.OPENAI_API_KEY || "",
      baseUrl: process.env.OPENAI_BASE_URL || "https://ai.sumopod.com/v1",
    });
  }
  return client;
}

export function getModel(modelId: string = DEFAULT_MODEL_ID) {
  return getOpenAIClient().completionModel({ modelId, api: "chat" });
}
