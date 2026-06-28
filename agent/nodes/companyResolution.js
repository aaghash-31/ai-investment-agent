// agent/nodes/companyResolution.js
// Node 1: Resolves a company name to a confirmed ticker + profile
// Writes to: state.company, state.meta

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import {
  searchCompany,
  fetchCompanyProfile,
  buildIndianTickerGuesses,
} from "../tools/companyLookup.js";
import {
  buildDisambiguationPrompt,
  buildResolutionFailurePrompt,
} from "../prompts/companyResolutionPrompt.js";

import { getLLM } from "../lib/llm.js";
const llm = getLLM(0); // keep original temperature

export async function companyResolutionNode(state) {
  const { companyName } = state.userInput;
  const nodeStartTime = Date.now();

  console.log(`[Node 1] Resolving company: "${companyName}"`);

  try {
    const indianGuesses = buildIndianTickerGuesses(companyName);
    let resolvedTicker = null;
    let profileData = null;

    // ── CHANGE: track whether we got a direct ticker match ──
    // Used later to assign high confidence regardless of name match
    let wasDirectMatch = false;

    for (const guess of indianGuesses) {
      console.log(`[Node 1] Trying direct ticker: ${guess}`);
      const profile = await fetchCompanyProfile(guess);
      if (profile.success && profile.data.currentPrice) {
        resolvedTicker = guess;
        profileData = profile.data;
        wasDirectMatch = true; // ── CHANGE: flag set here on direct match
        console.log(`[Node 1] Direct match found: ${guess}`);
        break;
      }
    }

    if (!resolvedTicker) {
      console.log(`[Node 1] Direct guess failed, running search...`);
      const searchResult = await searchCompany(companyName);

      if (!searchResult.success || searchResult.candidates.length === 0) {
        console.log(`[Node 1] No candidates found`);
        return buildFailureState(
          state,
          companyName,
          "No matching company found. Please check the company name and try again."
        );
      }

      const { candidates } = searchResult;

      // ── CHANGE: Issue 6 fix ──────────────────────────────
      // Short/ambiguous names (≤6 chars like "Tata", "NTPC") must
      // always go through LLM even if only one candidate comes back.
      // Without this, "Tata" auto-picks the first result (TATATECH)
      // without any reasoning, which may be wrong.
      const isAmbiguousInput = companyName.trim().length <= 6;

      if (candidates.length === 1 && !isAmbiguousInput) {
        // Single candidate AND unambiguous name — safe to use directly
        console.log(`[Node 1] Single candidate: ${candidates[0].ticker}`);
        resolvedTicker = candidates[0].ticker;

      } else {
        // Multiple candidates OR short/ambiguous name — always use LLM
        const reason =
          candidates.length > 1
            ? `${candidates.length} candidates found`
            : `short/ambiguous name "${companyName}" — confirming single candidate`;

        console.log(`[Node 1] ${reason}, using LLM to disambiguate`);

        const disambiguationPrompt = buildDisambiguationPrompt(
          companyName,
          candidates
        );

        const llmResponse = await llm.invoke([
          new HumanMessage(disambiguationPrompt),
        ]);

        let parsed;
        try {
          const rawText = llmResponse.content.trim();
          const clean = rawText.replace(/```json|```/g, "").trim();
          parsed = JSON.parse(clean);
        } catch {
          console.warn(`[Node 1] LLM response parse failed, using first candidate`);
          parsed = {
            selectedIndex: 1,
            selectedTicker: candidates[0].ticker,
            confidence: "low",
            ambiguityNote: "Auto-selected first result due to parsing error",
            reasoning: "Fallback selection",
          };
        }

        resolvedTicker = parsed.selectedTicker || candidates[0].ticker;

        console.log(`[Node 1] LLM selected: ${resolvedTicker}`);
        const profile = await fetchCompanyProfile(resolvedTicker);

        if (profile.success) {
          profileData = profile.data;
        } else {
          console.warn(
            `[Node 1] Profile fetch failed for ${resolvedTicker}, falling back`
          );
          const fallback = await fetchCompanyProfile(candidates[0].ticker);
          if (fallback.success) {
            resolvedTicker = candidates[0].ticker;
            profileData = fallback.data;
          } else {
            return buildFailureState(
              state,
              companyName,
              "Found company but could not fetch profile data."
            );
          }
        }
      }
    }

    if (resolvedTicker && !profileData) {
      const profile = await fetchCompanyProfile(resolvedTicker);
      if (profile.success) {
        profileData = profile.data;
      } else {
        return buildFailureState(
          state,
          companyName,
          `Could not fetch data for ${resolvedTicker}`
        );
      }
    }

    // ── CHANGE: Issue 7 fix ──────────────────────────────
    // Pass wasDirectMatch so direct hits always get high confidence
    // regardless of whether the input string matches the full company name
    // (e.g. "TCS" input vs "Tata Consultancy Services Limited" resolved name
    // would previously score "low" because the strings don't substring-match)
    const resolutionConfidence = determineConfidence(
      companyName,
      profileData.resolvedName,
      wasDirectMatch // ── CHANGE: new third argument
    );

    console.log(
      `[Node 1] ✓ Resolved "${companyName}" → ${resolvedTicker} (${resolutionConfidence} confidence) in ${Date.now() - nodeStartTime}ms`
    );

    return {
      company: {
        resolvedName: profileData.resolvedName,
        ticker: resolvedTicker,
        exchange: profileData.exchange,
        currency: profileData.currency,
        sector: profileData.sector || "Unknown",
        industry: profileData.industry || "Unknown",
        country: profileData.country || "India",
        description: profileData.description,
        marketCap: profileData.marketCap,
        marketCapFormatted: profileData.marketCapFormatted,
        currentPrice: profileData.currentPrice,
        previousClose: profileData.previousClose,
        priceChange: profileData.priceChange,
        priceChangePct: profileData.priceChangePct,
        fiftyTwoWeekHigh: profileData.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: profileData.fiftyTwoWeekLow,
        avgVolume: profileData.avgVolume,
        beta: profileData.beta,
        sharesOutstanding: profileData.sharesOutstanding,
        isIndian: profileData.isIndian,
        isResolved: true,
        resolutionConfidence,
        ambiguityNote: "",
        priceAsOf: profileData.priceAsOf,
      },
      meta: {
        ...state.meta,
        nodesCompleted: [
          ...(state.meta.nodesCompleted || []),
          "companyResolution",
        ],
      },
    };
  } catch (error) {
    console.error(`[Node 1] Unexpected error:`, error);
    return buildFailureState(state, companyName, error.message);
  }
}

function buildFailureState(state, companyName, errorMessage) {
  return {
    company: {
      resolvedName: companyName,
      ticker: "",
      exchange: "",
      sector: "",
      industry: "",
      marketCap: null,
      currentPrice: null,
      isResolved: false,
      resolutionConfidence: "low",
      ambiguityNote: errorMessage,
      priceAsOf: new Date().toISOString(),
    },
    meta: {
      ...state.meta,
      nodeErrors: [
        ...(state.meta.nodeErrors || []),
        { node: "companyResolution", error: errorMessage },
      ],
    },
  };
}

// ── CHANGE: Issue 7 fix — added wasDirectMatch parameter ──
// Direct ticker matches always get high confidence regardless of
// how different the input string looks from the resolved full name
function determineConfidence(userInput, resolvedName, wasDirectMatch = false) {
  // Direct ticker match always gets high confidence
  if (wasDirectMatch) return "high";

  if (!resolvedName) return "low";

  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const inputNorm = normalize(userInput);
  const resolvedNorm = normalize(resolvedName);

  if (resolvedNorm.includes(inputNorm) || inputNorm.includes(resolvedNorm)) {
    return "high";
  }

  const inputFirstWord = normalize(userInput.split(" ")[0]);
  if (resolvedNorm.includes(inputFirstWord) && inputFirstWord.length > 3) {
    return "medium";
  }

  return "low";
}