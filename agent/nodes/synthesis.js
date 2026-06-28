// agent/nodes/synthesis.js
// Node 8: Final synthesis — combines all analysis into a single verdict
// Reads: all prior state
// Writes: state.synthesis, state.meta

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { buildSynthesisPrompt } from "../prompts/synthesisPrompt.js";
import {
  computeConfidence,
  computeDataCompleteness,
  confidenceLabel,
} from "../lib/confidence.js";

import { getLLM } from "../lib/llm.js";
const llm = getLLM(0.1); // keep original temperature

export async function synthesisNode(state) {
  const {
    company, fundamentals, technical,
    newsAndMacro, bullCase, bearCase,
    preMortem, userInput, meta,
  } = state;
  const nodeStart = Date.now();

  console.log(`[Node 8] Running synthesis for ${company.resolvedName}`);

  try {
    // ── STEP 1: Compute confidence score ─────────────────
    const dataCompleteness = computeDataCompleteness(
      fundamentals, technical, newsAndMacro
    );

    const missingNodeCount = (meta.nodeErrors || []).length;

    const confidence = computeConfidence({
      bullStrength: bullCase.strengthScore,
      bearStrength: bearCase.strengthScore,
      faScore: fundamentals.score,
      taScore: technical.score,
      newsScore: newsAndMacro.score,
      dataCompleteness,
      missingNodeCount,
    });

    console.log(
      `[Node 8] Confidence: ${confidence.total}/100 | Data completeness: ${Math.round(dataCompleteness * 100)}%`
    );

    // ── STEP 2: Build prompt and get LLM verdict ──────────
    const prompt = buildSynthesisPrompt({
      company,
      fundamentals,
      technical,
      newsAndMacro,
      bullCase,
      bearCase,
      preMortem,
      confidenceScore: confidence.total,
      confidenceBreakdown: confidence.breakdown,
      userInput,
    });

    const llmResponse = await llm.invoke([new HumanMessage(prompt)]);

    let analysis;
    try {
      const clean = llmResponse.content
        .trim()
        .replace(/```json|```/g, "")
        .trim();
      analysis = JSON.parse(clean);
    } catch {
      console.warn("[Node 8] Parse failed — using fallback verdict");
      analysis = buildFallbackSynthesis(fundamentals, technical, newsAndMacro);
    }

    // ── STEP 3: Determine overall data quality label ───────
    const overallDataQuality =
      dataCompleteness >= 0.75
        ? "high"
        : dataCompleteness >= 0.5
        ? "medium"
        : "low";

    console.log(
      `[Node 8] ✓ Synthesis: verdict=${analysis.verdict}, confidence=${confidence.total}/100 in ${Date.now() - nodeStart}ms`
    );

    return {
      synthesis: {
        // Verdict
        verdict: analysis.verdict,
        verdictShortTerm: analysis.verdictShortTerm,
        verdictLongTerm: analysis.verdictLongTerm,
        verdictRationale: analysis.verdictRationale,

        // Confidence (computed, not hardcoded)
        confidenceScore: confidence.total,
        confidenceLabel: confidenceLabel(confidence.total),
        confidenceBreakdown: confidence.breakdown,

        // Score breakdown
        scoreBreakdown: analysis.scoreBreakdown,

        // Signals and conflicts
        conflictsInSignals: analysis.conflictsInSignals || [],
        whatWeDidNotFactorIn: analysis.whatWeDidNotFactorIn || [],
        keyRisksToMonitor: analysis.keyRisksToMonitor || [],
        whatWouldChangeVerdict: preMortem.whatWouldChangeVerdict || [],

        // Suitability
        investmentSuitability: analysis.investmentSuitability || "",

        // Narrative
        analystSummary: analysis.analystSummary || "",
        simpleExplanation: analysis.simpleExplanation || "",

        // Data quality
        overallDataQuality,
        dataCompletenessScore: Math.round(dataCompleteness * 100),
      },
      meta: {
        ...state.meta,
        completedAt: new Date().toISOString(),
        overallDataQuality,
        nodesCompleted: [
          ...(state.meta.nodesCompleted || []),
          "synthesis",
        ],
      },
    };
  } catch (error) {
    console.error(`[Node 8] Error:`, error);
    return buildSkipState(state, error.message);
  }
}

// ─────────────────────────────────────────────────────────
// FALLBACK: if LLM fails, compute verdict from scores
// ─────────────────────────────────────────────────────────
function buildFallbackSynthesis(fundamentals, technical, newsAndMacro) {
  const scores = [
    fundamentals.score,
    technical.score,
    newsAndMacro.score,
  ].filter(Boolean);

  const avg = scores.length
    ? scores.reduce((s, v) => s + v, 0) / scores.length
    : 5;

  let verdict;
  if (avg >= 7.5) verdict = "buy";
  else if (avg >= 6) verdict = "cautious_buy";
  else if (avg >= 4.5) verdict = "hold";
  else if (avg >= 3) verdict = "cautious_pass";
  else verdict = "pass";

  return {
    verdict,
    verdictShortTerm: verdict,
    verdictLongTerm: verdict,
    verdictRationale: `Average score across FA/TA/News: ${avg.toFixed(1)}/10. LLM synthesis unavailable.`,
    scoreBreakdown: {
      fundamentals: fundamentals.score || 0,
      technical: technical.score || 0,
      newsAndMacro: newsAndMacro.score || 0,
      governance: 5,
    },
    conflictsInSignals: [],
    whatWeDidNotFactorIn: ["LLM synthesis unavailable — fallback scoring used"],
    keyRisksToMonitor: [],
    investmentSuitability: "Unable to assess — insufficient analysis",
    analystSummary: `Fallback verdict based on average score of ${avg.toFixed(1)}/10 across available analysis layers.`,
    simpleExplanation: "Analysis is limited. Please try again for a full report.",
  };
}

function buildSkipState(state, reason) {
  return {
    synthesis: {
      verdict: "hold",
      verdictShortTerm: "hold",
      verdictLongTerm: "hold",
      verdictRationale: "Synthesis failed — insufficient data",
      confidenceScore: 0,
      confidenceLabel: "very_low",
      conflictsInSignals: [],
      whatWeDidNotFactorIn: ["Synthesis node failed: " + reason],
      analystSummary: "",
      simpleExplanation: "",
    },
    meta: {
      ...state.meta,
      nodeErrors: [
        ...(state.meta.nodeErrors || []),
        { node: "synthesis", error: reason },
      ],
    },
  };
}