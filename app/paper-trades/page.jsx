// app/paper-trades/page.jsx
"use client";
import { useState, useEffect } from "react";

export default function PaperTradesPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/paper-trade")
      .then(r => r.json())
      .then(data => {
        setTrades(data.trades || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalPnL = trades.reduce((sum, t) => {
    if (t.current_price && t.entry_price) {
      return sum + (t.current_price - t.entry_price);
    }
    return sum;
  }, 0);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Paper Trades
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Track whether the agent's calls would have been profitable. No real money — just accountability.
        </p>
      </div>

      {trades.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem", marginBottom: "2rem",
        }}>
          {[
            { label: "Open trades", value: trades.filter(t => t.status === "open").length },
            { label: "Total tracked", value: trades.length },
            {
              label: "Avg entry confidence",
              value: "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {label}
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          Loading paper trades...
        </div>
      ) : trades.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>◎</p>
          <p style={{ color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.5rem" }}>
            No paper trades yet
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            After running an analysis, click "Paper trade" on the report page to log a call here.
          </p>
          <a href="/" style={{
            display: "inline-block", marginTop: "1rem",
            padding: "0.6rem 1.25rem",
            background: "var(--accent-blue)", color: "white",
            borderRadius: "8px", textDecoration: "none",
            fontSize: "0.875rem", fontWeight: 600,
          }}>
            Research a stock →
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {trades.map((trade) => {
            const pnl = trade.current_price && trade.entry_price
              ? trade.current_price - trade.entry_price
              : null;
            const pnlPct = pnl && trade.entry_price
              ? (pnl / trade.entry_price) * 100
              : null;
            const isPositive = pnl && pnl > 0;

            return (
              <div key={trade.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem" }}>
                      {trade.company_name}
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {trade.ticker} · Entered {new Date(trade.entry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                      Agent verdict at entry
                    </p>
                    <span style={{
                      fontSize: "0.85rem", fontWeight: 700,
                      color: trade.verdict?.includes("buy") ? "#10B981" : trade.verdict === "hold" ? "#6B7280" : "#EF4444",
                      textTransform: "uppercase",
                    }}>
                      {trade.verdict?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: "1rem", marginTop: "1rem", paddingTop: "1rem",
                  borderTop: "1px solid var(--border)",
                }}>
                  <div>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Entry price</p>
                    <p style={{ fontWeight: 600 }}>₹{trade.entry_price}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Current price</p>
                    <p style={{ fontWeight: 600 }}>{trade.current_price ? `₹${trade.current_price}` : "Not updated"}</p>
                  </div>
                  {pnl !== null && (
                    <div>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>P&L</p>
                      <p style={{ fontWeight: 700, color: isPositive ? "#10B981" : "#EF4444" }}>
                        {isPositive ? "+" : ""}₹{pnl.toFixed(2)} ({pnlPct?.toFixed(2)}%)
                      </p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Status</p>
                    <p style={{ fontWeight: 600, textTransform: "capitalize", color: "var(--text-secondary)" }}>
                      {trade.status}
                    </p>
                  </div>
                </div>

                {trade.reasoning && (
                  <p style={{
                    marginTop: "0.75rem", fontSize: "0.8rem",
                    color: "var(--text-muted)", lineHeight: 1.5,
                    borderTop: "1px solid var(--border)", paddingTop: "0.75rem",
                  }}>
                    Agent reasoning at entry: {trade.reasoning}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
        Paper trades track hypothetical performance only. No real money is involved. Not financial advice.
      </p>
    </div>
  );
}