// tests/testFinal.js
// node tests/testFinal.js

process.loadEnvFile(".env.local");
const { buildInvestmentGraph } = await import("../agent/graph.js");

async function testFinal() {
  const testCases = [
    {
      label: "Mid investor, aggressive, short horizon",
      company: "Zomato",
      amount: 25000,
      risk: "aggressive",
      goal: "growth",
      horizon: "short",
      holdings: ["HDFC Bank"],
      language: "analyst",
    },
    {
      label: "Large investor, conservative, income, with holdings",
      company: "ITC",
      amount: 200000,
      risk: "conservative",
      goal: "income",
      horizon: "long",
      holdings: ["TCS", "Infosys", "Wipro"],
      language: "simple",
    },
  ];

  const graph = await buildInvestmentGraph();

  for (const tc of testCases) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`TEST: ${tc.label}`);
    console.log(`INPUT: "${tc.company}" | ₹${tc.amount?.toLocaleString("en-IN")} | ${tc.risk} | ${tc.goal} | ${tc.horizon}-term`);

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
    const fa = result.fundamentals;
    const ta = result.technical;
    const s  = result.synthesis;
    const p  = result.personalization;

    console.log(`\nCOMPANY : ${co.resolvedName} (${co.ticker}) | ₹${co.currentPrice} | ${co.sector}`);
    console.log(`\n${"═".repeat(60)}`);
    console.log(`VERDICT : ${s.verdict?.toUpperCase()} (${s.confidenceScore}/100 — ${s.confidenceLabel})`);
    console.log(`${"═".repeat(60)}`);
    console.log(`Short-term : ${s.verdictShortTerm} | Long-term : ${s.verdictLongTerm}`);
    console.log(`Rationale  : ${s.verdictRationale}`);

    console.log(`\n── SCORES ──`);
    console.log(`FA: ${fa.score}/10 (${fa.gateResult}) | TA: ${ta.score}/10 (${ta.signal}) | News: ${result.newsAndMacro.score}/10`);
    console.log(`Bull: ${result.bullCase.strengthScore}/10 | Bear: ${result.bearCase.strengthScore}/10`);

    console.log(`\n── SIGNAL CONFLICTS ──`);
    s.conflictsInSignals?.forEach((c) => console.log(`  ⚡ ${c}`));

    console.log(`\n── PERSONALIZATION ──`);
    p.capitalFlags?.forEach((f) => console.log(`  💰 ${f}`));
    console.log(`Goal      : ${p.goalAlignmentNote}`);
    console.log(`Risk      : ${p.riskAlignmentNote}`);
    console.log(`Horizon   : ${p.timeHorizonNote}`);
    if (p.concentrationWarning) console.log(`⚠ Concentration : ${p.concentrationWarning}`);
    console.log(`Sizing    : ${p.suggestedPositionSizing}`);

    console.log(`\n── FINAL VERDICT (personalized) ──`);
    console.log(p.finalFramedVerdict);

    console.log(`\n── SIMPLE LANGUAGE ──`);
    console.log(p.simpleLanguageVerdict);

    console.log(`\n── PRE-MORTEM ──`);
    console.log(`Failure mode : ${result.preMortem.mostLikelyFailureMode}`);
    console.log(`Probability  : ${result.preMortem.failureProbability}`);
    console.log(`Watch for    :`);
    result.preMortem.earlyWarningSignals?.forEach((s) => console.log(`  📉 ${s}`));

    console.log(`\n── WHAT WE DID NOT FACTOR IN ──`);
    s.whatWeDidNotFactorIn?.forEach((w) => console.log(`  ○ ${w}`));

    console.log(`\nNodes: ${result.meta.nodesCompleted.join(" → ")}`);

    if (result.meta.nodeErrors.length > 0) {
      console.log(`\nErrors:`, result.meta.nodeErrors);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log("Final validation test complete.");
}

testFinal().catch(console.error);