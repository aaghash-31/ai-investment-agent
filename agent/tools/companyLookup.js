// agent/tools/companyLookup.js
// Handles company name -> ticker resolution using yahoo-finance2
// Covers both Indian (NSE/BSE) and global stocks

import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

const EQUITY_TYPES = new Set(["EQUITY", "S", "ST"]);

function rawNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value?.raw === "number") return value.raw;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rawString(value, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value?.fmt === "string" && value.fmt.trim()) return value.fmt.trim();
  return fallback;
}

function normalizeCandidate(quote) {
  return {
    ticker: quote.symbol,
    name: quote.shortname || quote.longname || quote.symbol,
    exchange: quote.exchange || "",
    type: quote.typeDisp || quote.quoteType || "",
    sector: quote.sector || "",
    industry: quote.industry || "",
  };
}

function isLikelyEquity(quote) {
  return (
    EQUITY_TYPES.has(quote.typeDisp) ||
    EQUITY_TYPES.has(quote.quoteType) ||
    quote.quoteType === "COMMONSTOCK"
  );
}

function prioritizeCandidates(candidates, companyName) {
  const query = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");

  return [...candidates].sort((a, b) => {
    const aIndian = a.ticker.endsWith(".NS") || a.ticker.endsWith(".BO") ? 1 : 0;
    const bIndian = b.ticker.endsWith(".NS") || b.ticker.endsWith(".BO") ? 1 : 0;
    if (aIndian !== bIndian) return bIndian - aIndian;

    const aName = a.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const bName = b.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const aStarts = aName.startsWith(query) ? 1 : 0;
    const bStarts = bName.startsWith(query) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;

    return a.name.length - b.name.length;
  });
}

export async function searchCompany(companyName) {
  try {
    const results = await yahooFinance.search(companyName, {
      quotesCount: 8,
      newsCount: 0,
    });

    if (!results?.quotes?.length) {
      return { success: false, candidates: [], error: "No results found" };
    }

    const candidates = prioritizeCandidates(
      results.quotes.filter(isLikelyEquity).map(normalizeCandidate),
      companyName
    ).slice(0, 5);

    if (!candidates.length) {
      return { success: false, candidates: [], error: "No equity matches found" };
    }

    return { success: true, candidates };
  } catch (error) {
    return {
      success: false,
      candidates: [],
      error: error.message,
    };
  }
}

export async function fetchCompanyProfile(ticker) {
  try {
    const summary = await yahooFinance.quoteSummary(
      ticker,
      {
        modules: ["price", "summaryProfile", "defaultKeyStatistics"],
      },
      {
        validateResult: false,
      }
    );

    const price = summary?.price || {};
    const profile = summary?.summaryProfile || {};
    const stats = summary?.defaultKeyStatistics || {};

    const currency = rawString(price.currency, "INR");
    const isIndian =
      ticker.endsWith(".NS") || ticker.endsWith(".BO") || currency === "INR";

    const marketCap = rawNumber(price.marketCap);
    const currentPrice = rawNumber(price.regularMarketPrice);
    const previousClose = rawNumber(price.regularMarketPreviousClose);
    const priceChange = rawNumber(price.regularMarketChange);
    const priceChangePct = rawNumber(price.regularMarketChangePercent);

    return {
      success: true,
      data: {
        resolvedName:
          rawString(price.longName) || rawString(price.shortName) || ticker,
        ticker,
        exchange:
          rawString(price.exchangeName) || rawString(price.fullExchangeName),
        currency,
        sector: rawString(profile.sector) || rawString(price.sector),
        industry: rawString(profile.industry) || rawString(price.industry),
        country: rawString(profile.country),
        description: rawString(profile.longBusinessSummary),
        marketCap,
        marketCapFormatted: marketCap ? formatMarketCap(marketCap, currency) : "N/A",
        currentPrice,
        previousClose,
        priceChange,
        priceChangePct,
        fiftyTwoWeekHigh: rawNumber(price.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: rawNumber(price.fiftyTwoWeekLow),
        avgVolume: rawNumber(price.averageDailyVolume3Month),
        beta: rawNumber(stats.beta),
        sharesOutstanding: rawNumber(stats.sharesOutstanding),
        isIndian,
        priceAsOf: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
}

function formatMarketCap(value, currency) {
  if (!value) return "N/A";

  if (currency === "INR") {
    if (value >= 1e12) return `₹${(value / 1e12).toFixed(2)} Lakh Cr`;
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
    return `₹${value.toLocaleString("en-IN")}`;
  }

  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export function buildIndianTickerGuesses(companyName) {
  const clean = companyName
    .toUpperCase()
    .replace(/\b(LIMITED|LTD|TECHNOLOGIES|TECHNOLOGY|INDIA)\b/g, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .trim();

  return [`${clean}.NS`, `${clean}.BO`];
}

export async function resolveCompany(companyName) {
  const searchResult = await searchCompany(companyName);
  if (searchResult.success && searchResult.candidates.length > 0) {
    return {
      success: true,
      method: "search",
      selectedTicker: searchResult.candidates[0].ticker,
      candidates: searchResult.candidates,
    };
  }

  const guesses = buildIndianTickerGuesses(companyName);
  for (const ticker of guesses) {
    const profile = await fetchCompanyProfile(ticker);
    if (profile.success && profile.data?.currentPrice != null) {
      return {
        success: true,
        method: "guess",
        selectedTicker: ticker,
        candidates: [{ ticker, name: profile.data.resolvedName }],
      };
    }
  }

  return {
    success: false,
    method: "none",
    selectedTicker: null,
    candidates: [],
    error: searchResult.error || "Could not resolve company",
  };
}
