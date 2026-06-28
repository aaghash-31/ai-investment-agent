// agent/nodes/bearCase.js
// Node 6: Generates the strongest possible bear case from all prior analysis
// Reads: state.company, state.fundamentals, state.technical, state.newsAndMacro
// Writes: state.bearCase, state.meta

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { buildBearPrompt } from "../prompts/bearPrompt.js";

import { getLLM } from "../lib/llm.js";
const llm = getLLM(0.3); // keep original temperature

export async function bearCaseNode(state) {
  const { company, fundamentals, technical, newsAndMacro } = state;
  const nodeStart = Date.now();

  if (!company.isResolved) {
    return buildSkipState(state, "Company not resolved");
  }

  console.log(`[Node 6] Building bear case for ${company.resolvedName}`);

  try {
    const prompt = buildBearPrompt(company, fundamentals, technical, newsAndMacro);
    const llmResponse = await llm.invoke([new HumanMessage(prompt)]);

    let analysis;
    try {
      const clean = llmResponse.content.trim().replace(/```json|```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch {
      console.warn("[Node 6] Parse failed — using fallback");
      analysis = buildFallbackBear(fundamentals);
    }

    console.log(
      `[Node 6] ✓ Bear case: strength=${analysis.strengthScore}/10 in ${Date.now() - nodeStart}ms`
    );

    return {
      bearCase: {
        arguments: analysis.arguments || [],
        riskFactors: analysis.riskFactors || [],
        redFlags: analysis.redFlags || [],
        strengthScore: analysis.strengthScore,
        summary: analysis.summary || "",
        simpleExplanation: analysis.simpleExplanation || "",
      },
      meta: {
        ...state.meta,
        nodesCompleted: [...(state.meta.nodesCompleted || []), "bearCase"],
      },
    };
  } catch (error) {
    console.error(`[Node 6] Error:`, error);
    return buildSkipState(state, error.message);
  }
}

function buildFallbackBear(fundamentals) {
  const score = fundamentals.score ? Math.max(10 - fundamentals.score, 2) : 5;
  return {
    arguments: fundamentals.keyWeaknesses?.map((w) => w) || ["Some fundamental concerns noted"],
    riskFactors: ["Market conditions", "Sector headwinds"],
    redFlags: [],
    strengthScore: score,
    summary: "Bear case generated from fundamental weaknesses. LLM analysis unavailable.",
    simpleExplanation: "There are some risks to consider before investing in this company.",
  };
}

function buildSkipState(state, reason) {
  return {
    bearCase: {
      arguments: [],
      riskFactors: [],
      redFlags: [],
      strengthScore: 5,
      summary: "",
      simpleExplanation: "",
    },
    meta: {
      ...state.meta,
      nodeErrors: [...(state.meta.nodeErrors || []), { node: "bearCase", error: reason }],
    },
  };
}