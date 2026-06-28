// app/report/[sessionId]/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const VERDICT_LABELS = {
  buy: "BUY",
  cautious_buy: "CAUTIOUS BUY",
  hold: "HOLD",
  cautious_pass: "CAUTIOUS PASS",
  pass: "PASS",
};

const VERDICT_EMOJI = {
  buy: "✦",
  cautious_buy: "◈",
  hold: "◎",
  cautious_pass: "◇",
  pass: "✕",
};

function ScoreBar({ label, score, max = 10 }) {
  const pct = score != null ? (score / max) * 100 : 0;
  const color = pct >= 70 ? "var(--accent-buy)" : pct >= 50 ? "var(--accent-cautious-buy)" : "var(--accent-pass)";
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color }}>{score != null ? `${score}/10` : "N/A"}</span>
      </div>
      <div style={{ height: "4px", background: "var(--bg-primary)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px", transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Tag({ text, color = "var(--text-secondary)", bg = "var(--bg-primary)" }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "0.25rem 0.65rem",
      background: bg,
      border: `1px solid ${color}`,
      borderRadius: "20px",
      color,
      fontSize: "0.75rem",
      fontWeight: 500,
      margin: "0.2rem",
    }}>
      {text}
    </span>
  );
}

export default function ReportPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [paperTraded, setPaperTraded] = useState(false);
  const [langMode, setLangMode] = useState("analyst");

  useEffect(() => {
    const stored = sessionStorage.getItem(`report_${sessionId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setData(parsed);
      setLangMode(parsed.result?.userInput?.languageMode || "analyst");
      setLoading(false);
      return;
    }
    setError("Report not found. Please run a new analysis.");
    setLoading(false);
  }, [sessionId]);

  const handlePaperTrade = async () => {
    if (!data) return;
    const { company, synthesis } = data.result;
    await fetch("/api/paper-trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        companyName: company.resolvedName,
        ticker: company.ticker,
        entryPrice: company.currentPrice,
        verdict: synthesis.verdict,
        reasoning: synthesis.verdictRationale,
        date: new Date().toISOString(),
      }),
    });
    setPaperTraded(true);
  };

  const handleWatchlist = async () => {
    if (!data) return;
    const { company } = data.result;
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: company.resolvedName,
        ticker: company.ticker,
        addedAt: new Date().toISOString(),
      }),
    });
    alert(`${company.resolvedName} added to watchlist`);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem", animation: "spin 2s linear infinite" }}>◎</div>
        <p style={{ color: "var(--text-secondary)" }}>Loading report…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: "600px", margin: "4rem auto", padding: "0 1.5rem", textAlign: "center" }}>
      <p style={{ color: "var(--accent-pass)", marginBottom: "1rem" }}>{error}</p>
      <button onClick={() => router.push("/")} style={{
        padding: "0.75rem 1.5rem", background: "var(--accent-blue)", color: "white",
        border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600,
      }}>
        Run new analysis
      </button>
    </div>
  );

  if (!data) return null;

  const r = data.result;
  const { company, fundamentals, technical, newsAndMacro, bullCase, bearCase, preMortem, synthesis, personalization } = r;
  const verdict = synthesis.verdict;
  const verdictColor = `var(--accent-${verdict?.replace("_", "-")})`;

  const tabs = ["overview", "fundamentals", "technical", "news", "debate", "personalized"];

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <button onClick={() => router.push("/")} style={{
          background: "none", border: "none", color: "var(--text-muted)",
          cursor: "pointer", fontSize: "0.85rem", marginBottom: "1rem", padding: 0,
        }}>
          ← New research
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              {company.resolvedName}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              {company.ticker} · {company.exchange} · {company.sector}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
              ₹{company.currentPrice} · {company.marketCapFormatted}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={handlePaperTrade} disabled={paperTraded} style={{
              padding: "0.5rem 1rem", background: paperTraded ? "var(--bg-card-hover)" : "var(--bg-card)",
              border: "1px solid var(--border)", borderRadius: "8px",
              color: paperTraded ? "var(--accent-buy)" : "var(--text-secondary)",
              cursor: paperTraded ? "default" : "pointer", fontSize: "0.85rem", fontWeight: 500,
            }}>
              {paperTraded ? "✓ Paper traded" : "Paper trade"}
            </button>
            <button onClick={handleWatchlist} style={{
              padding: "0.5rem 1rem", background: "var(--bg-card)",
              border: "1px solid var(--border)", borderRadius: "8px",
              color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
            }}>
              + Watchlist
            </button>
          </div>
        </div>
      </div>

      {/* Verdict stamp */}
      <div className={`verdict-bg-${verdict}`} style={{
        border: "2px solid",
        borderRadius: "16px",
        padding: "2rem",
        marginBottom: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", right: "-10px", top: "-20px",
          fontSize: "8rem", fontFamily: "Playfair Display, serif",
          fontWeight: 900, opacity: 0.06, lineHeight: 1,
          color: verdictColor, pointerEvents: "none", userSelect: "none",
        }}>
          {VERDICT_LABELS[verdict]}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>
              Verdict
            </p>
            <h2 className={`font-display verdict-${verdict}`} style={{
              fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 900, letterSpacing: "-0.02em",
            }}>
              {VERDICT_EMOJI[verdict]} {VERDICT_LABELS[verdict]}
            </h2>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>
              Confidence
            </p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: verdictColor }}>
              {synthesis.confidenceScore}<span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/100</span>
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
              {synthesis.confidenceLabel}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Short-term</span>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>
              {synthesis.verdictShortTerm?.replace("_", " ")}
            </p>
          </div>
          <div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Long-term</span>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>
              {synthesis.verdictLongTerm?.replace("_", " ")}
            </p>
          </div>
          <div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Data quality</span>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>
              {synthesis.overallDataQuality} ({synthesis.dataCompletenessScore}%)
            </p>
          </div>
        </div>

        <p style={{ marginTop: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          {synthesis.verdictRationale}
        </p>
      </div>

      {/* Language toggle */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Report style:</span>
        {["analyst", "simple"].map(m => (
          <button key={m} onClick={() => setLangMode(m)} style={{
            padding: "0.3rem 0.75rem",
            background: langMode === m ? "var(--accent-blue)" : "var(--bg-card)",
            border: `1px solid ${langMode === m ? "var(--accent-blue)" : "var(--border)"}`,
            borderRadius: "20px", color: "var(--text-primary)", cursor: "pointer",
            fontSize: "0.75rem", fontWeight: 500,
          }}>
            {m === "analyst" ? "Analyst" : "Plain English"}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "0.6rem 1rem",
            background: "none", border: "none",
            borderBottom: activeTab === tab ? "2px solid var(--accent-blue)" : "2px solid transparent",
            color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
            cursor: "pointer", fontSize: "0.85rem", fontWeight: activeTab === tab ? 600 : 400,
            textTransform: "capitalize", transition: "all 0.15s",
            marginBottom: "-1px",
          }}>
            {tab === "debate" ? "Bull / Bear" : tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div>
          <Section title="Score Breakdown">
            <ScoreBar label="Fundamentals" score={synthesis.scoreBreakdown?.fundamentals} />
            <ScoreBar label="Technical Analysis" score={synthesis.scoreBreakdown?.technical} />
            <ScoreBar label="News & Macro" score={synthesis.scoreBreakdown?.newsAndMacro} />
            <ScoreBar label="Governance" score={synthesis.scoreBreakdown?.governance} />
          </Section>

          <Section title="Analyst Summary">
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
              {langMode === "simple" ? synthesis.simpleExplanation : synthesis.analystSummary}
            </p>
          </Section>

          {synthesis.conflictsInSignals?.length > 0 && (
            <Section title="Signal Conflicts">
              {synthesis.conflictsInSignals.map((c, i) => (
                <div key={i} style={{
                  padding: "0.75rem 1rem", marginBottom: "0.5rem",
                  background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: "8px", fontSize: "0.875rem", color: "var(--text-secondary)",
                }}>
                  ⚡ {c}
                </div>
              ))}
            </Section>
          )}

          <Section title="What We Did Not Factor In">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {synthesis.whatWeDidNotFactorIn?.map((w, i) => (
                <Tag key={i} text={`○ ${w}`} color="var(--text-muted)" bg="var(--bg-primary)" />
              ))}
            </div>
          </Section>

          <Section title="What Would Change This Verdict">
            {synthesis.whatWouldChangeVerdict?.map((w, i) => (
              <div key={i} style={{
                padding: "0.6rem 1rem", marginBottom: "0.4rem",
                background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)",
                borderRadius: "6px", fontSize: "0.875rem", color: "var(--text-secondary)",
              }}>
                ✅ {w}
              </div>
            ))}
          </Section>
        </div>
      )}

      {activeTab === "fundamentals" && (
        <div>
          <Section title="Key Strengths & Weaknesses">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--accent-buy)", fontWeight: 700, marginBottom: "0.5rem" }}>STRENGTHS</p>
                {fundamentals.keyStrengths?.map((s, i) => (
                  <p key={i} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>✦ {s}</p>
                ))}
              </div>
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--accent-pass)", fontWeight: 700, marginBottom: "0.5rem" }}>WEAKNESSES</p>
                {fundamentals.keyWeaknesses?.map((w, i) => (
                  <p key={i} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>✕ {w}</p>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Financial Metrics">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem" }}>
              {[
                { label: "Revenue Growth YoY", value: fundamentals.revenueGrowthYoY != null ? `${fundamentals.revenueGrowthYoY}%` : "N/A" },
                { label: "Net Margin", value: fundamentals.netMargin != null ? `${fundamentals.netMargin}%` : "N/A" },
                { label: "ROE", value: fundamentals.roe != null ? `${fundamentals.roe}%` : "N/A" },
                { label: "ROCE", value: fundamentals.roce != null ? `${fundamentals.roce}%` : "N/A" },
                { label: "Debt / Equity", value: fundamentals.debtToEquity ?? "N/A" },
                { label: "Current Ratio", value: fundamentals.currentRatio ?? "N/A" },
                { label: "Trailing P/E", value: fundamentals.trailingPE ?? "N/A" },
                { label: "P/B Ratio", value: fundamentals.pbRatio ?? "N/A" },
                { label: "Dividend Yield", value: fundamentals.dividendYield != null ? `${fundamentals.dividendYield}%` : "N/A" },
                { label: "Cash Flow Quality", value: fundamentals.cashFlowQualityFlag ?? "N/A" },
                { label: "Promoter Holding", value: fundamentals.promoterHoldingPct != null ? `${fundamentals.promoterHoldingPct}%` : "N/A" },
                { label: "Promoter Trend", value: fundamentals.promoterHoldingTrend ?? "N/A" },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: "var(--bg-primary)", borderRadius: "8px",
                  padding: "0.75rem", border: "1px solid var(--border)",
                }}>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{label}</p>
                  <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Analyst Notes">
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.9rem" }}>
              {langMode === "simple" ? fundamentals.simpleExplanation : fundamentals.analystNotes}
            </p>
          </Section>
        </div>
      )}

      {activeTab === "technical" && (
        <div>
          <Section title="Technical Signals">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem" }}>
              {[
                { label: "Signal", value: technical.signal?.toUpperCase() ?? "N/A" },
                { label: "RSI (14)", value: technical.rsi14 != null ? `${technical.rsi14} — ${technical.rsiSignal}` : "N/A" },
                { label: "MA Signal", value: technical.maSignal ?? "N/A" },
                { label: "Entry Timing", value: technical.entryTiming?.replace(/_/g, " ") ?? "N/A" },
                { label: "Short-term Trend", value: technical.shortTermTrend ?? "N/A" },
                { label: "Medium-term Trend", value: technical.mediumTermTrend ?? "N/A" },
                { label: "52W High", value: technical.high52w != null ? `₹${technical.high52w}` : "N/A" },
                { label: "52W Low", value: technical.low52w != null ? `₹${technical.low52w}` : "N/A" },
                { label: "Support", value: technical.support != null ? `₹${technical.support}` : "N/A" },
                { label: "Resistance", value: technical.resistance != null ? `₹${technical.resistance}` : "N/A" },
                { label: "Volume Trend", value: technical.volumeTrend ?? "N/A" },
                { label: "SMC Structure", value: technical.smc?.marketStructure ?? "N/A" },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: "var(--bg-primary)", borderRadius: "8px",
                  padding: "0.75rem", border: "1px solid var(--border)",
                }}>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{label}</p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>{value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Smart Money Concepts">
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
              {technical.smc?.smcSummary}
            </p>
            {technical.smc?.chochDetected && (
              <div style={{
                padding: "0.75rem 1rem", background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)", borderRadius: "8px",
                fontSize: "0.85rem", color: "var(--accent-cautious-buy)",
              }}>
                ⚡ CHoCH Detected: {technical.smc?.chochNote}
              </div>
            )}
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
              SMC signals are supplementary timing indicators — pattern-based and more relevant for entry timing than long-term valuation.
            </p>
          </Section>

          <Section title="Analyst Notes">
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.9rem" }}>
              {langMode === "simple" ? technical.simpleExplanation : technical.analystNotes}
            </p>
          </Section>
        </div>
      )}

      {activeTab === "news" && (
        <div>
          <Section title="News Sentiment">
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Sentiment Score</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 700, color: newsAndMacro.sentimentScore > 0 ? "var(--accent-buy)" : newsAndMacro.sentimentScore < 0 ? "var(--accent-pass)" : "var(--text-secondary)" }}>
                  {newsAndMacro.sentimentScore > 0 ? "+" : ""}{newsAndMacro.sentimentScore}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Trend</p>
                <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>{newsAndMacro.sentimentTrend}</p>
              </div>
              <div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Macro Risk</p>
                <p style={{ fontSize: "1rem", fontWeight: 600, color: newsAndMacro.macroRiskLevel === "high" ? "var(--accent-pass)" : newsAndMacro.macroRiskLevel === "medium" ? "var(--accent-cautious-buy)" : "var(--accent-buy)", textTransform: "capitalize" }}>
                  {newsAndMacro.macroRiskLevel}
                </p>
              </div>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {newsAndMacro.companySentimentSummary}
            </p>
          </Section>

          <Section title="Key News Flags">
            {newsAndMacro.keyNewsFlags?.map((f, i) => (
              <div key={i} style={{
                padding: "0.6rem 1rem", marginBottom: "0.4rem",
                background: "var(--bg-primary)", borderRadius: "6px",
                border: "1px solid var(--border)", fontSize: "0.875rem", color: "var(--text-secondary)",
              }}>
                • {f}
              </div>
            ))}
          </Section>

          <Section title="Recent Headlines">
            {newsAndMacro.recentHeadlines?.slice(0, 6).map((h, i) => (
              <a key={i} href={h.url} target="_blank" rel="noopener noreferrer" style={{
                display: "block", padding: "0.75rem 0",
                borderBottom: "1px solid var(--border)", textDecoration: "none",
              }}>
                <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: "0.2rem", lineHeight: 1.4 }}>{h.title}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{h.source} · {new Date(h.date).toLocaleDateString("en-IN")}</p>
              </a>
            ))}
          </Section>

          <Section title="Active Macro Events & Sector Impact">
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "0.75rem" }}>
              {newsAndMacro.macroImpactOnCompany}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {newsAndMacro.activeMacroEvents?.map((e, i) => (
                <Tag key={i} text={e} color="var(--accent-cautious-buy)" />
              ))}
            </div>
          </Section>
        </div>
      )}

      {activeTab === "debate" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div className="card" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-buy)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                Bull Case — {bullCase.strengthScore}/10
              </p>
              {bullCase.arguments?.map((a, i) => (
                <p key={i} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.6rem", lineHeight: 1.5 }}>
                  ✦ {a}
                </p>
              ))}
              <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>CATALYSTS</p>
                {bullCase.catalysts?.map((c, i) => (
                  <p key={i} style={{ fontSize: "0.8rem", color: "var(--accent-buy)", marginBottom: "0.3rem" }}>→ {c}</p>
                ))}
              </div>
              {bullCase.moatAssessment && (
                <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(16,185,129,0.05)", borderRadius: "6px" }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>MOAT</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{bullCase.moatAssessment}</p>
                </div>
              )}
            </div>

            <div className="card" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-pass)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                Bear Case — {bearCase.strengthScore}/10
              </p>
              {bearCase.arguments?.map((a, i) => (
                <p key={i} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.6rem", lineHeight: 1.5 }}>
                  ✕ {a}
                </p>
              ))}
              <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>RISK FACTORS</p>
                {bearCase.riskFactors?.map((r, i) => (
                  <p key={i} style={{ fontSize: "0.8rem", color: "var(--accent-pass)", marginBottom: "0.3rem" }}>⚠ {r}</p>
                ))}
              </div>
              {bearCase.redFlags?.filter(f => f).length > 0 && (
                <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(239,68,68,0.05)", borderRadius: "6px" }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--accent-pass)", marginBottom: "0.4rem" }}>🚩 RED FLAGS</p>
                  {bearCase.redFlags.map((f, i) => f && (
                    <p key={i} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{f}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Section title="Pre-Mortem — If this investment goes wrong">
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>MOST LIKELY FAILURE MODE</p>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{preMortem.mostLikelyFailureMode}</p>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>EARLY WARNING SIGNALS TO WATCH</p>
              {preMortem.earlyWarningSignals?.map((s, i) => (
                <div key={i} style={{
                  padding: "0.5rem 0.75rem", marginBottom: "0.35rem",
                  background: "rgba(239,68,68,0.05)", borderRadius: "6px",
                  fontSize: "0.85rem", color: "var(--text-secondary)",
                }}>
                  📉 {s}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Failure probability</p>
                <p style={{ fontWeight: 600, textTransform: "capitalize", color: preMortem.failureProbability === "high" ? "var(--accent-pass)" : "var(--accent-cautious-buy)" }}>
                  {preMortem.failureProbability}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Time horizon</p>
                <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{preMortem.timeHorizon}</p>
              </div>
            </div>
          </Section>
        </div>
      )}

      {activeTab === "personalized" && (
        <div>
          <Section title="Your Personalized Verdict">
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: "1rem" }}>
              {langMode === "simple" ? personalization.simpleLanguageVerdict : personalization.finalFramedVerdict}
            </p>
            {personalization.capitalFlags?.map((f, i) => (
              <div key={i} style={{
                padding: "0.6rem 1rem", marginBottom: "0.4rem",
                background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)",
                borderRadius: "6px", fontSize: "0.875rem", color: "var(--text-secondary)",
              }}>
                💰 {f}
              </div>
            ))}
          </Section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            {[
              { label: "Goal alignment", value: personalization.goalAlignmentNote },
              { label: "Risk alignment", value: personalization.riskAlignmentNote },
              { label: "Time horizon", value: personalization.timeHorizonNote },
              { label: "Position sizing", value: personalization.suggestedPositionSizing },
            ].map(({ label, value }) => value && (
              <div key={label} className="card">
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{value}</p>
              </div>
            ))}
          </div>

          {personalization.concentrationWarning && (
            <div style={{
              padding: "0.75rem 1rem", marginBottom: "1rem",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "8px", fontSize: "0.875rem", color: "var(--accent-cautious-buy)",
            }}>
              ⚠ {personalization.concentrationWarning}
            </div>
          )}

          <Section title="Key Action Items">
            {personalization.keyActionItems?.map((a, i) => (
              <div key={i} style={{
                padding: "0.6rem 1rem", marginBottom: "0.4rem",
                background: "rgba(16,185,129,0.05)", borderRadius: "6px",
                fontSize: "0.875rem", color: "var(--text-secondary)",
              }}>
                ✅ {a}
              </div>
            ))}
          </Section>

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6, marginTop: "1rem" }}>
            This analysis is generated by an AI agent and is for informational purposes only. It does not constitute personalized financial advice. Past performance is not indicative of future results. Always consult a registered financial advisor before investing.
          </p>
        </div>
      )}
    </div>
  );
}