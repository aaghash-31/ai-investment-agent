// agent/nodes/bullCase.js
// Node 5: Generates the strongest possible bull case from all prior analysis
// Reads: state.company, state.fundamentals, state.technical, state.newsAndMacro
// Writes: state.bullCase, state.meta

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { buildBullPrompt } from "../prompts/bullPrompt.js";

import { getLLM } from "../lib/llm.js";
const llm = getLLM(0.3); // keep original temperature

export async function bullCaseNode(state) {
  const { company, fundamentals, technical, newsAndMacro } = state;
  const nodeStart = Date.now();

  if (!company.isResolved) {
    return buildSkipState(state, "Company not resolved");
  }

  console.log(`[Node 5] Building bull case for ${company.resolvedName}`);

  try {
    const prompt = buildBullPrompt(company, fundamentals, technical, newsAndMacro);
    const llmResponse = await llm.invoke([new HumanMessage(prompt)]);

    let analysis;
    try {
      const clean = llmResponse.content.trim().replace(/```json|```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch {
      console.warn("[Node 5] Parse failed — using fallback");
      analysis = buildFallbackBull(fundamentals);
    }

    console.log(
      `[Node 5] ✓ Bull case: strength=${analysis.strengthScore}/10 in ${Date.now() - nodeStart}ms`
    );

    return {
      bullCase: {
        arguments: analysis.arguments || [],
        catalysts: analysis.catalysts || [],
        moatAssessment: analysis.moatAssessment || "",
        strengthScore: analysis.strengthScore,
        summary: analysis.summary || "",
        simpleExplanation: analysis.simpleExplanation || "",
      },
      meta: {
        ...state.meta,
        nodesCompleted: [...(state.meta.nodesCompleted || []), "bullCase"],
      },
    };
  } catch (error) {
    console.error(`[Node 5] Error:`, error);
    return buildSkipState(state, error.message);
  }
}

function buildFallbackBull(fundamentals) {
  const score = fundamentals.score ? Math.min(fundamentals.score + 1, 10) : 5;
  return {
    arguments: fundamentals.keyStrengths?.map((s) => s) || ["Fundamentals appear solid"],
    catalysts: ["Sector recovery", "Earnings improvement"],
    moatAssessment: "Unable to assess moat — insufficient data",
    strengthScore: score,
    summary: "Bull case generated from fundamental strengths. LLM analysis unavailable.",
    simpleExplanation: "The company has some positive fundamentals that could support an investment.",
  };
}

function buildSkipState(state, reason) {
  return {
    bullCase: {
      arguments: [],
      catalysts: [],
      moatAssessment: "",
      strengthScore: 5,
      summary: "",
      simpleExplanation: "",
    },
    meta: {
      ...state.meta,
      nodeErrors: [...(state.meta.nodeErrors || []), { node: "bullCase", error: reason }],
    },
  };
}