// agent/prompts/fundamentalPrompt.js

export function buildFundamentalPrompt(company, ratios, screenerData) {
  const promoterSection = screenerData?.success
    ? `
PROMOTER & GOVERNANCE (India-specific):
- Promoter Holding: ${screenerData.promoterHoldingPct ?? "N/A"}%
- Promoter Holding Trend: ${screenerData.promoterHoldingTrend}
- Pledged Shares: ${screenerData.pledgedSharesPct ?? "N/A"}%
`
    : `Promoter/governance data not available for this stock.`;

  return `
You are a senior equity research analyst evaluating a company for investment.

COMPANY: ${company.resolvedName} (${company.ticker})
SECTOR: ${company.sector} | INDUSTRY: ${company.industry}
MARKET CAP: ${company.marketCapFormatted}

FINANCIAL METRICS:
Growth:
- Revenue Growth YoY: ${ratios.revenueGrowthYoY ?? "N/A"}%
- Revenue CAGR (3Y): ${ratios.revenueCAGR3Y ?? "N/A"}%

Profitability:
- Gross Margin: ${ratios.grossMargin ?? "N/A"}%
- Operating Margin: ${ratios.operatingMargin ?? "N/A"}%
- Net Margin: ${ratios.netMargin ?? "N/A"}%
- ROE: ${ratios.roe ?? "N/A"}%
- ROA: ${ratios.roa ?? "N/A"}%
- ROCE: ${ratios.roce ?? "N/A"}%

Financial Health:
- Debt to Equity: ${ratios.debtToEquity ?? "N/A"}
- Interest Coverage Ratio: ${ratios.interestCoverageRatio ?? "N/A"}x
- Current Ratio: ${ratios.currentRatio ?? "N/A"}
- Net Debt: ${ratios.netDebt != null ? formatNumber(ratios.netDebt) : "N/A"}

Cash Flow:
- Operating Cash Flow: ${ratios.operatingCashFlow != null ? formatNumber(ratios.operatingCashFlow) : "N/A"}
- Free Cash Flow: ${ratios.freeCashFlow != null ? formatNumber(ratios.freeCashFlow) : "N/A"}
- Cash Flow Quality: ${ratios.cashFlowQualityFlag}

Valuation:
- Trailing P/E: ${ratios.trailingPE ?? "N/A"}
- Forward P/E: ${ratios.forwardPE ?? "N/A"}
- P/B Ratio: ${ratios.pbRatio ?? "N/A"}
- PEG Ratio: ${ratios.pegRatio ?? "N/A"}
- EV/EBITDA: ${ratios.evToEbitda ?? "N/A"}

Dividend:
- Dividend Yield: ${ratios.dividendYield ?? "N/A"}%
- Payout Ratio: ${ratios.payoutRatio ?? "N/A"}%

${promoterSection}

MISSING DATA FIELDS: ${ratios.missingFields.length > 0 ? ratios.missingFields.join(", ") : "None"}

YOUR TASK:
Evaluate this company's fundamentals. Consider sector context — a D/E of 2.0 may be normal for infrastructure but alarming for IT. Do not use hardcoded universal thresholds.

Respond ONLY in this exact JSON format, no other text:
{
  "score": <number 0-10, one decimal place>,
  "gateResult": "<pass|caution|fail>",
  "gateReason": "<one sentence explaining the gate decision>",
  "keyStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "keyWeaknesses": ["<weakness 1>", "<weakness 2>"],
  "cashFlowAssessment": "<one sentence on cash flow quality>",
  "governanceFlags": ["<flag if any, else empty array>"],
  "valuationAssessment": "<one sentence on whether valuation looks stretched, fair, or cheap>",
  "analystNotes": "<3-4 sentence paragraph summarising the overall fundamental picture, sector context considered>",
  "simpleExplanation": "<same analysis in plain English for a beginner investor, 2-3 sentences>"
}

Scoring guide (sector-adjusted):
- 8-10: Excellent fundamentals, pass with confidence
- 6-7.9: Solid fundamentals, pass with minor notes  
- 4-5.9: Mixed signals, caution — proceed but flag concerns
- 2-3.9: Weak fundamentals, fail — strong reasons to avoid
- 0-1.9: Very poor or deeply concerning, fail

gateResult rules:
- score >= 6: "pass"
- score 4-5.9: "caution"
- score < 4: "fail"
`;
}

function formatNumber(num) {
  if (!num) return "N/A";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}₹${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  return `${sign}${abs.toLocaleString()}`;
}