// agent/prompts/synthesisPrompt.js

export function buildSynthesisPrompt({
  company,
  fundamentals,
  technical,
  newsAndMacro,
  bullCase,
  bearCase,
  preMortem,
  confidenceScore,
  confidenceBreakdown,
  userInput,
}) {
  return `
You are the lead investment analyst delivering the final verdict on this stock.
You have reviewed all analysis layers. Your job is to synthesize everything into one clear, honest, reasoned verdict.

═══════════════════════════════════════════════════
COMPANY OVERVIEW
═══════════════════════════════════════════════════
Company : ${company.resolvedName} (${company.ticker})
Sector  : ${company.sector} | Industry: ${company.industry}
Market Cap : ${company.marketCapFormatted} | Price: ${company.currentPrice}

═══════════════════════════════════════════════════
ANALYSIS SCORES
═══════════════════════════════════════════════════
Fundamental Analysis : ${fundamentals.score}/10 (Gate: ${fundamentals.gateResult})
Technical Analysis   : ${technical.score}/10 (Signal: ${technical.signal})
News & Macro         : ${newsAndMacro.score}/10 (Macro Risk: ${newsAndMacro.macroRiskLevel})
Bull Case Strength   : ${bullCase.strengthScore}/10
Bear Case Strength   : ${bearCase.strengthScore}/10

Confidence Score     : ${confidenceScore}/100 (${confidenceBreakdown.bullBearAgreement} agreement + ${confidenceBreakdown.signalAlignment} alignment + ${confidenceBreakdown.dataCompleteness} data + ${confidenceBreakdown.nodeCoverage} coverage)

═══════════════════════════════════════════════════
KEY FINDINGS PER LAYER
═══════════════════════════════════════════════════
FUNDAMENTALS:
- Strengths: ${fundamentals.keyStrengths?.join(", ") || "N/A"}
- Weaknesses: ${fundamentals.keyWeaknesses?.join(", ") || "N/A"}
- Cash Flow: ${fundamentals.cashFlowQualityFlag}
- Governance: ${fundamentals.governanceFlags?.join(", ") || "Clean"}
- Valuation: ${fundamentals.valuationAssessment}

TECHNICALS:
- Entry Timing: ${technical.entryTiming}
- Short-term: ${technical.shortTermOutlook} | Medium-term: ${technical.mediumTermOutlook}
- SMC: ${technical.smc?.marketStructure} | CHoCH: ${technical.smc?.chochDetected}
- SMC Insight: ${technical.smcInsight}

NEWS & MACRO:
- Sentiment: ${newsAndMacro.sentimentScore} (${newsAndMacro.sentimentTrend})
- Key Flags: ${newsAndMacro.keyNewsFlags?.join(", ") || "None"}
- Macro Events: ${newsAndMacro.activeMacroEvents?.join(", ") || "None"}
- Macro Impact: ${newsAndMacro.macroImpactOnCompany}

BULL CASE: ${bullCase.summary}
BEAR CASE: ${bearCase.summary}
PRE-MORTEM: ${preMortem.mostLikelyFailureMode}

═══════════════════════════════════════════════════
USER CONTEXT
═══════════════════════════════════════════════════
Investment Amount : ₹${userInput.investmentAmount?.toLocaleString("en-IN") || "Not specified"}
Risk Appetite     : ${userInput.riskAppetite}
Investment Goal   : ${userInput.investmentGoal}
Time Horizon      : ${userInput.timeHorizon}

YOUR TASK:
Deliver the final synthesized verdict. Consider all layers. Be honest about conflicts.
The verdict must reflect the balance of evidence — not just the strongest layer.
If bull and bear are equally strong, the verdict should be cautious.
If data is limited, confidence should be lower and verdict more conservative.

Respond ONLY in this exact JSON format, no other text:
{
  "verdict": "<buy|cautious_buy|hold|cautious_pass|pass>",
  "verdictShortTerm": "<buy|cautious_buy|hold|cautious_pass|pass>",
  "verdictLongTerm": "<buy|cautious_buy|hold|cautious_pass|pass>",
  "verdictRationale": "<2-3 sentences explaining the verdict — reference specific scores and data points>",
  "scoreBreakdown": {
    "fundamentals": ${fundamentals.score || 0},
    "technical": ${technical.score || 0},
    "newsAndMacro": ${newsAndMacro.score || 0},
    "governance": <number 0-10 based on promoter holding trend and governance flags>
  },
  "conflictsInSignals": [
    "<specific conflict between layers — e.g. 'Strong fundamentals but bearish technicals'>",
    "<another conflict if present>"
  ],
  "whatWeDidNotFactorIn": [
    "<important factor not covered — be specific>",
    "<another limitation>",
    "<another>"
  ],
  "keyRisksToMonitor": [
    "<specific risk 1 to watch>",
    "<specific risk 2>"
  ],
  "investmentSuitability": "<who is this suitable for — e.g. 'Long-term value investors with moderate risk tolerance'>",
  "analystSummary": "<4-5 sentence final synthesis — balanced, specific, honest — this is the main report paragraph>",
  "simpleExplanation": "<same in plain English for a beginner, 3 sentences>"
}

Verdict guide:
- buy: strong signals across FA + TA + News, bull >> bear
- cautious_buy: mostly positive but with notable risks or mixed signals
- hold: roughly balanced bull/bear, no clear edge either way
- cautious_pass: more concerns than positives, weak fundamentals or technicals
- pass: clear reasons to avoid — failing fundamentals, strong bear case, major red flags
`;
}