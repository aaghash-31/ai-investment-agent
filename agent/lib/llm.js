// lib/llm.js
// Central LLM provider for all nodes
// Primary: Gemini 3.1 Flash-Lite - better free-tier fit for repeated company research
// Fallback: Groq - used when Gemini is unavailable or rate-limited

import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

export function getLLM(temperature = 0.1) {
  return new FallbackLLM({ temperature });
}

class FallbackLLM {
  constructor({
    temperature = 0.1,
    geminiModel = DEFAULT_GEMINI_MODEL,
    groqModel = DEFAULT_GROQ_MODEL,
  } = {}) {
    this.temperature = temperature;
    this.geminiModel = geminiModel;
    this.groqModel = groqModel;

    this.gemini = GEMINI_API_KEY
      ? new ChatGoogleGenerativeAI({
          model: geminiModel,
          temperature,
          apiKey: GEMINI_API_KEY,
        })
      : null;

    this.groq = GROQ_API_KEY
      ? new ChatGroq({
          model: groqModel,
          temperature,
          apiKey: GROQ_API_KEY,
        })
      : null;

    this.providers = [
      {
        name: "Gemini",
        model: geminiModel,
        client: this.gemini,
      },
      {
        name: "Groq",
        model: groqModel,
        client: this.groq,
      },
    ].filter((provider) => provider.client);

    if (!this.providers.length) {
      throw new Error(
        "No LLM provider configured. Set GOOGLE_API_KEY or GEMINI_API_KEY, and/or GROQ_API_KEY."
      );
    }
  }

  async invoke(messages) {
    let lastError = null;

    for (const provider of this.providers) {
      try {
        const response = await provider.client.invoke(messages);
        return response;
      } catch (error) {
        lastError = error;

        if (this.shouldTryNextProvider(error)) {
          console.warn(
            `[LLM] ${provider.name} (${provider.model}) unavailable: ${this.shortError(error)}. Trying next provider.`
          );
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error("All configured LLM providers failed.");
  }

  shouldTryNextProvider(error) {
    const message = String(error?.message || "").toLowerCase();
    const status = Number(error?.status || error?.response?.status || 0);

    return (
      status === 429 ||
      status === 503 ||
      status === 504 ||
      message.includes("rate limit") ||
      message.includes("quota") ||
      message.includes("too many requests") ||
      message.includes("resource_exhausted") ||
      message.includes("service unavailable") ||
      message.includes("high demand") ||
      message.includes("temporarily unavailable") ||
      message.includes("deadline exceeded") ||
      message.includes("timeout")
    );
  }

  shortError(error) {
    return String(error?.message || "Unknown error")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
  }
}
