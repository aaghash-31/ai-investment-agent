"use client";
import "./globals.css";

const links = [
  { label: "Research", href: "/" },
  { label: "Track Record", href: "/track-record" },
  { label: "Paper Trades", href: "/paper-trades" },
  { label: "Watchlist", href: "/watchlist" },
];

const navStyle = {
  borderBottom: "1px solid var(--border)",
  padding: "1rem 2rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  position: "sticky",
  top: 0,
  zIndex: 50,
  background: "rgba(10,15,30,0.95)",
  backdropFilter: "blur(8px)",
};

const linkStyle = {
  color: "var(--text-secondary)",
  textDecoration: "none",
  fontSize: "0.875rem",
  fontWeight: 500,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>InvestIQ</title>
        <meta name="description" content="AI Investment Research Agent" />
      </head>
      <body>
        <nav style={navStyle}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "1.4rem",
              fontWeight: 900,
              color: "var(--text-primary)",
            }}>
              Invest<span style={{ color: "var(--accent-cautious-buy)" }}>IQ</span>
            </span>
          </a>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {links.map((link) => (
              <a key={link.href} href={link.href} style={linkStyle}>
                {link.label}
              </a>
            ))}
          </div>
        </nav>
        <main style={{ minHeight: "calc(100vh - 65px)" }}>
          {children}
        </main>
        <footer style={{
          borderTop: "1px solid var(--border)",
          padding: "1.5rem 2rem",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.75rem",
        }}>
          InvestIQ is not a registered investment advisor. All analysis is for informational purposes only.
        </footer>
      </body>
    </html>
  );
}