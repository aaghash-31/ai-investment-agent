// tests/testNode5.js
// node tests/testNode5.js

process.loadEnvFile(".env.local");
const { buildInvestmentGraph } = await import("../agent/graph.js");

async function testNode5() {
  const graph = await buildInvestmentGraph();

  console.log(`\n${"─".repeat(55)}`);
  console.log(`TEST: Bull / Bear / Pre-Mortem | INPUT: "HDFC Bank"`);

  const result = await graph.invoke({
    userInput: {
      companyName: "HDFC Bank",
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

  const bull = result.bullCase;
  const bear = result.bearCase;
  const pm   = result.preMortem;

  console.log(`\nCOMPANY: ${result.company.resolvedName} (${result.company.ticker})`);

  console.log(`\n${"═".repeat(55)}`);
  console.log(`BULL CASE (strength: ${bull.strengthScore}/10)`);
  console.log(`${"═".repeat(55)}`);
  bull.arguments?.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
  console.log(`\nCatalysts:`);
  bull.catalysts?.forEach((c) => console.log(`  → ${c}`));
  console.log(`\nMoat: ${bull.moatAssessment}`);
  console.log(`\nSummary: ${bull.summary}`);
  console.log(`Simple: ${bull.simpleExplanation}`);

  console.log(`\n${"═".repeat(55)}`);
  console.log(`BEAR CASE (strength: ${bear.strengthScore}/10)`);
  console.log(`${"═".repeat(55)}`);
  bear.arguments?.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
  console.log(`\nRisk Factors:`);
  bear.riskFactors?.forEach((r) => console.log(`  ⚠ ${r}`));
  console.log(`\nRed Flags:`);
  bear.redFlags?.forEach((f) => console.log(`  🚩 ${f}`));
  console.log(`\nSummary: ${bear.summary}`);
  console.log(`Simple: ${bear.simpleExplanation}`);

  console.log(`\n${"═".repeat(55)}`);
  console.log(`PRE-MORTEM (failure probability: ${pm.failureProbability})`);
  console.log(`${"═".repeat(55)}`);
  console.log(`Most Likely Failure : ${pm.mostLikelyFailureMode}`);
  console.log(`Secondary Failure   : ${pm.secondaryFailureMode}`);
  console.log(`\nEarly Warning Signals:`);
  pm.earlyWarningSignals?.forEach((s) => console.log(`  📉 ${s}`));
  console.log(`\nWhat Would Change This Verdict:`);
  pm.whatWouldChangeVerdict?.forEach((w) => console.log(`  ✅ ${w}`));
  console.log(`\nSummary: ${pm.summary}`);
  console.log(`Simple: ${pm.simpleExplanation}`);

  console.log(`\nNodes completed: ${result.meta.nodesCompleted.join(" → ")}`);
  if (result.meta.nodeErrors.length > 0) {
    console.log(`Errors:`, result.meta.nodeErrors);
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log("Nodes 5-7 tests complete.");
}

testNode5().catch(console.error);