import { type RiskLevel } from '@/shared/types/riskLevel';

// Diminishing-returns curve (§8): one severe flag shouldn't need ten more to
// hit 100, and the score should never quite saturate except under extreme totals.
const SATURATION_CONSTANT = 40;

export function computeRiskScore(totalWeight: number): number {
  const clampedWeight = Math.max(totalWeight, 0);
  const raw = 100 * (1 - Math.exp(-clampedWeight / SATURATION_CONSTANT));
  return Math.round(Math.min(100, Math.max(0, raw)));
}

// Bands per §8: 0-24 low, 25-49 medium, 50-74 high, 75-100 critical.
export function computeRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= 75) return 'critical';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'medium';
  return 'low';
}
