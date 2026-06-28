// agent/nodes/personalization.js
// Node 9 (Final): Reframes the synthesis verdict for the specific investor
// Reads: all prior state
// Writes: state.personalization, state.meta

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { buildPersonalizationPrompt } from "../prompts/personalizationPrompt.js";

import { getLLM } from "../lib/llm.js";
const llm = getLLM(0.2); // keep original temperature

export async function personalizationNode(state) {
  const { company, synthesis, fundamentals, technical, userInput, meta } = state;
  const nodeStart = Date.now();

  console.log(`[Node 9] Personalizing verdict for ${company.resolvedName}`);

  try {
    const prompt = buildPersonalizationPrompt({
      company,
      synthesis,
      fundamentals,
      technical,
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
      console.warn("[Node 9] Parse failed — using fallback");
      analysis = buildFallbackPersonalization(synthesis, userInput);
    }

    console.log(
      `[Node 9] ✓ Personalization complete in ${Date.now() - nodeStart}ms`
    );

    return {
      personalization: {
        capitalFlags: analysis.capitalFlags || [],
        goalAlignmentNote: analysis.goalAlignmentNote || "",
        riskAlignmentNote: analysis.riskAlignmentNote || "",
        concentrationWarning: analysis.concentrationWarning || "",
        liquidityWarning: analysis.liquidityWarning || "",
        timeHorizonNote: analysis.timeHorizonNote || "",
        suggestedPositionSizing: analysis.suggestedPositionSizing || "",
        finalFramedVerdict: analysis.finalFramedVerdict || "",
        simpleLanguageVerdict: analysis.simpleLanguageVerdict || "",
        keyActionItems: analysis.keyActionItems || [],
      },
      meta: {
        ...state.meta,
        completedAt: new Date().toISOString(),
        nodesCompleted: [
          ...(state.meta.nodesCompleted || []),
          "personalization",
        ],
      },
    };
  } catch (error) {
    console.error(`[Node 9] Error:`, error);
    return buildSkipState(state, error.message);
  }
}

function buildFallbackPersonalization(synthesis, userInput) {
  return {
    capitalFlags: ["Unable to compute capital-specific flags"],
    goalAlignmentNote: `Verdict is ${synthesis.verdict} — check if this aligns with your ${userInput.investmentGoal} goal.`,
    riskAlignmentNote: `Consider your ${userInput.riskAppetite} risk appetite against the confidence score of ${synthesis.confidenceScore}/100.`,
    concentrationWarning: "",
    liquidityWarning: "",
    timeHorizonNote: `Short-term verdict: ${synthesis.verdictShortTerm}. Long-term: ${synthesis.verdictLongTerm}.`,
    suggestedPositionSizing: "Consider starting with a partial position until signals clarify.",
    finalFramedVerdict: synthesis.analystSummary || "See analyst summary above.",
    simpleLanguageVerdict: synthesis.simpleExplanation || "See simple explanation above.",
    keyActionItems: [
      "Monitor the early warning signals from the pre-mortem",
      "Review the 'what would change this verdict' triggers",
      "Check back after next earnings announcement",
    ],
  };
}

function buildSkipState(state, reason) {
  return {
    personalization: {
      capitalFlags: [],
      goalAlignmentNote: "",
      riskAlignmentNote: "",
      concentrationWarning: "",
      liquidityWarning: "",
      timeHorizonNote: "",
      suggestedPositionSizing: "",
      finalFramedVerdict: state.synthesis?.analystSummary || "",
      simpleLanguageVerdict: state.synthesis?.simpleExplanation || "",
      keyActionItems: [],
    },
    meta: {
      ...state.meta,
      nodeErrors: [
        ...(state.meta.nodeErrors || []),
        { node: "personalization", error: reason },
      ],
    },
  };
}