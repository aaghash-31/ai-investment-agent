// app/api/track-record/route.js
import { NextResponse } from "next/server";
import { getDb, initDb } from "@/agent/lib/db";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    // Backfill track records from paper trades that aren't already tracked
    await backfillTrackRecordFromPaperTrades(db);

    const result = await db.execute(
      "SELECT * FROM track_record ORDER BY created_at DESC"
    );
    const records = result.rows;

    // Enrich each record with live price from Yahoo Finance
    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        const currentPrice = await fetchCurrentPrice(record.ticker);
        if (currentPrice != null) {
          await db.execute({
            sql: "UPDATE track_record SET current_price = ? WHERE id = ?",
            args: [currentPrice, record.id],
          });
          return { ...record, current_price: currentPrice };
        }
        return record;
      })
    );

    return NextResponse.json({ records: enrichedRecords });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function backfillTrackRecordFromPaperTrades(db) {
  const result = await db.execute(
    `SELECT * FROM paper_trades
     WHERE session_id NOT IN (SELECT session_id FROM track_record)`
  );

  for (const trade of result.rows) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO track_record (
              session_id, company_name, ticker, verdict, confidence,
              entry_price, current_price, fa_score, ta_score, news_score,
              rationale, analyst_summary, entry_date, is_backtest
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        trade.session_id,
        trade.company_name,
        trade.ticker,
        trade.verdict,
        null,
        trade.entry_price,
        trade.current_price ?? trade.entry_price,
        null, null, null,
        trade.reasoning || "Logged from paper trade.",
        trade.reasoning || "",
        trade.entry_date,
        0,
      ],
    });
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
