import OpenAI from "openai";
import { fetch as undiciFetch, ProxyAgent } from "undici";

const proxyUrl = process.env.OPENAI_HTTPS_PROXY;
const baseURL = process.env.OPENAI_BASE_URL;

const compatibleFetch = undiciFetch as unknown as typeof globalThis.fetch;

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL,
  timeout: 60000,
  maxRetries: 2,
  fetch: compatibleFetch,
  fetchOptions: proxyUrl
    ? {
        dispatcher: new ProxyAgent(proxyUrl),
      }
    : undefined,
});
