// app/watchlist/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WatchlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchWatchlist = () => {
    fetch("/api/watchlist")
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchWatchlist(); }, []);

  const handleRemove = async (ticker) => {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    fetchWatchlist();
  };

  const handleReResearch = (companyName) => {
    router.push(`/?company=${encodeURIComponent(companyName)}`);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Watchlist
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Companies you're tracking. Re-research any of them to get a fresh verdict.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          Loading watchlist...
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>◎</p>
          <p style={{ color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.5rem" }}>
            Your watchlist is empty
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            After running an analysis, click "+ Watchlist" on the report page to save a company here.
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.2rem" }}>
                  {item.company_name}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {item.ticker} · Added {new Date(item.added_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => handleReResearch(item.company_name)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    background: "var(--accent-blue)",
                    color: "white", border: "none",
                    borderRadius: "6px", cursor: "pointer",
                    fontSize: "0.8rem", fontWeight: 600,
                  }}
                >
                  Re-research
                </button>
                <button
                  onClick={() => handleRemove(item.ticker)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    background: "var(--bg-primary)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px", cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}