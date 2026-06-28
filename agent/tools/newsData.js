// agent/tools/newsData.js
// Fetches company news (NewsAPI + Google News RSS fallback)
// and macro/geopolitical news (Guardian API)
// Maps macro events to sector-specific impact

import axios from "axios";
import * as rssParser from "rss-parser";

const Parser = rssParser.default || rssParser;
const parser = new Parser();

// ─────────────────────────────────────────────────────────
// Company-specific news via NewsAPI
// ─────────────────────────────────────────────────────────
export async function fetchCompanyNews(companyName, ticker, maxArticles = 10) {
  const articles = [];

  // ── Try NewsAPI first ──────────────────────────────────
  try {
    if (process.env.NEWS_API_KEY) {
      const query = encodeURIComponent(`"${companyName}" stock`);
      const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=${maxArticles}&apiKey=${process.env.NEWS_API_KEY}`;

      const response = await axios.get(url, { timeout: 10000 });

      if (response.data?.articles?.length > 0) {
        const mapped = response.data.articles
          .filter((a) => a.title && !a.title.includes("[Removed]"))
          .map((a) => ({
            title: a.title,
            source: a.source?.name || "Unknown",
            date: a.publishedAt,
            url: a.url,
            description: a.description || "",
          }));

        articles.push(...mapped);
        console.log(`[NewsData] NewsAPI: ${mapped.length} articles for "${companyName}"`);
      }
    }
  } catch (error) {
    console.warn(`[NewsData] NewsAPI failed: ${error.message}`);
  }

  // ── Fallback: Google News RSS ──────────────────────────
  if (articles.length < 3) {
    try {
      const query = encodeURIComponent(`${companyName} stock`);
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

      const feed = await parser.parseURL(rssUrl);

      if (feed?.items?.length > 0) {
        const mapped = feed.items.slice(0, maxArticles).map((item) => ({
          title: item.title || "",
          source: item.creator || "Google News",
          date: item.pubDate || item.isoDate || "",
          url: item.link || "",
          description: item.contentSnippet || item.content || "",
        }));

        articles.push(...mapped);
        console.log(`[NewsData] Google RSS: ${mapped.length} articles for "${companyName}"`);
      }
    } catch (error) {
      console.warn(`[NewsData] Google RSS failed: ${error.message}`);
    }
  }

  // Deduplicate by title similarity and sort by date
  const deduplicated = deduplicateArticles(articles);
  const sorted = deduplicated
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, maxArticles);

  return sorted;
}

// ─────────────────────────────────────────────────────────
// Macro/geopolitical news via Guardian API + RSS
// ─────────────────────────────────────────────────────────
export async function fetchMacroNews(sector, maxArticles = 8) {
  const macroTopics = getMacroTopicsForSector(sector);
  const articles = [];

  // ── Guardian API ──────────────────────────────────────
  try {
    if (process.env.GUARDIAN_API_KEY) {
      const query = encodeURIComponent(macroTopics.searchTerms);
      const url = `https://content.guardianapis.com/search?q=${query}&section=business|world&order-by=newest&page-size=${maxArticles}&api-key=${process.env.GUARDIAN_API_KEY}`;

      const response = await axios.get(url, { timeout: 10000 });

      if (response.data?.response?.results?.length > 0) {
        const mapped = response.data.response.results.map((a) => ({
          title: a.webTitle,
          source: "The Guardian",
          date: a.webPublicationDate,
          url: a.webUrl,
          description: "",
          section: a.sectionName,
        }));

        articles.push(...mapped);
        console.log(`[NewsData] Guardian: ${mapped.length} macro articles`);
      }
    }
  } catch (error) {
    console.warn(`[NewsData] Guardian API failed: ${error.message}`);
  }

  // ── Fallback: Google News RSS for macro topics ─────────
  if (articles.length < 3) {
    try {
      const query = encodeURIComponent(macroTopics.searchTerms);
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

      const feed = await parser.parseURL(rssUrl);

      if (feed?.items?.length > 0) {
        const mapped = feed.items.slice(0, maxArticles).map((item) => ({
          title: item.title || "",
          source: "Google News",
          date: item.pubDate || "",
          url: item.link || "",
          description: item.contentSnippet || "",
        }));

        articles.push(...mapped);
        console.log(`[NewsData] Google RSS macro: ${mapped.length} articles`);
      }
    } catch (error) {
      console.warn(`[NewsData] Google RSS macro failed: ${error.message}`);
    }
  }

  return {
    articles: articles.slice(0, maxArticles),
    macroTopics,
  };
}

// ─────────────────────────────────────────────────────────
// Sector → macro sensitivity mapping
// Maps what macro events matter most for each sector
// ─────────────────────────────────────────────────────────
export function getMacroTopicsForSector(sector) {
  const sectorLower = (sector || "").toLowerCase();

  const sectorMap = {
    energy: {
      searchTerms: "crude oil prices OPEC Strait of Hormuz energy markets",
      sensitivities: [
        "Crude oil price movements",
        "OPEC production decisions",
        "Geopolitical tensions in Middle East (Strait of Hormuz)",
        "Refinery margins",
        "Natural gas prices",
      ],
      riskLevel: "high",
    },
    technology: {
      searchTerms: "US India trade tech sector IT spending dollar rupee",
      sensitivities: [
        "USD/INR exchange rate (revenue impact for IT exporters)",
        "US tech spending and recession fears",
        "US-China trade tensions (supply chain for hardware)",
        "H-1B visa policy changes",
        "Global IT budget cycles",
      ],
      riskLevel: "medium",
    },
    "financial services": {
      searchTerms: "RBI interest rate India banking credit growth inflation",
      sensitivities: [
        "RBI repo rate decisions",
        "India CPI inflation trends",
        "Credit growth and NPA cycles",
        "Global banking stress (contagion risk)",
        "Fed rate decisions (capital flow impact)",
      ],
      riskLevel: "medium",
    },
    consumer: {
      searchTerms: "India inflation consumer spending FMCG rural demand",
      sensitivities: [
        "India rural demand and monsoon",
        "CPI inflation (input cost pressure)",
        "GST policy changes",
        "Commodity prices (palm oil, crude, packaging)",
        "Urban consumption trends",
      ],
      riskLevel: "medium",
    },
    automobile: {
      searchTerms: "EV policy India auto sector commodity prices steel",
      sensitivities: [
        "Steel and aluminum prices (input costs)",
        "EV adoption and government incentives (PLI scheme)",
        "Fuel prices (demand impact)",
        "Semiconductor supply chain",
        "Export market demand",
      ],
      riskLevel: "medium",
    },
    "basic materials": {
      searchTerms: "China steel demand metals commodity prices global trade",
      sensitivities: [
        "China industrial demand",
        "Global steel/aluminum/copper prices",
        "Coal and energy costs",
        "India infrastructure spending",
        "US-China trade tariffs",
      ],
      riskLevel: "high",
    },
    healthcare: {
      searchTerms: "India pharma FDA approval drug pricing US healthcare",
      sensitivities: [
        "US FDA import alerts and approvals",
        "US drug pricing policy",
        "API (Active Pharmaceutical Ingredient) costs from China",
        "Patent expirations and generic competition",
        "India healthcare regulation",
      ],
      riskLevel: "medium",
    },
    "real estate": {
      searchTerms: "India real estate housing interest rates RBI property",
      sensitivities: [
        "Home loan interest rates (RBI policy)",
        "India urban housing demand",
        "Construction material costs",
        "RERA compliance",
        "Government infrastructure spending",
      ],
      riskLevel: "medium",
    },
    utilities: {
      searchTerms: "India power sector electricity coal renewable energy policy",
      sensitivities: [
        "Coal prices and availability",
        "Renewable energy policy (solar, wind targets)",
        "Electricity tariff regulation",
        "India power demand growth",
        "Carbon pricing and ESG mandates",
      ],
      riskLevel: "low",
    },
  };

  // Match sector to map entry
  for (const [key, value] of Object.entries(sectorMap)) {
    if (sectorLower.includes(key)) return value;
  }

  // Default for unmatched sectors
  return {
    searchTerms: "India economy GDP growth inflation global markets",
    sensitivities: [
      "India GDP growth trajectory",
      "Global risk-off sentiment",
      "INR/USD movement",
      "FII/DII flows into Indian markets",
      "Global recession fears",
    ],
    riskLevel: "medium",
  };
}

// ─────────────────────────────────────────────────────────
// Simple deduplication by title similarity
// ─────────────────────────────────────────────────────────
function deduplicateArticles(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    // Normalize title for comparison
    const key = a.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}