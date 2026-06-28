// tests/testFull.js
// Full end-to-end pipeline test with personalization
// node tests/testFull.js

process.loadEnvFile(".env.local");
const { buildInvestmentGraph } = await import("../agent/graph.js");

async function testFull() {
  const testCases = [
    {
      label: "Small investor, growth goal",
      company: "Infosys",
      amount: 5000,
      risk: "conservative",
      goal: "growth",
      horizon: "long",
      holdings: [],
      language: "simple",
    },
    {
      label: "Large investor, income goal",
      company: "NTPC",
      amount: 500000,
      risk: "moderate",
      goal: "income",
      horizon: "long",
      holdings: ["Reliance Industries", "TCS"],
      language: "analyst",
    },
  ];

  const graph = await buildInvestmentGraph();

  for (const tc of testCases) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`TEST: ${tc.label}`);
    console.log(`INPUT: "${tc.company}" | ₹${tc.amount?.toLocaleString("en-IN")} | ${tc.risk} | ${tc.goal}`);

    const result = await graph.invoke({
      userInput: {
        companyName: tc.company,
        investmentAmount: tc.amount,
        riskAppetite: tc.risk,
        investmentGoal: tc.goal,
        existingHoldings: tc.holdings,
        timeHorizon: tc.horizon,
        languageMode: tc.language,
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

    const co = result.company;
    const s  = result.synthesis;
    const p  = result.personalization;

    console.log(`\nCOMPANY : ${co.resolvedName} (${co.ticker}) | ₹${co.currentPrice}`);

    console.log(`\n${"═".repeat(60)}`);
    console.log(`VERDICT : ${s.verdict?.toUpperCase()} (${s.confidenceScore}/100 — ${s.confidenceLabel})`);
    console.log(`${"═".repeat(60)}`);
    console.log(`Short-term : ${s.verdictShortTerm} | Long-term : ${s.verdictLongTerm}`);

    console.log(`\n── PERSONALIZATION ──`);
    console.log(`Capital Flags:`);
    p.capitalFlags?.forEach((f) => console.log(`  💰 ${f}`));
    console.log(`Goal Alignment   : ${p.goalAlignmentNote}`);
    console.log(`Risk Alignment   : ${p.riskAlignmentNote}`);
    console.log(`Time Horizon     : ${p.timeHorizonNote}`);
    if (p.concentrationWarning) console.log(`⚠ Concentration  : ${p.concentrationWarning}`);
    if (p.liquidityWarning)     console.log(`⚠ Liquidity      : ${p.liquidityWarning}`);
    console.log(`Position Sizing  : ${p.suggestedPositionSizing}`);

    console.log(`\n── FINAL FRAMED VERDICT ──`);
    console.log(p.finalFramedVerdict);

    console.log(`\n── SIMPLE LANGUAGE ──`);
    console.log(p.simpleLanguageVerdict);

    console.log(`\n── KEY ACTION ITEMS ──`);
    p.keyActionItems?.forEach((a) => console.log(`  ✅ ${a}`));

    console.log(`\n── WHAT WE DID NOT FACTOR IN ──`);
    s.whatWeDidNotFactorIn?.forEach((w) => console.log(`  ○ ${w}`));

    console.log(`\nNodes: ${result.meta.nodesCompleted.join(" → ")}`);
    console.log(`Time : ${result.meta.startedAt} → ${result.meta.completedAt}`);

    if (result.meta.nodeErrors.length > 0) {
      console.log(`Errors:`, result.meta.nodeErrors);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log("Full pipeline test complete — all 9 nodes.");
}

testFull().catch(console.error);