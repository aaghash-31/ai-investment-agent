// agent/prompts/technicalPrompt.js

export function buildTechnicalPrompt(company, indicators, faGateResult) {
  const smc = indicators.smc;

  return `
You are a senior technical analyst evaluating a stock for investment timing.

COMPANY: ${company.resolvedName} (${company.ticker})
SECTOR: ${company.sector}
FUNDAMENTAL GATE RESULT: ${faGateResult} (context only — focus on technicals here)

CURRENT PRICE: ${indicators.currentPrice}

MOVING AVERAGES:
- MA20: ${indicators.ma20 ?? "N/A"} | MA50: ${indicators.ma50 ?? "N/A"} | MA200: ${indicators.ma200 ?? "N/A"}
- EMA20: ${indicators.ema20 ?? "N/A"} | EMA50: ${indicators.ema50 ?? "N/A"}
- Signal: ${indicators.maSignal} — ${indicators.maSignalDetail}
- Price vs 50-DMA: ${indicators.priceVsMA50 ?? "N/A"}% | Price vs 200-DMA: ${indicators.priceVsMA200 ?? "N/A"}%

MOMENTUM:
- RSI (14): ${indicators.rsi14 ?? "N/A"} → ${indicators.rsiSignal}
- MACD Line: ${indicators.macdLine ?? "N/A"}

VOLUME:
- Trend: ${indicators.volumeTrend}
- Price-Volume Confirmation: ${indicators.volumePriceConfirmation}
- Avg Volume (recent 10d): ${indicators.avgRecentVolume?.toLocaleString() ?? "N/A"}
- Avg Volume (prior 20d): ${indicators.avgOlderVolume?.toLocaleString() ?? "N/A"}

PRICE LEVELS:
- 52-Week High: ${indicators.high52w} (${indicators.pctFromHigh}% from current)
- 52-Week Low: ${indicators.low52w} (+${indicators.pctFromLow}% from current)
- Support: ${indicators.support ?? "N/A"} | Resistance: ${indicators.resistance ?? "N/A"}

TREND:
- Short-term (20d): ${indicators.shortTermTrend}
- Medium-term (60d): ${indicators.mediumTermTrend}

SMART MONEY CONCEPTS (supplementary timing lens):
- Market Structure: ${smc.marketStructure}
- Last Break of Structure: ${smc.lastBOS ? `${smc.lastBOS.type} BOS at ${smc.lastBOS.level}` : "None detected"}
- Change of Character: ${smc.chochDetected ? "YES — " + smc.chochNote : "Not detected"}
- Liquidity Zones: ${smc.liquidityZones.length} zones identified
- SMC Summary: ${smc.smcSummary}

NOTE ON SMC: Treat Smart Money Concepts as a supplementary timing signal, not a standalone decision factor.
They are pattern-based and more relevant for short-to-medium term entry timing than long-term valuation.

YOUR TASK:
Evaluate this stock's technical picture and provide a timing recommendation.
Consider: is now a good entry point? Is the stock overbought/oversold? Is trend momentum supportive?

Respond ONLY in this exact JSON format, no other text:
{
  "score": <number 0-10, one decimal place>,
  "signal": "<buy|wait|sell|neutral>",
  "signalStrength": "<strong|moderate|weak>",
  "entryTiming": "<good_entry|wait_for_pullback|avoid_chasing|oversold_opportunity>",
  "keyTechnicalStrengths": ["<strength 1>", "<strength 2>"],
  "keyTechnicalWeaknesses": ["<weakness 1>", "<weakness 2>"],
  "smcInsight": "<one sentence on what the SMC analysis adds to the picture, or 'SMC signals are neutral'>",
  "analystNotes": "<3-4 sentence technical analysis summary — include trend, momentum, volume, key levels>",
  "simpleExplanation": "<same analysis in plain English for a beginner, 2 sentences>",
  "shortTermOutlook": "<bullish|neutral|bearish>",
  "mediumTermOutlook": "<bullish|neutral|bearish>"
}

Scoring guide:
- 8-10: Strong technical setup, good entry signal
- 6-7.9: Reasonable setup, some caution advised
- 4-5.9: Mixed signals, timing is uncertain
- 2-3.9: Weak setup, better entry points likely ahead
- 0-1.9: Strong technical warning — avoid entry now
`;
}