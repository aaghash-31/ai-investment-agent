// agent/prompts/preMortemPrompt.js

export function buildPreMortemPrompt(company, fundamentals, technical, newsAndMacro, bullCase, bearCase) {
  return `
You are conducting a pre-mortem analysis on a potential investment.
A pre-mortem assumes the investment HAS BEEN MADE and asks: "If this goes wrong in 6-12 months, what is the most likely reason?"
This is different from the bear case — you are not arguing against investing, you are stress-testing the investment AFTER the decision.

COMPANY: ${company.resolvedName} (${company.ticker})
SECTOR: ${company.sector}
CURRENT PRICE: ${company.currentPrice}

BULL CASE STRENGTH: ${bullCase.strengthScore}/10
Bull arguments: ${bullCase.arguments?.slice(0, 3).join(" | ")}

BEAR CASE STRENGTH: ${bearCase.strengthScore}/10
Bear risk factors: ${bearCase.riskFactors?.slice(0, 3).join(" | ")}

KEY DATA POINTS:
- FA Score: ${fundamentals.score}/10 | Gate: ${fundamentals.gateResult}
- TA Signal: ${technical.signal} | SMC: ${technical.smc?.marketStructure}
- News Sentiment: ${newsAndMacro.sentimentScore} (${newsAndMacro.sentimentTrend})
- Macro Risk: ${newsAndMacro.macroRiskLevel}
- Active Macro Events: ${newsAndMacro.activeMacroEvents?.join(", ") || "None"}
- Governance Flags: ${fundamentals.governanceFlags?.join(", ") || "None"}
- Cash Flow Quality: ${fundamentals.cashFlowQualityFlag}

YOUR TASK:
Assume the investment was made today. Looking forward 6-12 months:
1. What is the single most likely reason this investment fails?
2. What are the early warning signals that would confirm things are going wrong?
3. What is the failure probability given what we know?

Be specific to this company and sector — avoid generic answers like "market downturn."

Respond ONLY in this exact JSON format, no other text:
{
  "assumedAction": "buy",
  "mostLikelyFailureMode": "<specific, company-relevant failure scenario in 1-2 sentences>",
  "secondaryFailureMode": "<second most likely failure scenario>",
  "earlyWarningSignals": [
    "<specific metric or event to watch — signal 1>",
    "<signal 2>",
    "<signal 3>"
  ],
  "whatWouldChangeVerdict": [
    "<specific condition that would turn this into a clear buy — e.g. 'D/E drops below 0.5'>",
    "<another condition>",
    "<another condition>"
  ],
  "failureProbability": "<high|medium|low>",
  "timeHorizon": "6-12 months",
  "summary": "<3-4 sentence pre-mortem paragraph — what to watch, what could go wrong, how to detect it early>",
  "simpleExplanation": "<same in plain English for a beginner, 2 sentences>"
}
`;
}