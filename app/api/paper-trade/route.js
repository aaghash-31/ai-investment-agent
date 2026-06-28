// app/api/paper-trade/route.js
import { NextResponse } from "next/server";
import { getDb, initDb } from "@/agent/lib/db";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export async function POST(request) {
  try {
    await initDb();
    const { sessionId, companyName, ticker, entryPrice, verdict, reasoning } =
      await request.json();

    const db = getDb();

    // Insert the paper trade
    await db.execute({
      sql: `INSERT INTO paper_trades
            (session_id, company_name, ticker, entry_price, current_price,
             verdict, reasoning, entry_date, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sessionId, companyName, ticker,
        entryPrice, entryPrice,
        verdict, reasoning || "",
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    });

    // Also backfill into track_record if not already there
    await db.execute({
      sql: `INSERT OR IGNORE INTO track_record (
              session_id, company_name, ticker, verdict, confidence,
              entry_price, current_price, fa_score, ta_score, news_score,
              rationale, analyst_summary, entry_date, is_backtest
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sessionId, companyName, ticker, verdict, null,
        entryPrice, entryPrice, null, null, null,
        reasoning || "Logged from paper trade.",
        reasoning || "",
        new Date().toISOString(),
        0,
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    const result = await db.execute(
      "SELECT * FROM paper_trades ORDER BY created_at DESC"
    );
    const trades = result.rows;

    // Enrich each trade with live price from Yahoo Finance
    const enrichedTrades = await Promise.all(
      trades.map(async (trade) => {
        const currentPrice = await fetchCurrentPrice(trade.ticker);
        if (currentPrice != null) {
          await db.execute({
            sql: `UPDATE paper_trades
                  SET current_price = ?, last_updated = ?
                  WHERE id = ?`,
            args: [currentPrice, new Date().toISOString(), trade.id],
          });
          return { ...trade, current_price: currentPrice };
        }
        return trade;
      })
    );

    return NextResponse.json({ trades: enrichedTrades });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function fetchCurrentPrice(ticker) {
  try {
    const quote = await yahooFinance.quote(ticker, {}, { validateResult: false });
    const price =
      quote?.regularMarketPrice ??
      quote?.postMarketPrice ??
      quote?.preMarketPrice ??
      null;
    return typeof price === "number" && Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}
