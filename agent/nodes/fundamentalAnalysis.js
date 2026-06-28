// agent/nodes/fundamentalAnalysis.js
// Node 2: Fetches financial data, computes ratios, LLM evaluates fundamentals
// Reads: state.company, state.userInput
// Writes: state.fundamentals, state.meta

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import {
  fetchFundamentals,
  extractRatios,
  fetchScreenerData,
} from "../tools/financialData.js";
import { buildFundamentalPrompt } from "../prompts/fundamentalPrompt.js";

import { getLLM } from "../lib/llm.js";
const llm = getLLM(0.1); // keep original temperature

// ─────────────────────────────────────────────────────────
// MAIN NODE FUNCTION
// ─────────────────────────────────────────────────────────
export async function fundamentalAnalysisNode(state) {
  const { company } = state;
  const nodeStart = Date.now();

  // Guard: if company wasn't resolved, skip gracefully
  if (!company.isResolved || !company.ticker) {
    console.log("[Node 2] Skipping — company not resolved");
    return buildSkipState(state, "Company not resolved — cannot run FA");
  }

  console.log(`[Node 2] Running fundamental analysis for ${company.ticker}`);

  try {
    // ── STEP 1: Fetch raw financial data ─────────────────
    console.log(`[Node 2] Fetching financial data...`);
    const [rawData, screenerData] = await Promise.all([
      fetchFundamentals(company.ticker),
      company.isIndian
        ? fetchScreenerData(company.ticker)
        : Promise.resolve({ success: false }),
    ]);

    if (!rawData.success) {
      console.warn(`[Node 2] Financial data fetch failed: ${rawData.error}`);
      return buildSkipState(state, `Financial data unavailable: ${rawData.error}`);
    }

    // ── STEP 2: Extract and compute ratios ───────────────
    console.log(`[Node 2] Extracting ratios...`);
    const ratios = extractRatios(rawData.data, company.ticker);

    if (screenerData.success) {
      console.log(
        `[Node 2] Screener data: promoter ${screenerData.promoterHoldingPct}%, pledged ${screenerData.pledgedSharesPct}%`
      );
    }

    // ── STEP 3: LLM evaluates fundamentals ───────────────
    console.log(`[Node 2] Sending to LLM for evaluation...`);
    const prompt = buildFundamentalPrompt(company, ratios, screenerData);

    const llmResponse = await llm.invoke([new HumanMessage(prompt)]);

    let analysis;
    try {
      const clean = llmResponse.content
        .trim()
        .replace(/```json|```/g, "")
        .trim();
      analysis = JSON.parse(clean);
    } catch {
      console.warn("[Node 2] LLM response parse failed — using fallback scoring");
      analysis = buildFallbackAnalysis(ratios);
    }

    // ── STEP 4: Apply score → gate result override ───────
    // Ensure gateResult matches score even if LLM is inconsistent
    if (analysis.score >= 6) analysis.gateResult = "pass";
    else if (analysis.score >= 4) analysis.gateResult = "caution";
    else analysis.gateResult = "fail";

    console.log(
      `[Node 2] ✓ FA complete: score=${analysis.score}/10, gate=${analysis.gateResult} in ${Date.now() - nodeStart}ms`
    );

    // ── STEP 5: Return updated state ─────────────────────
    return {
      fundamentals: {
        // Raw ratios
        revenueGrowthYoY: ratios.revenueGrowthYoY,
        revenueCAGR3Y: ratios.revenueCAGR3Y,
        grossMargin: ratios.grossMargin,
        operatingMargin: ratios.operatingMargin,
        netMargin: ratios.netMargin,
        roe: ratios.roe,
        roa: ratios.roa,
        roce: ratios.roce,
        debtToEquity: ratios.debtToEquity,
        interestCoverageRatio: ratios.interestCoverageRatio,
        currentRatio: ratios.currentRatio,
        totalDebt: ratios.totalDebt,
        totalCash: ratios.totalCash,
        netDebt: ratios.netDebt,
        operatingCashFlow: ratios.operatingCashFlow,
        freeCashFlow: ratios.freeCashFlow,
        netIncome: ratios.netIncome,
        cashFlowQualityFlag: ratios.cashFlowQualityFlag,
        trailingPE: ratios.trailingPE,
        forwardPE: ratios.forwardPE,
        pbRatio: ratios.pbRatio,
        pegRatio: ratios.pegRatio,
        priceToSales: ratios.priceToSales,
        evToEbitda: ratios.evToEbitda,
        dividendYield: ratios.dividendYield,
        payoutRatio: ratios.payoutRatio,
        fiveYearAvgDividendYield: ratios.fiveYearAvgDividendYield,
        trailingEps: ratios.trailingEps,
        forwardEps: ratios.forwardEps,
        quarterlyRevenues: ratios.quarterlyRevenues,

        // India-specific governance
        promoterHoldingPct: screenerData?.promoterHoldingPct ?? null,
        promoterHoldingTrend: screenerData?.promoterHoldingTrend ?? "unknown",
        pledgedSharesPct: screenerData?.pledgedSharesPct ?? null,

        // Data quality
        dataSource: "Yahoo Finance" + (screenerData?.success ? " + Screener.in" : ""),
        dataAsOf: ratios.dataAsOf,
        missingFields: ratios.missingFields,

        // LLM analysis output
        score: analysis.score,
        gateResult: analysis.gateResult,
        gateReason: analysis.gateReason,
        keyStrengths: analysis.keyStrengths || [],
        keyWeaknesses: analysis.keyWeaknesses || [],
        cashFlowAssessment: analysis.cashFlowAssessment || "",
        governanceFlags: analysis.governanceFlags || [],
        valuationAssessment: analysis.valuationAssessment || "",
        analystNotes: analysis.analystNotes || "",
        simpleExplanation: analysis.simpleExplanation || "",
      },
      meta: {
        ...state.meta,
        nodesCompleted: [
          ...(state.meta.nodesCompleted || []),
          "fundamentalAnalysis",
        ],
      },
    };
  } catch (error) {
    console.error(`[Node 2] Unexpected error:`, error);
    return buildSkipState(state, error.message);
  }
}

// ─────────────────────────────────────────────────────────
// FALLBACK: if LLM fails, compute a basic score from ratios
// ─────────────────────────────────────────────────────────
function buildFallbackAnalysis(ratios) {
  let score = 5; // start neutral

  if (ratios.roe > 15) score += 1;
  if (ratios.netMargin > 10) score += 0.5;
  if (ratios.debtToEquity < 0.5) score += 1;
  if (ratios.debtToEquity > 2) score -= 1.5;
  if (ratios.cashFlowQualityFlag === "healthy") score += 0.5;
  if (ratios.cashFlowQualityFlag === "concerning") score -= 1;
  if (ratios.currentRatio < 1) score -= 1;
  if (ratios.revenueGrowthYoY > 15) score += 0.5;
  if (ratios.revenueGrowthYoY < 0) score -= 1;

  score = Math.max(0, Math.min(10, score));

  const gateResult = score >= 6 ? "pass" : score >= 4 ? "caution" : "fail";

  return {
    score: parseFloat(score.toFixed(1)),
    gateResult,
    gateReason: "Auto-scored from financial ratios (LLM unavailable)",
    keyStrengths: [],
    keyWeaknesses: [],
    cashFlowAssessment: ratios.cashFlowQualityFlag,
    governanceFlags: [],
    valuationAssessment: "Not available",
    analystNotes: "LLM analysis unavailable — fallback scoring used.",
    simpleExplanation: "Analysis is limited — please try again.",
  };
}

// ─────────────────────────────────────────────────────────
// SKIP STATE: node ran but couldn't produce results
// Graph continues — synthesis will note this gap
// ─────────────────────────────────────────────────────────
function buildSkipState(state, reason) {
  return {
    fundamentals: {
      score: null,
      gateResult: "caution",
      gateReason: reason,
      keyStrengths: [],
      keyWeaknesses: [],
      missingFields: ["all"],
      dataAsOf: new Date().toISOString(),
      analystNotes: "",
      simpleExplanation: "",
    },
    meta: {
      ...state.meta,
      nodeErrors: [
        ...(state.meta.nodeErrors || []),
        { node: "fundamentalAnalysis", error: reason },
      ],
    },
  };
}