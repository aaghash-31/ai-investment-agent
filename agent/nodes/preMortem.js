// agent/nodes/preMortem.js
// Node 7: Pre-mortem — assumes investment made, asks what most likely breaks it
// Reads: state.company, state.fundamentals, state.technical, state.newsAndMacro,
//        state.bullCase, state.bearCase
// Writes: state.preMortem, state.meta

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { buildPreMortemPrompt } from "../prompts/preMortemPrompt.js";

import { getLLM } from "../lib/llm.js";
const llm = getLLM(0.2); // keep original temperature

export async function preMortemNode(state) {
  const { company, fundamentals, technical, newsAndMacro, bullCase, bearCase } = state;
  const nodeStart = Date.now();

  if (!company.isResolved) {
    return buildSkipState(state, "Company not resolved");
  }

  console.log(`[Node 7] Running pre-mortem for ${company.resolvedName}`);

  try {
    const prompt = buildPreMortemPrompt(
      company, fundamentals, technical,
      newsAndMacro, bullCase, bearCase
    );
    const llmResponse = await llm.invoke([new HumanMessage(prompt)]);

    let analysis;
    try {
      const clean = llmResponse.content.trim().replace(/```json|```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch {
      console.warn("[Node 7] Parse failed — using fallback");
      analysis = buildFallbackPreMortem(bearCase);
    }

    console.log(
      `[Node 7] ✓ Pre-mortem: failureProbability=${analysis.failureProbability} in ${Date.now() - nodeStart}ms`
    );

    return {
      preMortem: {
        assumedAction: "buy",
        mostLikelyFailureMode: analysis.mostLikelyFailureMode || "",
        secondaryFailureMode: analysis.secondaryFailureMode || "",
        earlyWarningSignals: analysis.earlyWarningSignals || [],
        whatWouldChangeVerdict: analysis.whatWouldChangeVerdict || [],
        failureProbability: analysis.failureProbability || "medium",
        timeHorizon: "6-12 months",
        summary: analysis.summary || "",
        simpleExplanation: analysis.simpleExplanation || "",
      },
      meta: {
        ...state.meta,
        nodesCompleted: [...(state.meta.nodesCompleted || []), "preMortem"],
      },
    };
  } catch (error) {
    console.error(`[Node 7] Error:`, error);
    return buildSkipState(state, error.message);
  }
}

function buildFallbackPreMortem(bearCase) {
  return {
    assumedAction: "buy",
    mostLikelyFailureMode: bearCase.riskFactors?.[0] || "Sector headwinds materialize",
    secondaryFailureMode: bearCase.riskFactors?.[1] || "Macro conditions deteriorate",
    earlyWarningSignals: ["Revenue growth slows below 5%", "Margins compress by 200bps+", "Promoter selling detected"],
    whatWouldChangeVerdict: ["Earnings beat for 2 consecutive quarters", "Debt reduction below target"],
    failureProbability: "medium",
    timeHorizon: "6-12 months",
    summary: "Pre-mortem based on bear case risk factors. LLM analysis unavailable.",
    simpleExplanation: "The main risk is that sector headwinds could hurt the company more than expected.",
  };
}

function buildSkipState(state, reason) {
  return {
    preMortem: {
      assumedAction: "buy",
      mostLikelyFailureMode: "",
      secondaryFailureMode: "",
      earlyWarningSignals: [],
      whatWouldChangeVerdict: [],
      failureProbability: "medium",
      timeHorizon: "6-12 months",
      summary: "",
      simpleExplanation: "",
    },
    meta: {
      ...state.meta,
      nodeErrors: [...(state.meta.nodeErrors || []), { node: "preMortem", error: reason }],
    },
  };
}