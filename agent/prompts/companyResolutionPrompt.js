// agent/prompts/companyResolutionPrompt.js
// LLM prompt used when multiple ticker candidates are found
// and we need the model to pick the most likely one

export function buildDisambiguationPrompt(userInput, candidates) {
  return `
You are a financial data assistant helping resolve a company name to the correct stock ticker.

The user searched for: "${userInput}"

The following candidate matches were found:
${candidates
  .map(
    (c, i) =>
      `${i + 1}. Name: ${c.name} | Ticker: ${c.ticker} | Exchange: ${c.exchange} | Sector: ${c.sector}`
  )
  .join("\n")}

Your task:
1. Pick the single most likely match for what the user intended.
2. Prefer Indian exchange listings (NSE: .NS, BSE: .BO) if the company is Indian.
3. Prefer the primary listing over subsidiaries or group companies.
4. If the name is genuinely ambiguous (e.g., "Tata" could be many companies), flag it.

Respond ONLY in this exact JSON format, no other text:
{
  "selectedIndex": <number, 1-based index from the list above>,
  "selectedTicker": "<ticker string>",
  "confidence": "<high|medium|low>",
  "ambiguityNote": "<empty string if clear match, otherwise explain the ambiguity briefly>",
  "reasoning": "<one sentence explaining why you picked this match>"
}
`;
}

export function buildResolutionFailurePrompt(userInput) {
  return `
The user searched for a company named: "${userInput}"
No valid stock ticker matches were found in the database.

Respond ONLY in this exact JSON format:
{
  "isKnownCompany": <true if this is a real but possibly private/delisted company, false if unknown>,
  "suggestion": "<suggest a corrected name or similar listed company if applicable, or empty string>",
  "reason": "<brief explanation of why no match was found>"
}
`;
}