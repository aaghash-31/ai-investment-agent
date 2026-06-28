// app/api/watchlist/route.js
import { NextResponse } from "next/server";
import { getDb, initDb } from "@/agent/lib/db";

export async function POST(request) {
  try {
    await initDb();
    const { companyName, ticker, addedAt } = await request.json();
    const db = getDb();

    // Avoid duplicates
    const existing = await db.execute({
      sql: "SELECT id FROM watchlist WHERE ticker = ?",
      args: [ticker],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ success: true, message: "Already in watchlist" });
    }

    await db.execute({
      sql: "INSERT INTO watchlist (company_name, ticker, added_at) VALUES (?, ?, ?)",
      args: [companyName, ticker, addedAt || new Date().toISOString()],
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
      "SELECT * FROM watchlist ORDER BY created_at DESC"
    );
    return NextResponse.json({ items: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await initDb();
    const { ticker } = await request.json();
    const db = getDb();
    await db.execute({
      sql: "DELETE FROM watchlist WHERE ticker = ?",
      args: [ticker],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}