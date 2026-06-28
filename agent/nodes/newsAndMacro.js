// agent/nodes/newsAndMacro.js
// Node 4: Fetches company news + macro events, LLM evaluates sentiment and impact
// Reads: state.company
// Writes: state.newsAndMacro, state.meta

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { fetchCompanyNews, fetchMacroNews, getMacroTopicsForSector } from "../tools/newsData.js";
import { buildNewsPrompt } from "../prompts/newsPrompt.js";

import { getLLM } from "../lib/llm.js";
const llm = getLLM(0.2); // keep original temperature

// ─────────────────────────────────────────────────────────
// MAIN NODE FUNCTION
// ─────────────────────────────────────────────────────────
export async function newsAndMacroNode(state) {
  const { company } = state;
  const nodeStart = Date.now();

  if (!company.isResolved) {
    console.log("[Node 4] Skipping — company not resolved");
    return buildSkipState(state, "Company not resolved");
  }

  console.log(`[Node 4] Fetching news for ${company.resolvedName} (${company.sector})`);

  try {
    // ── STEP 1: Fetch company news + macro news in parallel ─
    const [companyArticles, macroData] = await Promise.all([
      fetchCompanyNews(company.resolvedName, company.ticker, 10),
      fetchMacroNews(company.sector, 8),
    ]);

    console.log(
      `[Node 4] Got ${companyArticles.length} company articles, ${macroData.articles.length} macro articles`
    );

    // ── STEP 2: If no news at all, return a soft skip ──────
    if (companyArticles.length === 0 && macroData.articles.length === 0) {
      console.warn("[Node 4] No news data available");
      return buildNoNewsState(state, company);
    }

    // ── STEP 3: LLM evaluates news + macro ────────────────
    console.log("[Node 4] Sending to LLM for news evaluation...");
    const prompt = buildNewsPrompt(company, companyArticles, macroData);

    const llmResponse = await llm.invoke([new HumanMessage(prompt)]);

    let analysis;
    try {
      const clean = llmResponse.content
        .trim()
        .replace(/```json|```/g, "")
        .trim();
      analysis = JSON.parse(clean);
    } catch {
      console.warn("[Node 4] LLM parse failed — using neutral defaults");
      analysis = buildNeutralAnalysis();
    }

    console.log(
      `[Node 4] ✓ News complete: sentiment=${analysis.sentimentScore}, macroRisk=${analysis.macroRiskLevel} in ${Date.now() - nodeStart}ms`
    );

    // ── STEP 4: Return updated state ──────────────────────
    return {
      newsAndMacro: {
        // Company news
        recentHeadlines: companyArticles.map((a) => ({
          title: a.title,
          source: a.source,
          date: a.date,
          url: a.url,
        })),
        sentimentScore: analysis.sentimentScore,
        sentimentTrend: analysis.sentimentTrend,
        companySentimentSummary: analysis.companySentimentSummary,
        keyNewsFlags: analysis.keyNewsFlags || [],

        // Macro
        macroHeadlines: macroData.articles.map((a) => ({
          title: a.title,
          source: a.source,
          date: a.date,
          url: a.url,
        })),
        activeMacroEvents: analysis.activeMacroEvents || [],
        sectorMacroSensitivities: macroData.macroTopics.sensitivities,
        macroImpactOnCompany: analysis.macroImpactOnCompany,
        macroRiskLevel: analysis.macroRiskLevel,

        // Scores and analysis
        score: analysis.overallNewsScore,
        analystNotes: analysis.analystNotes,
        simpleExplanation: analysis.simpleExplanation,

        // Data quality
        dataAsOf: new Date().toISOString(),
        newsSource: "NewsAPI + Google News RSS + Guardian API",
        missingFields:
          companyArticles.length === 0
            ? ["companyNews"]
            : macroData.articles.length === 0
            ? ["macroNews"]
            : [],
      },
      meta: {
        ...state.meta,
        nodesCompleted: [
          ...(state.meta.nodesCompleted || []),
          "newsAndMacro",
        ],
      },
    };
  } catch (error) {
    console.error(`[Node 4] Unexpected error:`, error);
    return buildSkipState(state, error.message);
  }
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function buildNeutralAnalysis() {
  return {
    sentimentScore: 0,
    sentimentTrend: "neutral",
    companySentimentSummary: "Insufficient news data to assess sentiment.",
    keyNewsFlags: [],
    activeMacroEvents: [],
    macroImpactOnCompany: "Macro impact could not be assessed due to limited data.",
    macroRiskLevel: "medium",
    overallNewsScore: 5,
    analystNotes: "News analysis unavailable — insufficient data.",
    simpleExplanation: "Not enough recent news to analyze.",
  };
}

function buildNoNewsState(state, company) {
  const macroTopics = getMacroTopicsForSector(company.sector);
  return {
    newsAndMacro: {
      recentHeadlines: [],
      sentimentScore: 0,
      sentimentTrend: "neutral",
      companySentimentSummary: "No recent news found for this company.",
      keyNewsFlags: ["No recent news coverage found — limited visibility"],
      macroHeadlines: [],
      activeMacroEvents: [],
      sectorMacroSensitivities: macroTopics.sensitivities,
      macroImpactOnCompany: "Macro analysis skipped — no news data available.",
      macroRiskLevel: "medium",
      score: 5,
      analystNotes: "No news data available for analysis.",
      simpleExplanation: "No recent news found.",
      dataAsOf: new Date().toISOString(),
      newsSource: "No source available",
      missingFields: ["companyNews", "macroNews"],
    },
    meta: {
      ...state.meta,
      nodeErrors: [
        ...(state.meta.nodeErrors || []),
        { node: "newsAndMacro", error: "No news articles found" },
      ],
    },
  };
}

function buildSkipState(state, reason) {
  return {
    newsAndMacro: {
      recentHeadlines: [],
      sentimentScore: 0,
      sentimentTrend: "neutral",
      keyNewsFlags: [],
      activeMacroEvents: [],
      sectorMacroSensitivities: [],
      macroRiskLevel: "medium",
      score: null,
      analystNotes: "",
      simpleExplanation: "",
      dataAsOf: new Date().toISOString(),
      missingFields: ["all"],
    },
    meta: {
      ...state.meta,
      nodeErrors: [
        ...(state.meta.nodeErrors || []),
        { node: "newsAndMacro", error: reason },
      ],
    },
  };
}