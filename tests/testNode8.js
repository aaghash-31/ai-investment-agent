// tests/testNode8.js
// node tests/testNode8.js

process.loadEnvFile(".env.local");
const { buildInvestmentGraph } = await import("../agent/graph.js");

async function testNode8() {
  const testCases = [
    { label: "Strong company — expect buy/cautious_buy",   company: "TCS" },
    { label: "Mixed signals — expect hold/cautious",        company: "HDFC Bank" },
  ];

  const graph = await buildInvestmentGraph();

  for (const tc of testCases) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`TEST: ${tc.label}`);
    console.log(`INPUT: "${tc.company}"`);

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

    const s = result.synthesis;
    const co = result.company;

    console.log(`\nCOMPANY : ${co.resolvedName} (${co.ticker})`);
    console.log(`PRICE   : ₹${co.currentPrice} | SECTOR: ${co.sector}`);

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  VERDICT: ${s.verdict?.toUpperCase()}  (confidence: ${s.confidenceScore}/100 — ${s.confidenceLabel})`);
    console.log(`${"═".repeat(60)}`);
    console.log(`Short-term : ${s.verdictShortTerm}`);
    console.log(`Long-term  : ${s.verdictLongTerm}`);
    console.log(`\nRationale  : ${s.verdictRationale}`);

    console.log(`\n── SCORE BREAKDOWN ──`);
    console.log(`Fundamentals  : ${s.scoreBreakdown?.fundamentals}/10`);
    console.log(`Technical     : ${s.scoreBreakdown?.technical}/10`);
    console.log(`News & Macro  : ${s.scoreBreakdown?.newsAndMacro}/10`);
    console.log(`Governance    : ${s.scoreBreakdown?.governance}/10`);

    console.log(`\n── CONFIDENCE BREAKDOWN ──`);
    console.log(`Bull/Bear Agreement : ${s.confidenceBreakdown?.bullBearAgreement}/30`);
    console.log(`Signal Alignment    : ${s.confidenceBreakdown?.signalAlignment}/30`);
    console.log(`Data Completeness   : ${s.confidenceBreakdown?.dataCompleteness}/25`);
    console.log(`Node Coverage       : ${s.confidenceBreakdown?.nodeCoverage}/15`);
    console.log(`Data Quality        : ${s.overallDataQuality} (${s.dataCompletenessScore}% fields populated)`);

    console.log(`\n── SIGNAL CONFLICTS ──`);
    s.conflictsInSignals?.forEach((c) => console.log(`  ⚡ ${c}`));

    console.log(`\n── WHAT WE DID NOT FACTOR IN ──`);
    s.whatWeDidNotFactorIn?.forEach((w) => console.log(`  ○ ${w}`));

    console.log(`\n── RISKS TO MONITOR ──`);
    s.keyRisksToMonitor?.forEach((r) => console.log(`  ⚠ ${r}`));

    console.log(`\n── WHAT WOULD CHANGE THIS VERDICT ──`);
    s.whatWouldChangeVerdict?.forEach((w) => console.log(`  ✅ ${w}`));

    console.log(`\nSuitability  : ${s.investmentSuitability}`);

    console.log(`\n── ANALYST SUMMARY ──`);
    console.log(s.analystSummary);

    console.log(`\n── SIMPLE EXPLANATION ──`);
    console.log(s.simpleExplanation);

    console.log(`\nNodes completed: ${result.meta.nodesCompleted.join(" → ")}`);

    if (result.meta.nodeErrors.length > 0) {
      console.log(`\nErrors:`, result.meta.nodeErrors);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log("Node 8 synthesis tests complete.");
}

testNode8().catch(console.error);