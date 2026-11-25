import path from "node:path";
import { fileURLToPath } from "node:url";
import { OpenAIClient } from "@anvia/openai";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const DEFAULT_MODEL_ID = process.env.MODEL_ID || "gpt-4o";

export const MODEL_OPTIONS = [
  { id: "gpt-4o", label: "GPT-4o (OpenAI)", provider: "openai" },
  { id: "gemini/gemini-3.7-flash", label: "Gemini 3.7 Flash", provider: "openai" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", provider: "openai" },
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
