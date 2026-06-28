# InvestIQ — AI Investment Research Agent

> An autonomous multi-agent investment research system built with LangGraph.js and Next.js. Analyzes companies across fundamental, technical, news/macro, and governance dimensions — then synthesizes everything into one honest, confidence-calibrated verdict personalized for the investor.

**Live demo:** https://ai-investment-agent-beta.vercel.app/

---

## Overview

InvestIQ takes a company name and runs it through a 9-node LangGraph pipeline that mirrors how a real equity analyst thinks — fundamentals first, then timing, then context, then debate, then a synthesized verdict personalized for the user's capital and risk profile.

It is designed to be useful for everyone from a student investing ₹1,000 to someone deploying ₹1 crore — same underlying research, different framing.

---

## Pipeline

```
Company Name
     ↓
[Node 1] Company Resolution      — name → ticker, handles ambiguity via LLM disambiguation
     ↓
[Node 2] Fundamental Analysis    — margins, debt, cash flow, valuation, governance (soft gate)
     ↓
[Node 3] Technical Analysis      — MA/EMA, RSI, volume, SMC (market structure, CHoCH, liquidity zones)
     ↓
[Node 4] News & Macro            — sentiment trend + geopolitical events → sector impact mapping
     ↓
[Node 5] Bull Case               — strongest honest arguments for investing
[Node 6] Bear Case               — strongest honest arguments against
[Node 7] Pre-Mortem              — assumes investment made, asks what most likely breaks it
     ↓
[Node 8] Synthesis & Confidence  — computed confidence from signal agreement + data quality
     ↓
[Node 9] Personalization         — reframes verdict for user's capital, risk, goal, holdings
     ↓
Verdict + Full Report
```

---

## Features

-  **9-Node LangGraph Pipeline** — structured multi-step reasoning, not a single prompt
-  **Fundamental Analysis** — revenue growth, margins, ROE/ROCE, debt ratios, cash flow quality, promoter holding (India-specific via Screener.in)
-  **Technical Analysis** — MA/EMA crossovers, RSI (Wilder's smoothing), volume confirmation, support/resistance
-  **Smart Money Concepts** — market structure (bullish/bearish/ranging), Break of Structure (BOS), Change of Character (CHoCH), liquidity zones — labeled as supplementary timing lens
-  **News & Macro Layer** — sentiment trend + geopolitical events mapped to sector sensitivities (crude oil, RBI policy, USD/INR, H-1B, etc.)
-  **Bull/Bear Debate** — independent cases argued before synthesis, not averaged
-  **Pre-Mortem** — stress-tests the investment assuming it was already made
-  **Computed Confidence Score** — derived from bull/bear disagreement, signal alignment, and data completeness — not hardcoded
-  **Capital-Aware Personalization** — affordability, position sizing, liquidity flags, concentration checks against existing holdings
-  **Peer-Relative Scoring** — metrics judged against sector context, not hardcoded universal thresholds
-  **Paper Trading** — log calls at verdict time, track hypothetical P&L
-  **Watchlist** — save companies, re-research with one click
-  **Append-Only Track Record** — every verdict logged permanently, wins and losses, nothing hidden
-  **Plain English Mode** — same analysis, beginner-friendly language

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19 |
| Agent Framework | LangGraph.js |
| LLM (primary) | Groq — Llama 3.3 70B Versatile |
| LLM (fallback) | Google Gemini 2.0 Flash Lite |
| Financial Data | yahoo-finance2 (prices + fundamentals) |
| India Governance | Screener.in (promoter holding, pledged shares) |
| News | NewsAPI, Guardian API, Google News RSS |
| Database | Turso (production) / libsql local SQLite (development) |
| Deployment | Vercel |

---

## How to Run

### Prerequisites
- Node.js 18+
- API keys (see `.env.example`)

### Local Development

```bash
git clone https://github.com/yourusername/ai-investment-agent
cd ai-investment-agent
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

Open http://localhost:3000 — local development uses file-based SQLite automatically, no Turso setup needed.

### API Keys Required

| Key | Where to get | Free tier |
|---|---|---|
| `GROQ_API_KEY` | console.groq.com | 100k tokens/day |
| `GOOGLE_API_KEY` | aistudio.google.com | 15 RPM |
| `NEWS_API_KEY` | newsapi.org | 100 req/day |
| `GUARDIAN_API_KEY` | open-platform.theguardian.com | 5000 req/day |

### Production Deployment (Vercel + Turso)

**1. Set up Turso (free database, no credit card):**
```bash
npm install -g turso
turso auth login
turso db create investiq
turso db show investiq --url      # → TURSO_DATABASE_URL
turso db tokens create investiq   # → TURSO_AUTH_TOKEN
```

**2. Deploy:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**3. Add environment variables on Vercel dashboard (Settings → Environment Variables):**

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `GOOGLE_API_KEY` | Your Google Gemini API key |
| `NEWS_API_KEY` | Your NewsAPI.org key |
| `GUARDIAN_API_KEY` | Your Guardian API key |
| `TURSO_DATABASE_URL` | `libsql://investiq-yourusername.turso.io` |
| `TURSO_AUTH_TOKEN` | Token from `turso db tokens create` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

---

## How It Works

### Node 1 — Company Resolution
Resolves a plain text company name to a confirmed stock ticker. Tries direct Indian ticker guesses first (fast path for well-known companies like RELIANCE.NS, TCS.NS). Falls back to Yahoo Finance search + LLM disambiguation for ambiguous names. Short names (≤6 chars like "Tata", "HDFC") always go through LLM confirmation even when only one candidate is found. Handles partial names, abbreviations, typos, and multi-word company names.

### Node 2 — Fundamental Analysis
Fetches financial data from Yahoo Finance. Computes revenue growth, margins, ROE/ROCE, debt ratios, cash flow quality, and valuation multiples. For Indian stocks, scrapes Screener.in for promoter holding percentage, trend, and pledged shares percentage. A soft gate evaluates FA score — failing companies still proceed but are flagged loudly rather than silently skipped, since TA/news context may still be useful. All metrics are evaluated relative to sector context, not fixed universal thresholds.

### Node 3 — Technical Analysis + SMC
Fetches 250 days of OHLCV data from Yahoo Finance. Computes:
- **Classical indicators:** 20/50/200-day MA, EMA crossovers, RSI (Wilder's 14-period smoothing), MACD, volume trend, support/resistance levels, linear trend direction
- **Smart Money Concepts (supplementary):** swing high/low detection, market structure classification (bullish/bearish/ranging), Break of Structure (BOS), Change of Character (CHoCH) detection, liquidity zone mapping

SMC is explicitly labeled as a supplementary timing signal in both the code and UI — not given equal weight to classical indicators or fundamentals.

### Node 4 — News & Macro
Fetches company-specific news (NewsAPI + Google News RSS fallback) and macro/geopolitical news (Guardian API). Each sector has a predefined sensitivity map — energy companies are mapped to crude oil/OPEC/Strait of Hormuz events, IT companies to USD/INR and US tech spending/H-1B, banks to RBI policy and credit growth, etc. LLM evaluates sentiment trend (not just snapshot) and quantifies macro impact where possible (e.g., "every $10 rise in crude = ~2-3% margin pressure").

### Nodes 5-7 — Bull / Bear / Pre-Mortem
Three separate LLM calls with different objectives. Bull argues the strongest honest case for investing using specific data points. Bear argues the strongest honest case against. Pre-Mortem is distinct from the bear case — it assumes the investment was already made and asks what most likely breaks it in 6-12 months, producing specific early warning signals to monitor.

### Node 8 — Synthesis & Confidence
Combines all signals into a final verdict (buy / cautious_buy / hold / cautious_pass / pass). Confidence is computed from four components: bull/bear disagreement (equal strength = lower confidence), signal alignment across FA/TA/News, data completeness (fraction of expected fields populated), and node coverage (penalizes for failed nodes). The confidence score is computed, not hardcoded — a genuinely contested analysis produces a lower score than a clearly one-sided one.

### Node 9 — Personalization
Reframes the same underlying verdict for the specific user. Computes shares affordable at their investment amount, flags liquidity risk for large positions relative to average daily volume, checks sector concentration against existing holdings, surfaces dividend yield for income-goal users, and produces a plain-English version if requested. Same research, different useful framing.

---

## Key Decisions & Trade-offs

| Decision | Rationale | What was left out |
|---|---|---|
| Sequential pipeline (not fully parallel) | Each node benefits from prior context; easier to debug node-by-node | Parallel FA+TA would be ~40% faster but loses gating logic |
| Soft FA gate (not hard block) | A company failing fundamentals still has useful TA/news context | Hard blocking would miss recovery situations |
| Computed confidence (not hardcoded) | Confidence should reflect actual signal disagreement, not an assumption | Bayesian methods would be more statistically rigorous |
| LLM for ratio evaluation | Enables sector-relative judgment vs hardcoded thresholds | More LLM calls = higher latency and token cost |
| yahoo-finance2 for data | Free, no API key, supports NSE/BSE globally | Deprecated financial statement modules since Nov 2024 limit some ratios |
| Screener.in scraping for governance | Best freely available source for Indian promoter holding data | Fragile to site structure changes; no official API |
| SMC as supplementary, not primary | Pattern-based, more relevant for timing than valuation; honest about limitations | Full multi-timeframe SMC engine would require significantly more work |
| Groq primary, Gemini fallback | Groq is fast and free; Gemini adds resilience on rate limit | Both have daily free limits; production would need paid tier |
| Turso over Postgres | SQLite-compatible (zero query syntax changes from local dev), generous free tier | Postgres would be more robust at scale |
| Append-only track record | Prevents cherry-picking; only credible if all outcomes are shown | Needs elapsed time for outcomes to mature — not useful on day 1 |

---

## Example Runs

### TCS (Tata Consultancy Services)
**Verdict:** CAUTIOUS BUY | **Confidence:** 62/100 (moderate)
- FA 8.5/10 — strong operating margins (25.3%), high ROE (48.4%), low debt (D/E 0.05), promoter holding 73%
- TA 4.5/10 — approaching oversold RSI (32.7), EMA bearish, SMC bearish structure
- News 4/10 — Accenture earnings miss creating IT sector headwinds, USD/INR risk
- Short-term: Hold | Long-term: Cautious Buy
- Key conflict: exceptional fundamentals vs bearish technicals and macro uncertainty
- Pre-mortem: "Sustained US tech spending decline leads to revenue miss for 2+ consecutive quarters"

### HDFC Bank
**Verdict:** CAUTIOUS PASS | **Confidence:** 61/100 (moderate)
- FA 6.5/10 — strong operating margins but negative revenue growth YoY, concerning cash flow
- TA 6.5/10 — neutral RSI, bearish SMC structure
- News 4/10 — RBI policy uncertainty, NPA risk from credit cycle
- Short-term: Pass | Long-term: Cautious Buy
- Notable: equal bull/bear strength (8/8) correctly lowered confidence and produced a cautious verdict rather than a forced one
- Early warning signals: RBI repo rate above 6.5%, NPA ratio above 2.5%, credit growth below 10%

### Dixon Technologies
**Verdict:** CAUTIOUS BUY | **Confidence:** 70/100 (moderate)
- FA 7.4/10 — 25.8% revenue growth, stable promoter holding (38.9%), reasonable debt
- TA 7.5/10 — bullish SMC structure, EMA bullish signal, RSI neutral
- News 8/10 — Vivo JV approval flagged as specific ₹30,000 Cr upside catalyst; PLI scheme tailwind
- Short-term: Hold | Long-term: Cautious Buy
- Notable: news node correctly identified a specific company catalyst (not generic sector noise)

---

## What I Would Improve With More Time

1. **`fundamentalsTimeSeries` migration** — Yahoo Finance deprecated financial statement modules in Nov 2024. Migrating would restore ROCE, interest coverage, and full revenue history.

2. **Full SMC engine** — Current implementation covers market structure, BOS, CHoCH, and liquidity zones. A proper multi-timeframe engine with order blocks and Fair Value Gaps would be more rigorous.

3. **Live Track Record outcomes** — The track record logs every verdict permanently. A Vercel Cron job refreshing prices at 30/90 day checkpoints would show whether each call was correct — the accountability feature needs elapsed time to be meaningful.

4. **Narrative-vs-numbers mismatch detection** — Compare management tone in earnings calls against actual reported numbers. A reliable red flag for accounting concerns. Not built due to earnings transcript data availability constraints.

5. **Portfolio-level analysis** — Currently analyzes one stock at a time. A portfolio view showing sector concentration, correlation, and aggregate risk would be genuinely useful.

6. **Paid LLM tier** — Free Groq/Gemini limits are exhausted quickly during intensive testing. Production needs a paid tier or a smarter request queue with caching.

7. **Formal eval harness** — Systematic evaluation of verdict quality against known outcomes, rather than manual review.

8. **Regional language support** — Hindi output would make this genuinely accessible to a much larger Indian retail investor base — very relevant for InsideIIM's audience.

---

## Known Limitations

- Yahoo Finance deprecated financial statement modules in Nov 2024 — some ratios (ROCE, interest coverage) show N/A
- Free LLM tier daily limits can be exhausted during intensive testing
- Screener.in scraping is fragile to HTML structure changes
- SQLite on local dev, Turso in production — data does not sync between environments
- SMC signals are pattern-based and subjective — labeled as supplementary, not primary
- Not financial advice — all analysis is for informational purposes only

---

## Project Structure

```
ai-investment-agent/
├── agent/
│   ├── graph.js                  # LangGraph pipeline — all 9 nodes wired
│   ├── nodes/                    # One file per node
│   │   ├── companyResolution.js
│   │   ├── fundamentalAnalysis.js
│   │   ├── technicalAnalysis.js
│   │   ├── newsAndMacro.js
│   │   ├── bullCase.js
│   │   ├── bearCase.js
│   │   ├── preMortem.js
│   │   ├── synthesis.js
│   │   └── personalization.js
│   ├── tools/                    # Data fetchers
│   │   ├── companyLookup.js      # Yahoo Finance search + resolution
│   │   ├── financialData.js      # Fundamentals + Screener.in
│   │   ├── priceData.js          # OHLCV + indicators + SMC
│   │   └── newsData.js           # NewsAPI + Guardian + RSS
│   ├── prompts/                  # LLM prompt templates (one per node)
│   ├── state/
│   │   └── investmentState.js    # LangGraph state schema
│   └── lib/
│       ├── db.js                 # Turso/SQLite database layer
│       └── llm.js                # Groq → Gemini fallback provider
├── app/
│   ├── api/
│   │   ├── agent/run/route.js    # POST — triggers full 9-node pipeline
│   │   ├── paper-trade/route.js  # POST/GET — paper trading
│   │   ├── track-record/route.js # GET — analysis history
│   │   └── watchlist/route.js    # POST/GET/DELETE
│   ├── page.jsx                  # Home — research input form
│   ├── report/[sessionId]/       # Full tabbed report view
│   ├── paper-trades/             # Paper trades dashboard
│   ├── track-record/             # Accountability log
│   └── watchlist/                # Saved companies
├── lib/
│   └── confidence.js             # Confidence score computation
├── tests/                        # Node-by-node test scripts
│   ├── testNode1.js through testNode8.js
│   ├── testFull.js               # End-to-end pipeline test
│   └── testFinal.js              # Validation with different parameters
└── .env.example                  # Key template (safe to commit)
```

---

## LLM Chat Session Transcript

This project was built in collaboration with Claude (Anthropic). The full conversation transcript — covering architecture decisions, feature ideation, node-by-node implementation, debugging, and design choices — is available at:

https://claude.ai/share/7605dac9-d2da-4bba-b8d6-142005b7ba6c

This transcript demonstrates the thought process, trade-off reasoning, and iterative debugging approach used throughout the build.
