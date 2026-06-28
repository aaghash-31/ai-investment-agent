// lib/confidence.js
// Computes confidence score from signal agreement/disagreement
// This is what makes confidence meaningful rather than hardcoded

export function computeConfidence({
  bullStrength,
  bearStrength,
  faScore,
  taScore,
  newsScore,
  dataCompleteness, // 0-1, fraction of fields that were populated
  missingNodeCount, // how many nodes failed/skipped
}) {
  // ── 1. Bull/Bear agreement (0-30 points) ──────────────
  // Close scores = high disagreement = lower confidence
  // Far apart scores = clear signal = higher confidence
  const bullBearDiff = Math.abs((bullStrength || 5) - (bearStrength || 5));
  const agreementScore = (bullBearDiff / 10) * 30; // 0-30

  // ── 2. Signal alignment across FA/TA/News (0-30 points)
  // All three pointing same direction = high confidence
  const scores = [faScore, taScore, newsScore].filter((s) => s != null);
  let alignmentScore = 15; // default neutral

  if (scores.length >= 2) {
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance =
      scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    // Low std deviation = signals agree = high alignment score
    alignmentScore = Math.max(0, 30 - stdDev * 4);
  }

  // ── 3. Data completeness (0-25 points) ────────────────
  const completenessScore = (dataCompleteness || 0.5) * 25;

  // ── 4. Node coverage (0-15 points) ────────────────────
  // Penalize for nodes that failed/skipped
  const nodePenalty = missingNodeCount * 5;
  const coverageScore = Math.max(0, 15 - nodePenalty);

  // ── Total: 0-100 ──────────────────────────────────────
  const raw = agreementScore + alignmentScore + completenessScore + coverageScore;
  const total = Math.min(100, Math.max(0, Math.round(raw)));

  return {
    total,
    breakdown: {
      bullBearAgreement: Math.round(agreementScore),
      signalAlignment: Math.round(alignmentScore),
      dataCompleteness: Math.round(completenessScore),
      nodeCoverage: Math.round(coverageScore),
    },
  };
}

// ─────────────────────────────────────────────────────────
// Compute what fraction of expected fields are populated
// ─────────────────────────────────────────────────────────
export function computeDataCompleteness(fundamentals, technical, newsAndMacro) {
  const checks = [
    fundamentals.netMargin,
    fundamentals.roe,
    fundamentals.debtToEquity,
    fundamentals.currentRatio,
    fundamentals.trailingPE,
    fundamentals.operatingCashFlow,
    technical.rsi14,
    technical.ma50,
    technical.maSignal,
    technical.support,
    technical.resistance,
    newsAndMacro.sentimentScore,
    newsAndMacro.macroRiskLevel,
  ];

  const populated = checks.filter((v) => v != null && v !== "unknown").length;
  return populated / checks.length;
}

// ─────────────────────────────────────────────────────────
// Map numeric confidence to a human label
// ─────────────────────────────────────────────────────────
export function confidenceLabel(score) {
  if (score >= 75) return "high";
  if (score >= 50) return "moderate";
  if (score >= 30) return "low";
  return "very_low";
}