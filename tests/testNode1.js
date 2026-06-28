// tests/testNode1.js
// Run with: node tests/testNode1.js
// Tests Node 1 in isolation before wiring into full graph

process.loadEnvFile(".env.local");
const { buildInvestmentGraph } = await import("../agent/graph.js");

async function testNode1() {
  const testCases = [
    {
      label: "Clear Indian company name",
      input: "Reliance Industries",
    },
    {
      label: "Partial/short name",
      input: "Infosys",
    },
    {
      label: "Ambiguous name",
      input: "Tata",
    },
    {
      label: "Global company",
      input: "Apple",
    },
    {
      label: "Typo / bad input",
      input: "Relianse Industreis",
    },
  ];

  const graph = await buildInvestmentGraph();

  for (const testCase of testCases) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`TEST: ${testCase.label}`);
    console.log(`INPUT: "${testCase.input}"`);

    const result = await graph.invoke({
      userInput: {
        companyName: testCase.input,
        investmentAmount: 10000,
        riskAppetite: "moderate",
        investmentGoal: "growth",
        existingHoldings: [],
        timeHorizon: "medium",
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

    console.log(`RESOLVED: ${result.company.isResolved}`);
    console.log(`NAME: ${result.company.resolvedName}`);
    console.log(`TICKER: ${result.company.ticker}`);
    console.log(`EXCHANGE: ${result.company.exchange}`);
    console.log(`SECTOR: ${result.company.sector}`);
    console.log(`PRICE: ${result.company.currentPrice}`);
    console.log(`MARKET CAP: ${result.company.marketCapFormatted}`);
    console.log(`CONFIDENCE: ${result.company.resolutionConfidence}`);
    if (result.company.ambiguityNote) {
      console.log(`NOTE: ${result.company.ambiguityNote}`);
    }
    if (result.meta.nodeErrors.length > 0) {
      console.log(`ERRORS:`, result.meta.nodeErrors);
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log("All tests complete.");
}

testNode1().catch(console.error);