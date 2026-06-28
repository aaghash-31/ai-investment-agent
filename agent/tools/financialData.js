// agent/tools/financialData.js
// Fetches fundamental data for a given ticker using yahoo-finance2
// Also attempts Screener.in scraping for India-specific data

import YahooFinance from "yahoo-finance2";
import axios from "axios";
import * as cheerio from "cheerio";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

function rawNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value?.raw === "number") return value.raw;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchFundamentals(ticker) {
  try {
    const modules = [
      "financialData",
      "defaultKeyStatistics",
      "summaryDetail",
      "incomeStatementHistory",
      "incomeStatementHistoryQuarterly",
      "balanceSheetHistory",
      "cashflowStatementHistory",
      "earningsTrend",
    ];

    const summary = await yahooFinance.quoteSummary(
      ticker,
      { modules },
      { validateResult: false }
    );

    return { success: true, data: summary };
  } catch (error) {
    return { success: false, data: null, error: error.message };
  }
}

export function extractRatios(rawData, ticker) {
  const fd = rawData?.financialData || {};
  const ks = rawData?.defaultKeyStatistics || {};
  const sd = rawData?.summaryDetail || {};
  const income = rawData?.incomeStatementHistory?.incomeStatementHistory || [];
  const incomeQ =
    rawData?.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
  const balance = rawData?.balanceSheetHistory?.balanceSheetStatements || [];
  const cashflow = rawData?.cashflowStatementHistory?.cashflowStatements || [];

  let revenueGrowthYoY = null;
  if (income.length >= 2) {
    const latestRevenue = rawNumber(income[0]?.totalRevenue);
    const prevRevenue = rawNumber(income[1]?.totalRevenue);
    if (latestRevenue != null && prevRevenue) {
      revenueGrowthYoY = ((latestRevenue - prevRevenue) / Math.abs(prevRevenue)) * 100;
    }
  }

  let revenueCAGR3Y = null;
  if (income.length >= 4) {
    const latest = rawNumber(income[0]?.totalRevenue);
    const threeYearsAgo = rawNumber(income[3]?.totalRevenue);
    if (latest != null && threeYearsAgo) {
      revenueCAGR3Y = (Math.pow(latest / threeYearsAgo, 1 / 3) - 1) * 100;
    }
  }

  const netMargin =
    rawNumber(fd.profitMargins) != null ? rawNumber(fd.profitMargins) * 100 : null;
  const grossMargin =
    rawNumber(fd.grossMargins) != null ? rawNumber(fd.grossMargins) * 100 : null;
  const operatingMargin =
    rawNumber(fd.operatingMargins) != null ? rawNumber(fd.operatingMargins) * 100 : null;
  const roe =
    rawNumber(fd.returnOnEquity) != null ? rawNumber(fd.returnOnEquity) * 100 : null;
  const roa =
    rawNumber(fd.returnOnAssets) != null ? rawNumber(fd.returnOnAssets) * 100 : null;

  let roce = null;
  if (balance.length > 0 && income.length > 0) {
    const ebit = rawNumber(income[0]?.ebit);
    const totalAssets = rawNumber(balance[0]?.totalAssets);
    const currentLiabilities = rawNumber(balance[0]?.totalCurrentLiabilities);
    if (ebit != null && totalAssets != null && currentLiabilities != null) {
      const capitalEmployed = totalAssets - currentLiabilities;
      if (capitalEmployed !== 0) {
        roce = (ebit / capitalEmployed) * 100;
      }
    }
  }

  const debtToEquity =
    rawNumber(fd.debtToEquity) != null ? rawNumber(fd.debtToEquity) / 100 : null;

  let interestCoverageRatio = null;
  if (income.length > 0) {
    const ebit = rawNumber(income[0]?.ebit);
    const interestExpense = rawNumber(income[0]?.interestExpense);
    if (ebit != null && interestExpense && interestExpense !== 0) {
      interestCoverageRatio = ebit / Math.abs(interestExpense);
    }
  }

  const currentRatio = rawNumber(fd.currentRatio);

  const operatingCashFlow =
    rawNumber(fd.operatingCashflow) ??
    rawNumber(cashflow[0]?.totalCashFromOperatingActivities);
  const netIncome =
    rawNumber(fd.netIncomeToCommon) ?? rawNumber(income[0]?.netIncome);
  const freeCashFlow = rawNumber(fd.freeCashflow);

  let cashFlowQualityFlag = "unknown";
  if (operatingCashFlow != null && netIncome != null) {
    if (operatingCashFlow < 0 && netIncome > 0) {
      cashFlowQualityFlag = "concerning";
    } else if (operatingCashFlow > netIncome * 0.8) {
      cashFlowQualityFlag = "healthy";
    } else if (operatingCashFlow > 0) {
      cashFlowQualityFlag = "moderate";
    } else {
      cashFlowQualityFlag = "concerning";
    }
  }

  const trailingPE = rawNumber(sd.trailingPE);
  const forwardPE = rawNumber(sd.forwardPE);
  const pbRatio = rawNumber(ks.priceToBook);
  const pegRatio = rawNumber(ks.pegRatio);
  const priceToSales = rawNumber(ks.priceToSalesTrailing12Months);
  const evToEbitda = rawNumber(ks.enterpriseToEbitda);

  const dividendYield =
    rawNumber(sd.dividendYield) != null ? rawNumber(sd.dividendYield) * 100 : null;
  const payoutRatio =
    rawNumber(sd.payoutRatio) != null ? rawNumber(sd.payoutRatio) * 100 : null;
  const fiveYearAvgDividendYield = rawNumber(sd.fiveYearAvgDividendYield);

  const quarterlyRevenues = incomeQ
    .slice(0, 4)
    .map((q) => rawNumber(q.totalRevenue))
    .filter((value) => value != null);

  const totalDebt =
    rawNumber(fd.totalDebt) ?? rawNumber(balance[0]?.longTermDebt);
  const totalCash = rawNumber(fd.totalCash);
  const netDebt =
    totalDebt != null && totalCash != null ? totalDebt - totalCash : null;

  const trailingEps = rawNumber(ks.trailingEps);
  const forwardEps = rawNumber(ks.forwardEps);

  const missingFields = [];
  const fields = {
    revenueGrowthYoY,
    netMargin,
    roe,
    roce,
    debtToEquity,
    currentRatio,
    trailingPE,
    pbRatio,
    operatingCashFlow,
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (value == null) missingFields.push(key);
  });

  return {
    ticker,

    revenueGrowthYoY: round(revenueGrowthYoY),
    revenueCAGR3Y: round(revenueCAGR3Y),
    quarterlyRevenues,

    grossMargin: round(grossMargin),
    operatingMargin: round(operatingMargin),
    netMargin: round(netMargin),
    roe: round(roe),
    roa: round(roa),
    roce: round(roce),

    debtToEquity: round(debtToEquity, 2),
    interestCoverageRatio: round(interestCoverageRatio, 1),
    currentRatio: round(currentRatio, 2),
    totalDebt,
    totalCash,
    netDebt,

    operatingCashFlow,
    freeCashFlow,
    netIncome,
    cashFlowQualityFlag,

    trailingPE: round(trailingPE, 1),
    forwardPE: round(forwardPE, 1),
    pbRatio: round(pbRatio, 2),
    pegRatio: round(pegRatio, 2),
    priceToSales: round(priceToSales, 2),
    evToEbitda: round(evToEbitda, 1),

    dividendYield: round(dividendYield, 2),
    payoutRatio: round(payoutRatio, 1),
    fiveYearAvgDividendYield: round(fiveYearAvgDividendYield, 2),

    trailingEps,
    forwardEps,

    missingFields,
    dataAsOf: new Date().toISOString(),
    dataSource: "Yahoo Finance",
  };
}

export async function fetchScreenerData(ticker) {
  try {
    const symbol = ticker.replace(".NS", "").replace(".BO", "").toUpperCase();
    const url = `https://www.screener.in/company/${symbol}/consolidated/`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
      timeout: 8000,
    });

    const $ = cheerio.load(response.data);

    let promoterHoldingPct = null;
    let promoterHoldingTrend = "unknown";
    let pledgedSharesPct = null;

    $(".shareholding-table tbody tr, #shareholding tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      const label = $(cells[0]).text().trim().toLowerCase();

      if (label.includes("promoter")) {
        const latestVal = parseFloat($(cells[1]).text().replace("%", "").trim());
        const prevVal = parseFloat($(cells[2]).text().replace("%", "").trim());

        if (!Number.isNaN(latestVal)) promoterHoldingPct = latestVal;
        if (!Number.isNaN(latestVal) && !Number.isNaN(prevVal)) {
          if (latestVal > prevVal) promoterHoldingTrend = "increasing";
          else if (latestVal < prevVal) promoterHoldingTrend = "decreasing";
          else promoterHoldingTrend = "stable";
        }
      }

      if (label.includes("pledge") || label.includes("pledged")) {
        const val = parseFloat($(cells[1]).text().replace("%", "").trim());
        if (!Number.isNaN(val)) pledgedSharesPct = val;
      }
    });

    const ratios = {};
    $(".company-ratios li, #top-ratios li").each((_, el) => {
      const name = $(el).find(".name").text().trim().toLowerCase();
      const value = $(el).find(".value, .nowrap").first().text().trim();
      if (name) ratios[name] = value;
    });

    return {
      success: true,
      promoterHoldingPct,
      promoterHoldingTrend,
      pledgedSharesPct,
      screenerRatios: ratios,
      screenerUrl: url,
    };
  } catch (error) {
    return {
      success: false,
      promoterHoldingPct: null,
      promoterHoldingTrend: "unknown",
      pledgedSharesPct: null,
      error: error.message,
    };
  }
}

function round(value, decimals = 1) {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value.toFixed(decimals));
}
