// tests/testNode3.js
// node tests/testNode3.js

process.loadEnvFile(".env.local");
const { buildInvestmentGraph } = await import("../agent/graph.js");


async function testNode3() {
  const testCases = [
    { label: "Strong Indian stock", company: "Reliance Industries" },
    { label: "IT sector", company: "TCS" },
  ];

  const graph = await buildInvestmentGraph();

  for (const tc of testCases) {
    console.log(`\n${"─".repeat(55)}`);
    console.log(`TEST: ${tc.label} | INPUT: "${tc.company}"`);

    const result = await graph.invoke({
      userInput: {
        companyName: tc.company,
        investmentAmount: 50000,
        riskAppetite: "moderate",
        investmentGoal: "growth",
        existingHoldings: [],
        timeHorizon: "long",
        languageMode: "analyst",
      },
      meta: {
        sessionId: `test-${Date.now()}`,
        startedAt: new Date().toISOString(),
        completedAt: "",
        nodesCompleted: [],
        nodeErrors: [],
        overallDataQuality: "",
        cachedResult: false,
        cachedAt: "",
      },
    });

    const ta = result.technical;
    const smc = ta.smc;

    console.log(`\nCOMPANY : ${result.company.resolvedName} (${result.company.ticker})`);
    console.log(`\n── MOVING AVERAGES ──`);
    console.log(`Current Price : ₹${ta.currentPrice}`);
    console.log(`MA20 / MA50 / MA200 : ${ta.ma20} / ${ta.ma50} / ${ta.ma200}`);
    console.log(`EMA20 / EMA50 : ${ta.ema20} / ${ta.ema50}`);
    console.log(`MA Signal : ${ta.maSignal} — ${ta.maSignalDetail}`);
    console.log(`Price vs 50-DMA : ${ta.priceVsMA50}%`);
    console.log(`Price vs 200-DMA : ${ta.priceVsMA200}%`);
    console.log(`\n── MOMENTUM ──`);
    console.log(`RSI (14) : ${ta.rsi14} → ${ta.rsiSignal}`);
    console.log(`MACD Line : ${ta.macdLine}`);
    console.log(`\n── VOLUME ──`);
    console.log(`Volume Trend : ${ta.volumeTrend}`);
    console.log(`Price-Volume Confirmation : ${ta.volumePriceConfirmation}`);
    console.log(`\n── PRICE LEVELS ──`);
    console.log(`52W High : ${ta.high52w} (${ta.pctFromHigh}% from current)`);
    console.log(`52W Low : ${ta.low52w} (+${ta.pctFromLow}% from current)`);
    console.log(`Support : ${ta.support} | Resistance : ${ta.resistance}`);
    console.log(`\n── TREND ──`);
    console.log(`Short-term (20d) : ${ta.shortTermTrend}`);
    console.log(`Medium-term (60d) : ${ta.mediumTermTrend}`);
    console.log(`\n── SMART MONEY CONCEPTS ──`);
    console.log(`Market Structure : ${smc?.marketStructure}`);
    console.log(`Last BOS : ${smc?.lastBOS ? JSON.stringify(smc.lastBOS) : "None"}`);
    console.log(`CHoCH Detected : ${smc?.chochDetected}`);
    console.log(`Liquidity Zones : ${smc?.liquidityZones?.length} zones`);
    console.log(`SMC Summary : ${smc?.smcSummary}`);
    console.log(`\n── LLM ANALYSIS ──`);
    console.log(`TA Score : ${ta.score}/10`);
    console.log(`Signal : ${ta.signal} (${ta.signalStrength})`);
    console.log(`Entry Timing : ${ta.entryTiming}`);
    console.log(`Short-term Outlook : ${ta.shortTermOutlook}`);
    console.log(`Medium-term Outlook : ${ta.mediumTermOutlook}`);
    console.log(`Strengths : ${ta.keyTechnicalStrengths?.join(", ")}`);
    console.log(`Weaknesses : ${ta.keyTechnicalWeaknesses?.join(", ")}`);
    console.log(`SMC Insight : ${ta.smcInsight}`);
    console.log(`\nAnalyst Notes:`);
    console.log(ta.analystNotes);
    console.log(`\nSimple Explanation:`);
    console.log(ta.simpleExplanation);

    if (result.meta.nodeErrors.length > 0) {
      console.log(`\nERRORS:`, result.meta.nodeErrors);
    }
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log("Node 3 tests complete.");
}

testNode3().catch(console.error);