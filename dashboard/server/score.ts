// Business score (1–100) and pricing tier. Pure functions — covered by score.test.ts.
// Every point is explained so the owner can see WHY a lead got its score.

export type PriceLevel = 'FREE' | 'INEXPENSIVE' | 'MODERATE' | 'EXPENSIVE' | 'VERY_EXPENSIVE' | null;
export type Tier = 'standard' | 'premium' | 'luxury';

export interface ScoreInput {
  rating: number | null;
  reviewCount: number | null;
  priceLevel: PriceLevel;
  photoCount: number;
  /** Set by deep analysis in Phase 3. null = not analysed yet (scores 0, never guessed). */
  premiumArea: boolean | null;
  branchCount: number;
}

export interface ScoreReason { label: string; points: number; max: number; detail: string }

export function ratingPoints(rating: number | null): number {
  if (rating == null) return 0;
  if (rating >= 4.7) return 25;
  if (rating >= 4.5) return 21;
  if (rating >= 4.2) return 16;
  if (rating >= 4.0) return 12;
  if (rating >= 3.5) return 7;
  return 3;
}

export function reviewPoints(count: number | null): number {
  if (!count || count <= 0) return 0;
  return Math.min(25, Math.round(8 * Math.log10(count + 1)));
}

export function pricePoints(level: PriceLevel): number {
  switch (level) {
    case 'VERY_EXPENSIVE': return 20;
    case 'EXPENSIVE': return 16;
    case 'MODERATE': return 10;
    case 'INEXPENSIVE': return 5;
    case 'FREE': return 2;
    default: return 8; // unknown: middle value, flagged in the reason text
  }
}

const PRICE_TEXT: Record<string, string> = { FREE: 'Free', INEXPENSIVE: 'Inexpensive ($)', MODERATE: 'Moderate ($$)', EXPENSIVE: 'Expensive ($$$)', VERY_EXPENSIVE: 'Very expensive ($$$$)' };

export function computeScore(i: ScoreInput): { score: number; reasons: ScoreReason[] } {
  const reasons: ScoreReason[] = [
    { label: 'Google rating', max: 25, points: ratingPoints(i.rating), detail: i.rating == null ? 'No rating yet' : `${i.rating.toFixed(1)} stars` },
    { label: 'Number of reviews', max: 25, points: reviewPoints(i.reviewCount), detail: `${i.reviewCount ?? 0} reviews` },
    { label: 'Google price level', max: 20, points: pricePoints(i.priceLevel), detail: i.priceLevel ? PRICE_TEXT[i.priceLevel] : 'Not listed on Google (middle value used)' },
    { label: 'Photos on Google', max: 10, points: Math.min(10, Math.max(0, i.photoCount)), detail: `${i.photoCount} photos (quality checked in deep analysis)` },
    { label: 'Premium area', max: 10, points: i.premiumArea ? 10 : 0, detail: i.premiumArea == null ? 'Not analysed yet (deep analysis)' : i.premiumArea ? 'Premium neighbourhood' : 'Regular neighbourhood' },
    { label: 'Multiple branches', max: 10, points: i.branchCount > 1 ? 10 : 0, detail: i.branchCount > 1 ? `${i.branchCount} locations found` : 'Single location' },
  ];
  const total = reasons.reduce((s, r) => s + r.points, 0);
  return { score: Math.max(1, Math.min(100, total)), reasons };
}

export function tierFromScore(score: number): Tier {
  if (score >= 70) return 'luxury';
  if (score >= 45) return 'premium';
  return 'standard';
}

export function parsePriceLevel(v: unknown): PriceLevel {
  if (typeof v !== 'string') return null;
  const s = v.replace('PRICE_LEVEL_', '');
  return (['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE'] as const).find((x) => x === s) ?? null;
}

/** Same business name appearing more than once = multiple branches. Case/punctuation-insensitive. */
export function branchKey(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
