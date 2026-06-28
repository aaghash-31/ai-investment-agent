// app/api/agent/run/route.js
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { buildInvestmentGraph } from "@/agent/graph";
import { getDb, initDb } from "@/agent/lib/db";

export const maxDuration = 120; // Vercel: allow up to 2 min for the pipeline

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      companyName,
      investmentAmount,
      riskAppetite,
      investmentGoal,
      existingHoldings,
      timeHorizon,
      languageMode,
    } = body;

    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const sessionId = uuidv4();

    const initialState = {
      userInput: {
        companyName: companyName.trim(),
        investmentAmount: investmentAmount || null,
        riskAppetite: riskAppetite || "moderate",
        investmentGoal: investmentGoal || "growth",
        existingHoldings: existingHoldings || [],
        timeHorizon: timeHorizon || "long",
        languageMode: languageMode || "analyst",
      },
      meta: {
        sessionId,
        startedAt: new Date().toISOString(),
        completedAt: "",
        nodesCompleted: [],
        nodeErrors: [],
        overallDataQuality: "",
        cachedResult: false,
        cachedAt: "",
      },
    };

    const graph = await buildInvestmentGraph();
    const result = await graph.invoke(initialState);
    result.meta.completedAt = new Date().toISOString();

    await logTrackRecord(sessionId, result);

    return NextResponse.json({ sessionId, result, status: "completed" });
  } catch (error) {
    console.error("Agent run error:", error);
    return NextResponse.json(
      { error: "Analysis failed", details: error.message },
      { status: 500 }
    );
  }
}

async function logTrackRecord(sessionId, result) {
  try {
    await initDb();
    const db = getDb();
    const company = result.company || {};
    const synthesis = result.synthesis || {};

    await db.execute({
      sql: `INSERT OR REPLACE INTO track_record (
        session_id, company_name, ticker, verdict, confidence,
        entry_price, current_price, fa_score, ta_score, news_score,
        rationale, analyst_summary, entry_date, is_backtest
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sessionId,
        company.resolvedName || result.userInput?.companyName || "Unknown Company",
        company.ticker || "UNRESOLVED",
        synthesis.verdict || "hold",
        synthesis.confidenceScore ?? null,
        company.currentPrice ?? null,
        company.currentPrice ?? null,
        result.fundamentals?.score ?? null,
        result.technical?.score ?? null,
        result.newsAndMacro?.score ?? null,
        synthesis.verdictRationale || "",
        synthesis.analystSummary || "",
        result.meta?.completedAt || new Date().toISOString(),
        0,
      ],
    });
  } catch (dbErr) {
    console.warn("Track record save failed:", dbErr.message);
  }
}
