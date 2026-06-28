// agent/tools/priceData.js
// Fetches historical OHLCV data and computes all technical indicators
// from scratch — no external TA library needed

import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

// ─────────────────────────────────────────────────────────
// Fetch historical daily OHLCV data
// We need 200+ days for the 200-day MA to be meaningful
// ─────────────────────────────────────────────────────────
export async function fetchHistoricalData(ticker, days = 250) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // ── Attempt 1: try with today as end date ─────────────
  try {
    const result = await yahooFinance.historical(
      ticker,
      { period1: startDate, period2: endDate, interval: "1d" },
      { validateResult: false }
    );
    const cleaned = cleanCandles(result);
    if (cleaned.length >= 50) return { success: true, data: cleaned };
  } catch (error) {
    // If not the null-values error, it's a real failure
    if (!error.message.includes("null values")) {
      return { success: false, data: [], error: error.message };
    }
    // Otherwise fall through to retry with yesterday
    console.log(`[PriceData] Today's candle has null close — retrying with yesterday as end date`);
  }

  // ── Attempt 2: exclude today (market data not yet settled) ─
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await yahooFinance.historical(
      ticker,
      { period1: startDate, period2: yesterday, interval: "1d" },
      { validateResult: false }
    );
    const cleaned = cleanCandles(result);
    if (cleaned.length >= 50) return { success: true, data: cleaned };
    return {
      success: false,
      data: [],
      error: `Only ${cleaned.length} valid candles — need at least 50`,
    };
  } catch (error) {
    return { success: false, data: [], error: error.message };
  }
}

// ── Extracted helper: clean and sort candles ─────────────
function cleanCandles(result) {
  if (!result || result.length === 0) return [];
  return result
    .filter(
      (q) =>
        q.close != null &&
        q.open != null &&
        q.high != null &&
        q.low != null &&
        q.volume != null
    )
    .map((q) => ({
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ─────────────────────────────────────────────────────────
// COMPUTE ALL TECHNICAL INDICATORS
// Takes the cleaned OHLCV array, returns a flat indicators object
// ─────────────────────────────────────────────────────────
export function computeIndicators(candles) {
  if (!candles || candles.length < 20) {
    return { success: false, error: "Insufficient data for indicators" };
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);
  const n = candles.length;

  // ── Simple Moving Averages ─────────────────────────────
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);

  // ── Exponential Moving Averages ───────────────────────
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);

  // ── MACD ──────────────────────────────────────────────
  // MACD Line = EMA12 - EMA26
  // Signal Line = EMA9 of MACD Line
  const macdLine = ema12 !== null && ema26 !== null ? ema12 - ema26 : null;

  // ── RSI (14-period Wilder's smoothing) ────────────────
  const rsi14 = computeRSI(closes, 14);

  // ── Volume analysis ───────────────────────────────────
  const recentVolumes = volumes.slice(-10);
  const olderVolumes = volumes.slice(-30, -10);
  const avgRecentVolume = mean(recentVolumes);
  const avgOlderVolume = mean(olderVolumes);
  const volumeTrend =
    avgOlderVolume === 0
      ? "neutral"
      : avgRecentVolume > avgOlderVolume * 1.1
      ? "increasing"
      : avgRecentVolume < avgOlderVolume * 0.9
      ? "decreasing"
      : "neutral";

  // ── Golden / Death Cross ───────────────────────────────
  // Requires enough data for both MAs
  // Replace the maSignal block with this:
  let maSignal = "neutral";
  let maSignalDetail = "";

  if (ma50 !== null && ma200 !== null) {
    const prev50 = sma(closes.slice(0, -1), 50);
    const prev200 = sma(closes.slice(0, -1), 200);
    if (ma50 > ma200) {
      maSignal = prev50 && prev50 <= prev200 ? "golden_cross_recent" : "golden_cross";
      maSignalDetail = `50-DMA (${round(ma50)}) above 200-DMA (${round(ma200)})`;
    } else {
      maSignal = prev50 && prev50 >= prev200 ? "death_cross_recent" : "death_cross";
      maSignalDetail = `50-DMA (${round(ma50)}) below 200-DMA (${round(ma200)})`;
    }
  } else if (ma50 !== null) {
    // MA200 not available — use EMA50 vs EMA20 as fallback signal
    if (ema20 !== null && ema50 !== null) {
      if (ema20 > ema50) {
        maSignal = "ema_bullish";
        maSignalDetail = `EMA20 (${round(ema20)}) above EMA50 (${round(ema50)}) — MA200 unavailable`;
      } else {
        maSignal = "ema_bearish";
        maSignalDetail = `EMA20 (${round(ema20)}) below EMA50 (${round(ema50)}) — MA200 unavailable`;
      }
    } else {
      maSignalDetail = `MA50 available (${round(ma50)}) — MA200 requires more price history`;
    }
  }

  // ── RSI Signal ────────────────────────────────────────
  let rsiSignal = "neutral";
  if (rsi14 !== null) {
    if (rsi14 >= 70) rsiSignal = "overbought";
    else if (rsi14 >= 60) rsiSignal = "approaching_overbought";
    else if (rsi14 <= 30) rsiSignal = "oversold";
    else if (rsi14 <= 40) rsiSignal = "approaching_oversold";
    else rsiSignal = "neutral";
  }

  // ── Price vs Moving Averages ──────────────────────────
  const currentPrice = closes[n - 1];
  const priceVsMA50 = ma50 ? ((currentPrice - ma50) / ma50) * 100 : null;
  const priceVsMA200 = ma200 ? ((currentPrice - ma200) / ma200) * 100 : null;

  // ── 52-week High/Low ──────────────────────────────────
  const yearCandles = candles.slice(-252); // ~1 trading year
  const high52w = Math.max(...yearCandles.map((c) => c.high));
  const low52w = Math.min(...yearCandles.map((c) => c.low));
  const pctFromHigh = ((currentPrice - high52w) / high52w) * 100;
  const pctFromLow = ((currentPrice - low52w) / low52w) * 100;

  // ── Support and Resistance Levels ─────────────────────
  const { support, resistance } = findSupportResistance(candles, 20);

  // ── Price Trend (short + medium term) ─────────────────
  const recentCloses = closes.slice(-20);
  const shortTermTrend = linearTrend(recentCloses);
  const mediumCloses = closes.slice(-60);
  const mediumTermTrend = linearTrend(mediumCloses);

  // ── Volume-price confirmation ──────────────────────────
  // Price up + volume up = strong bullish confirmation
  // Price up + volume down = weak/suspect move
  const last5closes = closes.slice(-5);
  const last5volumes = volumes.slice(-5);
  const priceUp = last5closes[4] > last5closes[0];
  const volumeUp = last5volumes[4] > last5volumes[0];
  const volumePriceConfirmation =
    priceUp && volumeUp
      ? "confirmed_bullish"
      : !priceUp && !volumeUp
      ? "confirmed_bearish"
      : priceUp && !volumeUp
      ? "weak_bullish"
      : "weak_bearish";

  // ── SMART MONEY CONCEPTS (Simplified) ─────────────────
  const smc = computeSMC(candles);

  return {
    success: true,

    // Core indicators
    currentPrice: round(currentPrice, 2),
    ma20: round(ma20, 2),
    ma50: round(ma50, 2),
    ma200: round(ma200, 2),
    ema12: round(ema12, 2),
    ema20: round(ema20, 2),
    ema26: round(ema26, 2),
    ema50: round(ema50, 2),
    macdLine: round(macdLine, 3),
    rsi14: round(rsi14, 1),

    // Signals
    maSignal,
    maSignalDetail,
    rsiSignal,
    volumeTrend,
    volumePriceConfirmation,

    // Price context
    priceVsMA50: round(priceVsMA50, 2),    // % above/below 50-DMA
    priceVsMA200: round(priceVsMA200, 2),  // % above/below 200-DMA
    high52w: round(high52w, 2),
    low52w: round(low52w, 2),
    pctFromHigh: round(pctFromHigh, 2),    // % below 52w high (negative = below)
    pctFromLow: round(pctFromLow, 2),      // % above 52w low (positive = above)

    // Support / Resistance
    support: round(support, 2),
    resistance: round(resistance, 2),

    // Trend
    shortTermTrend,   // "up" | "down" | "sideways"
    mediumTermTrend,

    // Volume
    avgRecentVolume: Math.round(avgRecentVolume),
    avgOlderVolume: Math.round(avgOlderVolume),

    // SMC
    smc,

    // Data meta
    candleCount: n,
    dataFrom: candles[0]?.date,
    dataTo: candles[n - 1]?.date,
    dataAsOf: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────
// SMART MONEY CONCEPTS — Simplified implementation
// Detects swing structure, liquidity zones, market structure
// ─────────────────────────────────────────────────────────
function computeSMC(candles) {
  const lookback = 5; // swings look left and right N candles
  const n = candles.length;

  if (n < lookback * 3) {
    return {
      marketStructure: "insufficient_data",
      swingHighs: [],
      swingLows: [],
      liquidityZones: [],
      lastBOS: null,
      chochDetected: false,
      smcSummary: "Insufficient data for SMC analysis",
    };
  }

  // ── Find swing highs and lows ──────────────────────────
  const swingHighs = [];
  const swingLows = [];

  for (let i = lookback; i < n - lookback; i++) {
    const windowHighs = candles.slice(i - lookback, i + lookback + 1).map((c) => c.high);
    const windowLows = candles.slice(i - lookback, i + lookback + 1).map((c) => c.low);
    const centerHigh = candles[i].high;
    const centerLow = candles[i].low;

    // Swing high: highest in its window
    if (centerHigh === Math.max(...windowHighs)) {
      swingHighs.push({ index: i, price: centerHigh, date: candles[i].date });
    }
    // Swing low: lowest in its window
    if (centerLow === Math.min(...windowLows)) {
      swingLows.push({ index: i, price: centerLow, date: candles[i].date });
    }
  }

  // ── Market Structure ───────────────────────────────────
  // Bullish: recent swing highs and lows are HIGHER than prior ones
  // Bearish: recent swing highs and lows are LOWER than prior ones
  let marketStructure = "ranging";

  const recentHighs = swingHighs.slice(-3);
  const recentLows = swingLows.slice(-3);

  if (recentHighs.length >= 2 && recentLows.length >= 2) {
    const higherHighs = recentHighs[recentHighs.length - 1].price > recentHighs[0].price;
    const higherLows = recentLows[recentLows.length - 1].price > recentLows[0].price;
    const lowerHighs = recentHighs[recentHighs.length - 1].price < recentHighs[0].price;
    const lowerLows = recentLows[recentLows.length - 1].price < recentLows[0].price;

    if (higherHighs && higherLows) marketStructure = "bullish";
    else if (lowerHighs && lowerLows) marketStructure = "bearish";
    else marketStructure = "ranging";
  }

  // ── Liquidity Zones ────────────────────────────────────
  // Swing highs/lows are where stop-losses cluster
  // Recent ones are more significant
  const recentSwingHighs = swingHighs.slice(-4);
  const recentSwingLows = swingLows.slice(-4);
  const liquidityZones = [
    ...recentSwingHighs.map((s) => ({
      type: "resistance_liquidity",
      price: s.price,
      date: s.date,
      note: "Buy-stop orders likely clustered here",
    })),
    ...recentSwingLows.map((s) => ({
      type: "support_liquidity",
      price: s.price,
      date: s.date,
      note: "Sell-stop orders likely clustered here",
    })),
  ].sort((a, b) => b.price - a.price); // highest to lowest

  // ── Break of Structure (BOS) ───────────────────────────
  // BOS: price breaks above the last swing high (bullish BOS)
  //      or below the last swing low (bearish BOS)
  let lastBOS = null;
  const currentPrice = candles[n - 1].close;
  const lastSwingHigh = swingHighs[swingHighs.length - 1];
  const lastSwingLow = swingLows[swingLows.length - 1];

  if (lastSwingHigh && currentPrice > lastSwingHigh.price) {
    lastBOS = {
      type: "bullish",
      level: lastSwingHigh.price,
      note: `Price broke above swing high at ${round(lastSwingHigh.price, 2)}`,
    };
  } else if (lastSwingLow && currentPrice < lastSwingLow.price) {
    lastBOS = {
      type: "bearish",
      level: lastSwingLow.price,
      note: `Price broke below swing low at ${round(lastSwingLow.price, 2)}`,
    };
  }

  // ── Change of Character (CHoCH) ────────────────────────
  // CHoCH: in a downtrend, price breaks above a recent swing high
  // (or in uptrend, breaks below a swing low) — potential reversal
  let chochDetected = false;
  let chochNote = "";

  if (marketStructure === "bearish" && lastBOS?.type === "bullish") {
    chochDetected = true;
    chochNote = "Potential bullish reversal — bearish structure broken to the upside";
  } else if (marketStructure === "bullish" && lastBOS?.type === "bearish") {
    chochDetected = true;
    chochNote = "Potential bearish reversal — bullish structure broken to the downside";
  }

  // ── SMC Summary ────────────────────────────────────────
  let smcSummary = `Market structure is ${marketStructure}. `;
  if (lastBOS) smcSummary += `${lastBOS.note}. `;
  if (chochDetected) smcSummary += chochNote + ". ";
  const finalZones = liquidityZones.slice(0, 6);
  // then use finalZones in return, and:
  smcSummary += `${finalZones.length} liquidity zones identified near recent swing points.`;

  return {
    marketStructure,
    swingHighs: swingHighs.slice(-5).map((s) => ({ price: s.price, date: s.date })),
    swingLows: swingLows.slice(-5).map((s) => ({ price: s.price, date: s.date })),
    liquidityZones: finalZones, // top 6 most recent
    lastBOS,
    chochDetected,
    chochNote,
    smcSummary,
  };
}

// ─────────────────────────────────────────────────────────
// MATH HELPERS
// ─────────────────────────────────────────────────────────

// Simple Moving Average (returns current/latest value)
function sma(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

// Exponential Moving Average (returns current/latest value)
function ema(data, period) {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let emaVal = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < data.length; i++) {
    emaVal = data[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

// RSI using Wilder's smoothing method (industry standard)
function computeRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;

  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Initial average gain/loss
  const firstGains = changes.slice(0, period).filter((c) => c > 0);
  const firstLosses = changes.slice(0, period).filter((c) => c < 0).map(Math.abs);
  let avgGain = firstGains.reduce((s, v) => s + v, 0) / period;
  let avgLoss = firstLosses.reduce((s, v) => s + v, 0) / period;

  // Wilder's smoothing for remaining periods
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Find support and resistance from recent price action
function findSupportResistance(candles, lookback = 20) {
  const recent = candles.slice(-lookback);
  const lows = recent.map((c) => c.low);
  const highs = recent.map((c) => c.high);

  // Support = average of the lowest cluster of lows
  const sortedLows = [...lows].sort((a, b) => a - b);
  const support = mean(sortedLows.slice(0, 3));

  // Resistance = average of the highest cluster of highs
  const sortedHighs = [...highs].sort((a, b) => b - a);
  const resistance = mean(sortedHighs.slice(0, 3));

  return { support, resistance };
}

// Linear regression trend direction
function linearTrend(data) {
  if (data.length < 5) return "sideways";
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(data);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (data[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const slopePercent = (slope / yMean) * 100;
  if (slopePercent > 0.1) return "up";
  if (slopePercent < -0.1) return "down";
  return "sideways";
}

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function round(value, decimals = 2) {
  if (value == null || isNaN(value)) return null;
  return parseFloat(value.toFixed(decimals));
}