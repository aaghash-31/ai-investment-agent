// agent/graph.js
import { StateGraph } from "@langchain/langgraph";
import { InvestmentStateAnnotation } from "./state/investmentState.js";
import { companyResolutionNode }   from "./nodes/companyResolution.js";
import { fundamentalAnalysisNode } from "./nodes/fundamentalAnalysis.js";
import { technicalAnalysisNode }   from "./nodes/technicalAnalysis.js";
import { newsAndMacroNode }        from "./nodes/newsAndMacro.js";
import { bullCaseNode }            from "./nodes/bullCase.js";
import { bearCaseNode }            from "./nodes/bearCase.js";
import { preMortemNode }           from "./nodes/preMortem.js";
import { synthesisNode }           from "./nodes/synthesis.js";
import { personalizationNode }     from "./nodes/personalization.js";

export async function buildInvestmentGraph() {
  const graph = new StateGraph(InvestmentStateAnnotation);

  // ── Nodes ──────────────────────────────────────────────
  graph.addNode("companyResolutionNode",   companyResolutionNode);
  graph.addNode("fundamentalAnalysisNode", fundamentalAnalysisNode);
  graph.addNode("technicalAnalysisNode",   technicalAnalysisNode);
  graph.addNode("newsAndMacroNode",        newsAndMacroNode);
  graph.addNode("bullCaseNode",            bullCaseNode);
  graph.addNode("bearCaseNode",            bearCaseNode);
  graph.addNode("preMortemNode",           preMortemNode);
  graph.addNode("synthesisNode",           synthesisNode);
  graph.addNode("personalizationNode",     personalizationNode);

  // ── Edges — complete final pipeline ───────────────────
  graph.addEdge("__start__",               "companyResolutionNode");
  graph.addEdge("companyResolutionNode",   "fundamentalAnalysisNode");
  graph.addEdge("fundamentalAnalysisNode", "technicalAnalysisNode");
  graph.addEdge("technicalAnalysisNode",   "newsAndMacroNode");
  graph.addEdge("newsAndMacroNode",        "bullCaseNode");
  graph.addEdge("bullCaseNode",            "bearCaseNode");
  graph.addEdge("bearCaseNode",            "preMortemNode");
  graph.addEdge("preMortemNode",           "synthesisNode");
  graph.addEdge("synthesisNode",           "personalizationNode");
  graph.addEdge("personalizationNode",     "__end__");

  return graph.compile();
}