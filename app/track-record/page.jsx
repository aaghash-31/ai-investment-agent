// app/track-record/page.jsx
"use client";
import { useState, useEffect } from "react";

const VERDICT_COLORS = {
  buy: "#10B981",
  cautious_buy: "#F59E0B",
  hold: "#6B7280",
  cautious_pass: "#F97316",
  pass: "#EF4444",
};

const VERDICT_LABELS = {
  buy: "Buy",
  cautious_buy: "Cautious Buy",
  hold: "Hold",
  cautious_pass: "Cautious Pass",
  pass: "Pass",
};

export default function TrackRecordPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/track-record")
      .then(r => r.json())
      .then(data => {
        setRecords(data.records || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all"
    ? records
    : records.filter(r => r.verdict === filter);

  const stats = {
    total: records.length,
    buy: records.filter(r => r.verdict === "buy" || r.verdict === "cautious_buy").length,
    pass: records.filter(r => r.verdict === "pass" || r.verdict === "cautious_pass").length,
    avgConfidence: records.length
      ? Math.round(records.reduce((s, r) => s + (r.confidence || 0), 0) / records.length)
      : 0,
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Track Record
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Every verdict this agent has given — wins and losses, nothing hidden.
          This is an append-only log. No entries are ever edited or deleted.
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1rem", marginBottom: "2rem",
      }}>
        {[
          { label: "Total verdicts", value: stats.total, color: "var(--text-primary)" },
          { label: "Buy / Cautious Buy", value: stats.buy, color: "#10B981" },
          { label: "Pass / Cautious Pass", value: stats.pass, color: "#EF4444" },
          { label: "Avg confidence", value: `${stats.avgConfidence}/100`, color: "#F59E0B" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {label}
            </p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {["all", "buy", "cautious_buy", "hold", "cautious_pass", "pass"].map(v => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding: "0.35rem 0.75rem",
            background: filter === v ? "var(--accent-blue)" : "var(--bg-card)",
            border: `1px solid ${filter === v ? "var(--accent-blue)" : "var(--border)"}`,
            borderRadius: "20px", color: "var(--text-primary)",
            cursor: "pointer", fontSize: "0.8rem", fontWeight: 500,
          }}>
            {v === "all" ? "All" : VERDICT_LABELS[v]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          Loading track record...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            {records.length === 0
              ? "No verdicts logged yet."
              : "No verdicts match this filter."}
          </p>
          {records.length === 0 && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Every time you research a company, the verdict is logged here automatically.
            </p>
          )}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Company", "Verdict", "Confidence", "FA", "TA", "News", "Entry Price", "Date"].map(h => (
                  <th key={h} style={{
                    padding: "0.75rem 1rem", textAlign: "left",
                    fontSize: "0.7rem", color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    fontWeight: 600, whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id} style={{
                  borderBottom: "1px solid var(--border)",
                  transition: "background 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{record.company_name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{record.ticker}</p>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      color: VERDICT_COLORS[record.verdict],
                      fontWeight: 700, fontSize: "0.85rem",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {VERDICT_LABELS[record.verdict] || record.verdict}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {record.confidence}/100
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    {record.fa_score != null ? `${record.fa_score}/10` : "—"}
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    {record.ta_score != null ? `${record.ta_score}/10` : "—"}
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    {record.news_score != null ? `${record.news_score}/10` : "—"}
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    {record.entry_price != null ? `₹${record.entry_price}` : "—"}
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {new Date(record.entry_date).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        marginTop: "2rem", padding: "1rem 1.5rem",
        background: "rgba(59,130,246,0.05)",
        border: "1px solid rgba(59,130,246,0.15)",
        borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-muted)",
        lineHeight: 1.6,
      }}>
        <strong style={{ color: "var(--text-secondary)" }}>Methodology:</strong> A verdict is logged at the time of analysis with the entry price at that moment.
        This is an append-only log — no entries are modified or removed after the fact.
        This is not financial advice. Past verdicts are not indicators of future accuracy.
      </div>
    </div>
  );
}