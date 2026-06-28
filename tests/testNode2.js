// tests/testNode2.js
// node tests/testNode2.js

process.loadEnvFile(".env.local");
const { buildInvestmentGraph } = await import("../agent/graph.js");

async function testNode2() {
  const testCases = [
    { label: "Strong fundamentals", company: "Infosys" },
    { label: "Capital intensive / high debt sector", company: "NTPC" },
    { label: "Global stock", company: "Apple" },
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

    const fa = result.fundamentals;
    const co = result.company;

    console.log(`\nCOMPANY: ${co.resolvedName} (${co.ticker})`);
    console.log(`\n── RATIOS ──`);
    console.log(`Revenue Growth YoY : ${fa.revenueGrowthYoY ?? "N/A"}%`);
    console.log(`Net Margin         : ${fa.netMargin ?? "N/A"}%`);
    console.log(`ROE                : ${fa.roe ?? "N/A"}%`);
    console.log(`ROCE               : ${fa.roce ?? "N/A"}%`);
    console.log(`Debt/Equity        : ${fa.debtToEquity ?? "N/A"}`);
    console.log(`Interest Coverage  : ${fa.interestCoverageRatio ?? "N/A"}x`);
    console.log(`Current Ratio      : ${fa.currentRatio ?? "N/A"}`);
    console.log(`Cash Flow Quality  : ${fa.cashFlowQualityFlag}`);
    console.log(`Trailing P/E       : ${fa.trailingPE ?? "N/A"}`);
    console.log(`Dividend Yield     : ${fa.dividendYield ?? "N/A"}%`);
    console.log(`Promoter Holding   : ${fa.promoterHoldingPct ?? "N/A"}%`);
    console.log(`Pledged Shares     : ${fa.pledgedSharesPct ?? "N/A"}%`);
    console.log(`\n── LLM ANALYSIS ──`);
    console.log(`FA Score           : ${fa.score}/10`);
    console.log(`Gate Result        : ${fa.gateResult.toUpperCase()}`);
    console.log(`Gate Reason        : ${fa.gateReason}`);
    console.log(`Strengths          : ${fa.keyStrengths?.join(", ")}`);
    console.log(`Weaknesses         : ${fa.keyWeaknesses?.join(", ")}`);
    console.log(`Valuation          : ${fa.valuationAssessment}`);
    console.log(`\nAnalyst Notes:`);
    console.log(fa.analystNotes);
    console.log(`\nSimple Explanation:`);
    console.log(fa.simpleExplanation);

    if (result.meta.nodeErrors.length > 0) {
      console.log(`\nERRORS:`, result.meta.nodeErrors);
    }
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log("Node 2 tests complete.");
}

testNode2().catch(console.error);