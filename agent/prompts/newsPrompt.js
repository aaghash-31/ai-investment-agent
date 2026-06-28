// agent/prompts/newsPrompt.js

export function buildNewsPrompt(company, companyArticles, macroData) {
  const articleList = companyArticles
    .slice(0, 8)
    .map(
      (a, i) =>
        `${i + 1}. [${formatDate(a.date)}] ${a.title} — ${a.source}`
    )
    .join("\n");

  const macroArticleList = macroData.articles
    .slice(0, 6)
    .map(
      (a, i) =>
        `${i + 1}. [${formatDate(a.date)}] ${a.title} — ${a.source}`
    )
    .join("\n");

  const sensitivities = macroData.macroTopics.sensitivities.join("\n- ");

  return `
You are a senior investment analyst evaluating recent news and macroeconomic context.

COMPANY: ${company.resolvedName} (${company.ticker})
SECTOR: ${company.sector} | INDUSTRY: ${company.industry}

═══ COMPANY-SPECIFIC NEWS (most recent first) ═══
${articleList || "No company-specific news found."}

═══ MACRO / GEOPOLITICAL NEWS ═══
${macroArticleList || "No macro news found."}

═══ KNOWN SECTOR MACRO SENSITIVITIES ═══
This sector (${company.sector}) is typically sensitive to:
- ${sensitivities}

YOUR TASKS:

1. Analyze the company-specific news sentiment:
   - Is coverage improving, deteriorating, or neutral over time?
   - Are there any major positive or negative events (earnings, leadership, legal, regulatory)?

2. Analyze the macro/geopolitical news:
   - Are any of the active macro events likely to materially affect this company?
   - Quantify the impact where possible (e.g., "every $10 rise in crude = ~X% margin pressure")

3. Identify key news flags — specific items an investor must know.

Respond ONLY in this exact JSON format, no other text:
{
  "sentimentScore": <number from -1.0 (very negative) to +1.0 (very positive)>,
  "sentimentTrend": "<improving|deteriorating|neutral|mixed>",
  "companySentimentSummary": "<2 sentences summarising the company's news picture>",
  "keyNewsFlags": [
    "<specific important item 1 — positive or negative>",
    "<specific important item 2>"
  ],
  "activeMacroEvents": [
    "<macro event 1 that is currently relevant>",
    "<macro event 2>"
  ],
  "macroImpactOnCompany": "<2-3 sentences: which macro events affect this company and how, with specific impact if possible>",
  "macroRiskLevel": "<high|medium|low>",
  "overallNewsScore": <number 0-10, where 10 = very positive news environment>,
  "analystNotes": "<3-4 sentence combined news + macro assessment for an analyst report>",
  "simpleExplanation": "<same in plain English for a beginner investor, 2 sentences>"
}
`;
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}