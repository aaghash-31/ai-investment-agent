// agent/nodes/technicalAnalysis.js
// Node 3: Fetches OHLCV data, computes all TA indicators + SMC, LLM evaluates
// Reads: state.company, state.fundamentals
// Writes: state.technical, state.meta

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { fetchHistoricalData, computeIndicators } from "../tools/priceData.js";
import { buildTechnicalPrompt } from "../prompts/technicalPrompt.js";

import { getLLM } from "../lib/llm.js";
const llm = getLLM(0.1); // keep original temperature

// ─────────────────────────────────────────────────────────
// MAIN NODE FUNCTION
// ─────────────────────────────────────────────────────────
export async function technicalAnalysisNode(state) {
  const { company, fundamentals } = state;
  const nodeStart = Date.now();

  if (!company.isResolved || !company.ticker) {
    console.log("[Node 3] Skipping — company not resolved");
    return buildSkipState(state, "Company not resolved");
  }

  console.log(`[Node 3] Running technical analysis for ${company.ticker}`);

  try {
    // ── STEP 1: Fetch 250 days of historical OHLCV ────────
    console.log(`[Node 3] Fetching historical price data (250 days)...`);
    const historical = await fetchHistoricalData(company.ticker, 250);

    if (!historical.success || historical.data.length < 50) {
      console.warn(`[Node 3] Insufficient historical data`);
      return buildSkipState(state, `Insufficient price history: ${historical.error || "less than 50 candles"}`);
    }

    console.log(`[Node 3] Got ${historical.data.length} candles`);

    // ── STEP 2: Compute all indicators ────────────────────
    console.log(`[Node 3] Computing indicators...`);
    const indicators = computeIndicators(historical.data);

    if (!indicators.success) {
      return buildSkipState(state, indicators.error);
    }

    console.log(
      `[Node 3] MA Signal: ${indicators.maSignal} | RSI: ${indicators.rsi14} (${indicators.rsiSignal}) | SMC: ${indicators.smc.marketStructure}`
    );

    // ── STEP 3: LLM evaluates technical picture ───────────
    console.log(`[Node 3] Sending to LLM for evaluation...`);
    const prompt = buildTechnicalPrompt(
      company,
      indicators,
      fundamentals?.gateResult || "unknown"
    );

    const llmResponse = await llm.invoke([new HumanMessage(prompt)]);

    let analysis;
    try {
      const clean = llmResponse.content
        .trim()
        .replace(/```json|```/g, "")
        .trim();
      analysis = JSON.parse(clean);
    } catch {
      console.warn("[Node 3] LLM parse failed — using fallback");
      analysis = buildFallbackAnalysis(indicators);
    }

    console.log(
      `[Node 3] ✓ TA complete: score=${analysis.score}/10, signal=${analysis.signal} in ${Date.now() - nodeStart}ms`
    );

    // ── STEP 4: Return updated state ─────────────────────
    return {
      technical: {
        // Classical indicators
        currentPrice: indicators.currentPrice,
        ma20: indicators.ma20,
        ma50: indicators.ma50,
        ma200: indicators.ma200,
        ema20: indicators.ema20,
        ema50: indicators.ema50,
        ema12: indicators.ema12,
        ema26: indicators.ema26,
        macdLine: indicators.macdLine,
        rsi14: indicators.rsi14,

        // Signals
        maSignal: indicators.maSignal,
        maSignalDetail: indicators.maSignalDetail,
        rsiSignal: indicators.rsiSignal,
        volumeTrend: indicators.volumeTrend,
        volumePriceConfirmation: indicators.volumePriceConfirmation,

        // Price levels
        priceVsMA50: indicators.priceVsMA50,
        priceVsMA200: indicators.priceVsMA200,
        high52w: indicators.high52w,
        low52w: indicators.low52w,
        pctFromHigh: indicators.pctFromHigh,
        pctFromLow: indicators.pctFromLow,
        support: indicators.support,
        resistance: indicators.resistance,

        // Trend
        shortTermTrend: indicators.shortTermTrend,
        mediumTermTrend: indicators.mediumTermTrend,

        // SMC
        smc: indicators.smc,

        // Data meta
        candleCount: indicators.candleCount,
        dataFrom: indicators.dataFrom,
        dataTo: indicators.dataTo,
        dataAsOf: indicators.dataAsOf,
        missingFields: [],

        // LLM analysis
        score: analysis.score,
        signal: analysis.signal,
        signalStrength: analysis.signalStrength,
        entryTiming: analysis.entryTiming,
        keyTechnicalStrengths: analysis.keyTechnicalStrengths || [],
        keyTechnicalWeaknesses: analysis.keyTechnicalWeaknesses || [],
        smcInsight: analysis.smcInsight || "",
        analystNotes: analysis.analystNotes || "",
        simpleExplanation: analysis.simpleExplanation || "",
        shortTermOutlook: analysis.shortTermOutlook || "neutral",
        mediumTermOutlook: analysis.mediumTermOutlook || "neutral",
      },
      meta: {
        ...state.meta,
        nodesCompleted: [
          ...(state.meta.nodesCompleted || []),
          "technicalAnalysis",
        ],
      },
    };
  } catch (error) {
    console.error(`[Node 3] Unexpected error:`, error);
    return buildSkipState(state, error.message);
  }
}

// ─────────────────────────────────────────────────────────
// FALLBACK SCORING (if LLM fails)
// ─────────────────────────────────────────────────────────
function buildFallbackAnalysis(indicators) {
  let score = 5;

  if (indicators.maSignal?.includes("golden")) score += 1.5;
  if (indicators.maSignal?.includes("death")) score -= 1.5;
  if (indicators.rsiSignal === "oversold") score += 1;
  if (indicators.rsiSignal === "overbought") score -= 1;
  if (indicators.volumeTrend === "increasing") score += 0.5;
  if (indicators.shortTermTrend === "up") score += 0.5;
  if (indicators.shortTermTrend === "down") score -= 0.5;
  if (indicators.smc?.marketStructure === "bullish") score += 0.5;
  if (indicators.smc?.chochDetected) score += 0.5;

  score = Math.max(0, Math.min(10, score));
  const signal = score >= 7 ? "buy" : score >= 5 ? "neutral" : "wait";

  return {
    score: parseFloat(score.toFixed(1)),
    signal,
    signalStrength: "weak",
    entryTiming: "wait_for_pullback",
    keyTechnicalStrengths: [],
    keyTechnicalWeaknesses: [],
    smcInsight: indicators.smc?.smcSummary || "SMC data unavailable",
    analystNotes: "LLM analysis unavailable — fallback scoring applied.",
    simpleExplanation: "Technical analysis is limited — please try again.",
    shortTermOutlook: "neutral",
    mediumTermOutlook: "neutral",
  };
}

// ─────────────────────────────────────────────────────────
// SKIP STATE
// ─────────────────────────────────────────────────────────
function buildSkipState(state, reason) {
  return {
    technical: {
      score: null,
      signal: "neutral",
      signalStrength: "weak",
      maSignal: "unknown",
      rsiSignal: "unknown",
      smc: { marketStructure: "unknown", chochDetected: false, liquidityZones: [] },
      missingFields: ["all"],
      dataAsOf: new Date().toISOString(),
      analystNotes: "",
      simpleExplanation: "",
    },
    meta: {
      ...state.meta,
      nodeErrors: [
        ...(state.meta.nodeErrors || []),
        { node: "technicalAnalysis", error: reason },
      ],
    },
  };
}