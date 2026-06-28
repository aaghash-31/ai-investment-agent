// state/investmentState.js

const investmentStateSchema = {

  // ─────────────────────────────────────────
  // 1. USER INPUT (set once at the start)
  // ─────────────────────────────────────────
  userInput: {
    companyName: "",          // raw input from user ("Tata Motors", "Infosys")
    investmentAmount: null,   // number in INR (e.g. 5000, 100000)
    riskAppetite: "",         // "conservative" | "moderate" | "aggressive"
    investmentGoal: "",       // "growth" | "income"
    existingHoldings: [],     // optional: ["TCS", "HDFC Bank"] for concentration check
    timeHorizon: "",          // "short" | "medium" | "long"
    languageMode: "",         // "analyst" | "simple"
  },

  // ─────────────────────────────────────────
  // 2. COMPANY RESOLUTION (Node 1 output)
  // ─────────────────────────────────────────
  company: {
    resolvedName: "",         // clean/official company name
    ticker: "",               // e.g. "TATAMOTORS.NS"
    exchange: "",             // "NSE" | "BSE"
    sector: "",               // e.g. "Automobile"
    industry: "",             // e.g. "Passenger Vehicles"
    marketCap: null,          // number in crores
    currentPrice: null,       // latest price
    priceAsOf: "",            // timestamp of price fetch
    isResolved: false,        // flag: did resolution succeed?
    resolutionConfidence: "", // "high" | "medium" | "low" (was the name ambiguous?)
    ambiguityNote: "",        // e.g. "Multiple Tata companies found, picked TATAMOTORS"
  },

  // ─────────────────────────────────────────
  // 3. FUNDAMENTAL ANALYSIS (Node 2 output)
  // ─────────────────────────────────────────
  fundamentals: {
    // Raw metrics
    revenueGrowthYoY: null,
    netMargin: null,
    roe: null,                // Return on Equity
    roce: null,               // Return on Capital Employed
    debtToEquity: null,
    interestCoverageRatio: null,
    currentRatio: null,
    peRatio: null,
    pbRatio: null,
    pegRatio: null,
    operatingCashFlow: null,
    reportedNetProfit: null,
    cashFlowQualityFlag: "",  // "healthy" | "mismatch" | "concerning"
    promoterHoldingPct: null,
    promoterHoldingTrend: "", // "increasing" | "stable" | "decreasing"
    pledgedSharesPct: null,
    dividendYield: null,
    dividendConsistency: "",  // "consistent" | "irregular" | "none"

    // Data quality
    dataSource: "",           // e.g. "Yahoo Finance / Financial Modeling Prep"
    dataAsOf: "",             // timestamp
    missingFields: [],        // fields that couldn't be fetched

    // Analysis output
    score: null,              // 0–10, computed
    gateResult: "",           // "pass" | "caution" | "fail"
    gateReason: "",           // human-readable reason for gate result
    keyStrengths: [],         // e.g. ["Low debt", "Strong ROCE"]
    keyWeaknesses: [],        // e.g. ["Declining promoter holding"]
    analystNotes: "",         // LLM-generated summary of FA
  },

  // ─────────────────────────────────────────
  // 4. TECHNICAL ANALYSIS (Node 3 output)
  // ─────────────────────────────────────────
  technical: {
    // Classical indicators
    ma50: null,
    ma200: null,
    ema20: null,
    maSignal: "",             // "golden_cross" | "death_cross" | "neutral"
    rsi: null,
    rsiSignal: "",            // "overbought" | "oversold" | "neutral"
    volumeTrend: "",          // "increasing" | "decreasing" | "neutral"
    supportLevel: null,
    resistanceLevel: null,

    // Smart Money Concepts (Tier 3 — keep fields reserved)
    smc: {
      liquidityZones: [],     // price levels where stop-losses likely cluster
      marketStructure: "",    // "bullish" | "bearish" | "ranging"
      lastBOS: null,          // last Break of Structure price
      chochDetected: false,   // Change of Character flag
      orderBlocks: [],        // zones of likely institutional interest
      fairValueGaps: [],      // price imbalances
      smcSummary: "",         // LLM-generated SMC interpretation
      smcConfidence: "",      // "high" | "medium" | "low"
    },

    // Data quality
    dataAsOf: "",
    missingFields: [],

    // Analysis output
    score: null,              // 0–10
    signal: "",               // "buy" | "sell" | "wait" | "neutral"
    analystNotes: "",         // LLM-generated TA summary
  },

  // ─────────────────────────────────────────
  // 5. NEWS & MACRO/GEOPOLITICAL (Node 4 output)
  // ─────────────────────────────────────────
  newsAndMacro: {
    // Company-level news
    recentHeadlines: [],      // array of { title, source, date, url }
    sentimentTrend: "",       // "improving" | "deteriorating" | "neutral"
    sentimentScore: null,     // -1.0 to +1.0
    keyNewsFlags: [],         // e.g. ["Regulatory probe reported", "New product launch"]

    // Macro/geopolitical
    activeMacroEvents: [],    // e.g. ["Strait of Hormuz tensions", "Fed rate decision"]
    sectorMacroSensitivity: "", // e.g. "High — crude oil price directly affects input costs"
    macroRiskLevel: "",       // "high" | "medium" | "low"
    macroImpactSummary: "",   // LLM-generated: what these events mean for this company

    // Data quality
    dataAsOf: "",
    newsSource: "",
    missingFields: [],

    // Analysis output
    score: null,              // 0–10
    analystNotes: "",
  },

  // ─────────────────────────────────────────
  // 6. PEER COMPARISON (Node 5 output — Tier 2)
  // ─────────────────────────────────────────
  peerComparison: {
    peers: [],                // array of { name, ticker, peRatio, pbRatio, roe, debtToEquity, ... }
    sectorMedians: {},        // { peRatio: X, roe: Y, ... }
    relativeValuation: "",    // "cheap" | "fair" | "expensive" vs peers
    standoutDifferences: [],  // e.g. ["P/E 15% above sector median", "ROE best in peer group"]
    analystNotes: "",
  },

  // ─────────────────────────────────────────
  // 7. NARRATIVE vs NUMBERS (Node 6 output — Tier 3)
  // ─────────────────────────────────────────
  narrativeCheck: {
    managementTone: "",       // "optimistic" | "cautious" | "neutral"
    toneSource: "",           // e.g. "Q3 FY25 earnings call transcript"
    numbersDirection: "",     // "improving" | "deteriorating" | "stable"
    mismatchDetected: false,
    mismatchDescription: "",  // e.g. "Mgmt upbeat on margins, but gross margin down 80bps"
    mismatchSeverity: "",     // "high" | "medium" | "low"
    analystNotes: "",
  },

  // ─────────────────────────────────────────
  // 8. BULL CASE (Node 7 output)
  // ─────────────────────────────────────────
  bullCase: {
    arguments: [],            // array of strings — strongest bull arguments
    strengthScore: null,      // 0–10, how strong is the bull case
    catalysts: [],            // near-term positive catalysts
    summary: "",              // LLM-generated bull case paragraph
  },

  // ─────────────────────────────────────────
  // 9. BEAR CASE (Node 8 output)
  // ─────────────────────────────────────────
  bearCase: {
    arguments: [],            // array of strings
    strengthScore: null,      // 0–10
    riskFactors: [],          // specific downside risks
    summary: "",              // LLM-generated bear case paragraph
  },

  // ─────────────────────────────────────────
  // 10. PRE-MORTEM (Node 9 output)
  // ─────────────────────────────────────────
  preMortem: {
    assumedAction: "buy",     // always assumes investment was made
    mostLikelyFailureMode: "", // e.g. "Oil price shock sustains, margins compress"
    earlyWarningSignals: [],  // what to watch that would confirm the failure is happening
    failureProbability: "",   // "high" | "medium" | "low"
    summary: "",
  },

  // ─────────────────────────────────────────
  // 11. SYNTHESIS & CONFIDENCE (Node 10 output)
  // ─────────────────────────────────────────
  synthesis: {
    // Verdict
    verdict: "",              // "buy" | "cautious_buy" | "hold" | "cautious_pass" | "pass"
    verdictShortTerm: "",     // separate short-term framing if it differs
    verdictLongTerm: "",      // separate long-term framing

    // Confidence — computed, not hardcoded
    confidenceScore: null,    // 0–100
    confidenceBreakdown: {
      bullBearAgreement: null,  // how close were bull/bear scores (closer = lower confidence)
      dataFreshness: null,      // how fresh was the data overall
      dataCompleteness: null,   // how many fields were missing
      signalAlignment: null,    // do FA/TA/News all point same direction?
    },

    // Score breakdown
    scoreBreakdown: {
      fundamentals: null,       // 0–10
      technical: null,          // 0–10
      newsAndMacro: null,       // 0–10
      governance: null,         // 0–10 (derived from promoter/pledging data)
    },

    // Honest limitations
    whatWeDidNotFactorIn: [],   // e.g. ["Derivatives positioning", "Unlisted subsidiaries"]
    whatWouldChangeThisVerdict: [], // e.g. ["D/E drops below 0.5", "RSI cools to below 50"]
    conflictsInSignals: [],     // explicit disagreements surfaced, not hidden

    analystSummary: "",         // full LLM-generated synthesis paragraph
  },

  // ─────────────────────────────────────────
  // 12. PERSONALIZATION (Node 11 output)
  // ─────────────────────────────────────────
  personalization: {
    capitalFlags: [],           // e.g. ["Share price affordable at ₹340 for your budget"]
    concentrationWarning: "",   // if existing holdings overlap with sector
    liquidityWarning: "",       // for large capital — volume vs position size
    goalAlignmentNote: "",      // e.g. "Dividend yield low — may not suit income goal"
    riskAlignmentNote: "",      // e.g. "High volatility — may not suit conservative profile"
    finalFramedVerdict: "",     // full verdict reframed for this user's specific context
    simpleLanguageVerdict: "",  // plain-language version (if languageMode is "simple")
  },

  // ─────────────────────────────────────────
  // 13. PIPELINE METADATA (internal, always updated)
  // ─────────────────────────────────────────
  meta: {
    sessionId: "",              // unique ID for this research run (used for logging)
    startedAt: "",              // timestamp
    completedAt: "",            // timestamp
    nodesCompleted: [],         // tracks which nodes ran successfully
    nodeErrors: [],             // { node, error } for any node that failed
    overallDataQuality: "",     // "high" | "medium" | "low" — rolled up across all nodes
    cachedResult: false,        // was this served from cache?
    cachedAt: "",               // if cached, when was it originally generated?
  },

}

import { Annotation } from "@langchain/langgraph";

// This is what LangGraph actually uses to track state
export const InvestmentStateAnnotation = Annotation.Root({
  userInput: Annotation,
  company: Annotation,
  fundamentals: Annotation,
  technical: Annotation,
  newsAndMacro: Annotation,
  peerComparison: Annotation,
  narrativeCheck: Annotation,
  bullCase: Annotation,
  bearCase: Annotation,
  preMortem: Annotation,
  synthesis: Annotation,
  personalization: Annotation,
  meta: Annotation,
});

export default investmentStateSchema;