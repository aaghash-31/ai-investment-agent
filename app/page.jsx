// app/page.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SECTORS = [
  "Technology", "Financial Services", "Energy", "Consumer Defensive",
  "Healthcare", "Automobile", "Utilities", "Real Estate", "Basic Materials",
];

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    investmentAmount: "",
    riskAppetite: "moderate",
    investmentGoal: "growth",
    timeHorizon: "long",
    languageMode: "analyst",
    existingHoldings: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.companyName.trim()) {
      setError("Please enter a company name");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const payload = {
        companyName: form.companyName.trim(),
        investmentAmount: form.investmentAmount ? parseFloat(form.investmentAmount) : null,
        riskAppetite: form.riskAppetite,
        investmentGoal: form.investmentGoal,
        timeHorizon: form.timeHorizon,
        languageMode: form.languageMode,
        existingHoldings: form.existingHoldings
          ? form.existingHoldings.split(",").map(s => s.trim()).filter(Boolean)
          : [],
      };

      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Analysis failed. Please try again.");
      const data = await res.json();
      sessionStorage.setItem(`report_${data.sessionId}`, JSON.stringify(data));
      router.push(`/report/${data.sessionId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "0.5rem",
  };

  const buttonGroupStyle = (active) => ({
    flex: 1,
    padding: "0.6rem",
    borderRadius: "6px",
    border: "1px solid",
    borderColor: active ? "var(--accent-blue)" : "var(--border)",
    background: active ? "rgba(59,130,246,0.15)" : "transparent",
    color: active ? "var(--accent-blue)" : "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 500,
    transition: "all 0.15s",
  });

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "3rem 1.5rem" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <p style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "var(--accent-cautious-buy)",
          textTransform: "uppercase",
          marginBottom: "1rem",
        }}>
          AI Investment Research
        </p>
        <h1 className="font-display" style={{
          fontSize: "clamp(2rem, 5vw, 3rem)",
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: "1rem",
          letterSpacing: "-0.02em",
        }}>
          Research any stock.<br />Get an honest verdict.
        </h1>
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "1rem",
          lineHeight: 1.6,
          maxWidth: "480px",
          margin: "0 auto",
        }}>
          Fundamental analysis → Technical signals → News & macro → Bull/Bear debate → One reasoned verdict. Built for everyone from ₹1,000 to ₹1 crore.
        </p>
      </div>

      {/* Form */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Company name */}
        <div>
          <label style={labelStyle}>Company name</label>
          <input
            style={inputStyle}
            placeholder="e.g. Reliance Industries, TCS, HDFC Bank, Apple..."
            value={form.companyName}
            onChange={e => setForm({ ...form, companyName: e.target.value })}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            onFocus={e => e.target.style.borderColor = "var(--accent-blue)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />
        </div>

        {/* Investment amount */}
        <div>
          <label style={labelStyle}>Investment amount (₹) — optional</label>
          <input
            style={inputStyle}
            type="number"
            placeholder="e.g. 5000, 50000, 500000"
            value={form.investmentAmount}
            onChange={e => setForm({ ...form, investmentAmount: e.target.value })}
            onFocus={e => e.target.style.borderColor = "var(--accent-blue)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
            Personalizes analysis — how many shares you can afford, position sizing, liquidity checks
          </p>
        </div>

        {/* Risk appetite */}
        <div>
          <label style={labelStyle}>Risk appetite</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["conservative", "moderate", "aggressive"].map(r => (
              <button key={r} style={buttonGroupStyle(form.riskAppetite === r)}
                onClick={() => setForm({ ...form, riskAppetite: r })}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div>
          <label style={labelStyle}>Investment goal</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[{ value: "growth", label: "Growth" }, { value: "income", label: "Income / Dividend" }].map(g => (
              <button key={g.value} style={buttonGroupStyle(form.investmentGoal === g.value)}
                onClick={() => setForm({ ...form, investmentGoal: g.value })}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time horizon */}
        <div>
          <label style={labelStyle}>Time horizon</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["short", "medium", "long"].map(h => (
              <button key={h} style={buttonGroupStyle(form.timeHorizon === h)}
                onClick={() => setForm({ ...form, timeHorizon: h })}>
                {h === "short" ? "Short (< 1yr)" : h === "medium" ? "Medium (1-3yr)" : "Long (3yr+)"}
              </button>
            ))}
          </div>
        </div>

        {/* Language mode */}
        <div>
          <label style={labelStyle}>Report style</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[{ value: "analyst", label: "Analyst report" }, { value: "simple", label: "Plain English" }].map(m => (
              <button key={m.value} style={buttonGroupStyle(form.languageMode === m.value)}
                onClick={() => setForm({ ...form, languageMode: m.value })}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Existing holdings */}
        <div>
          <label style={labelStyle}>Existing holdings — optional</label>
          <input
            style={inputStyle}
            placeholder="e.g. TCS, HDFC Bank, Reliance (comma separated)"
            value={form.existingHoldings}
            onChange={e => setForm({ ...form, existingHoldings: e.target.value })}
            onFocus={e => e.target.style.borderColor = "var(--accent-blue)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
            Enables sector concentration check against your current portfolio
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "0.75rem 1rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid var(--accent-pass)",
            borderRadius: "8px",
            color: "var(--accent-pass)",
            fontSize: "0.875rem",
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "1rem",
            background: loading ? "var(--bg-card-hover)" : "var(--accent-blue)",
            color: "var(--text-primary)",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            letterSpacing: "0.01em",
          }}
        >
          {loading ? "Researching… this takes 30-60 seconds" : "Research this stock →"}
        </button>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Analysis covers fundamentals, technicals, news & macro, bull/bear debate, and a personalized verdict
        </p>
      </div>

      {/* Example companies */}
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          Try these
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
          {["Reliance Industries", "TCS", "HDFC Bank", "Infosys", "NTPC", "ITC", "Apple", "Zomato"].map(name => (
            <button key={name}
              onClick={() => setForm({ ...form, companyName: name })}
              style={{
                padding: "0.4rem 0.85rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.target.style.borderColor = "var(--accent-blue)";
                e.target.style.color = "var(--text-primary)";
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.color = "var(--text-secondary)";
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}