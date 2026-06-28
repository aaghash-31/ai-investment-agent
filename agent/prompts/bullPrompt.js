// agent/prompts/bullPrompt.js

export function buildBullPrompt(company, fundamentals, technical, newsAndMacro) {
  return `
You are a bullish equity analyst building the strongest possible investment case for this stock.
Your job is NOT to be balanced — it is to find and articulate every credible reason to BUY.
Be specific, use the actual numbers provided, and avoid generic statements.

COMPANY: ${company.resolvedName} (${company.ticker})
SECTOR: ${company.sector} | MARKET CAP: ${company.marketCapFormatted}
CURRENT PRICE: ${company.currentPrice}

FUNDAMENTAL SNAPSHOT:
- FA Score: ${fundamentals.score}/10 (${fundamentals.gateResult})
- Revenue Growth YoY: ${fundamentals.revenueGrowthYoY ?? "N/A"}%
- Net Margin: ${fundamentals.netMargin ?? "N/A"}%
- ROE: ${fundamentals.roe ?? "N/A"}% | ROCE: ${fundamentals.roce ?? "N/A"}%
- Debt/Equity: ${fundamentals.debtToEquity ?? "N/A"}
- Cash Flow Quality: ${fundamentals.cashFlowQualityFlag}
- Trailing P/E: ${fundamentals.trailingPE ?? "N/A"} | P/B: ${fundamentals.pbRatio ?? "N/A"}
- Promoter Holding: ${fundamentals.promoterHoldingPct ?? "N/A"}% (${fundamentals.promoterHoldingTrend})
- Key Strengths: ${fundamentals.keyStrengths?.join(", ") || "N/A"}
- Valuation: ${fundamentals.valuationAssessment}

TECHNICAL SNAPSHOT:
- TA Score: ${technical.score}/10 | Signal: ${technical.signal}
- RSI: ${technical.rsi14} (${technical.rsiSignal})
- MA Signal: ${technical.maSignal}
- Entry Timing: ${technical.entryTiming}
- SMC Market Structure: ${technical.smc?.marketStructure}
- Short-term Outlook: ${technical.shortTermOutlook}
- Medium-term Outlook: ${technical.mediumTermOutlook}

NEWS & SENTIMENT SNAPSHOT:
- News Score: ${newsAndMacro.score}/10
- Sentiment: ${newsAndMacro.sentimentScore} (${newsAndMacro.sentimentTrend})
- Key Positive Flags: ${newsAndMacro.keyNewsFlags?.join(", ") || "None"}
- Macro Risk Level: ${newsAndMacro.macroRiskLevel}

YOUR TASK:
Build the strongest honest bull case. Use specific numbers. Identify near-term catalysts.
Do not fabricate — only use what the data supports.

Respond ONLY in this exact JSON format, no other text:
{
  "arguments": [
    "<specific bull argument 1 with numbers>",
    "<specific bull argument 2 with numbers>",
    "<specific bull argument 3>",
    "<specific bull argument 4>",
    "<specific bull argument 5>"
  ],
  "catalysts": [
    "<near-term catalyst 1 — specific event or trigger>",
    "<near-term catalyst 2>",
    "<near-term catalyst 3>"
  ],
  "moatAssessment": "<1-2 sentences: does this company have a durable competitive advantage? What kind?>",
  "strengthScore": <number 0-10: how strong is the bull case based on available evidence>,
  "summary": "<3-4 sentence bull case paragraph — specific, data-backed, compelling>",
  "simpleExplanation": "<same in plain English for a beginner, 2 sentences>"
}
`;
}