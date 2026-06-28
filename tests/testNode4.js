// tests/testNode4.js
// node tests/testNode4.js

process.loadEnvFile(".env.local");
const { buildInvestmentGraph } = await import("../agent/graph.js");

async function testNode4() {
  const testCases = [
    { label: "Energy sector — macro sensitive", company: "Reliance Industries" },
    { label: "IT sector — USD/visa sensitive", company: "Infosys" },
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

    const news = result.newsAndMacro;
    const co = result.company;

    console.log(`\nCOMPANY : ${co.resolvedName} | SECTOR : ${co.sector}`);
    console.log(`\n── COMPANY NEWS ──`);
    console.log(`Articles found  : ${news.recentHeadlines?.length}`);
    console.log(`Sentiment Score : ${news.sentimentScore} (${news.sentimentTrend})`);
    console.log(`Sentiment Summary : ${news.companySentimentSummary}`);
    console.log(`\nKey News Flags:`);
    news.keyNewsFlags?.forEach((f) => console.log(`  • ${f}`));
    console.log(`\nTop Headlines:`);
    news.recentHeadlines?.slice(0, 4).forEach((h) =>
      console.log(`  [${new Date(h.date).toLocaleDateString()}] ${h.title}`)
    );
    console.log(`\n── MACRO / GEOPOLITICAL ──`);
    console.log(`Macro Articles  : ${news.macroHeadlines?.length}`);
    console.log(`Macro Risk Level: ${news.macroRiskLevel}`);
    console.log(`\nActive Macro Events:`);
    news.activeMacroEvents?.forEach((e) => console.log(`  • ${e}`));
    console.log(`\nSector Macro Sensitivities:`);
    news.sectorMacroSensitivities?.forEach((s) => console.log(`  → ${s}`));
    console.log(`\nMacro Impact on Company:`);
    console.log(`  ${news.macroImpactOnCompany}`);
    console.log(`\n── LLM ANALYSIS ──`);
    console.log(`News Score    : ${news.score}/10`);
    console.log(`\nAnalyst Notes:`);
    console.log(news.analystNotes);
    console.log(`\nSimple Explanation:`);
    console.log(news.simpleExplanation);

    if (result.meta.nodeErrors.length > 0) {
      console.log(`\nERRORS:`, result.meta.nodeErrors);
    }
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log("Node 4 tests complete.");
}

testNode4().catch(console.error);