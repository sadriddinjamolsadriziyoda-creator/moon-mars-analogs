import {
  CRITERION_IDS,
  MINERAL_KEYS,
  type Comparator,
  type Criterion,
  type CriterionId,
  type CriterionScore,
  type FeatureScore,
  type MineralVector,
  type SimilarityResult,
  type Site,
} from './types';

const UNIFORM_WEIGHT = 1 / CRITERION_IDS.length;

const NEUTRAL_MISSING = 0.5;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Same implementation serves the browser bundle and the API, so the number a judge
 * sees on the radar chart is the number the endpoint returns. See docs/methodology.md.
 */

export function normalizeWeights(
  weights: Partial<Record<CriterionId, number>> | undefined,
  defaults: Criterion[],
): Record<CriterionId, number> {
  const byId = new Map(defaults.map((criterion) => [criterion.id, criterion.weight]));
  const raw: Record<CriterionId, number> = { ...({} as Record<CriterionId, number>) };
  let total = 0;

  for (const id of CRITERION_IDS) {
    const candidate = weights?.[id];
    const base = typeof candidate === 'number' && Number.isFinite(candidate)
      ? candidate
      : byId.get(id);
    const value = typeof base === 'number' && Number.isFinite(base) && base > 0 ? base : 0;
    raw[id] = value;
    total += value;
  }

  if (total <= 0) {
    for (const id of CRITERION_IDS) raw[id] = UNIFORM_WEIGHT;
    return raw;
  }

  const result = {} as Record<CriterionId, number>;
  let assigned = 0;
  CRITERION_IDS.forEach((id, index) => {
    if (index === CRITERION_IDS.length - 1) {
      result[id] = Math.max(0, 1 - assigned);
      return;
    }
    result[id] = raw[id] / total;
    assigned += result[id];
  });
  return result;
}

function readFeature(
  vector: Partial<Record<CriterionId, FeatureScore>> | undefined,
  id: CriterionId,
): number | undefined {
  const value = vector?.[id]?.value;
  return typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : undefined;
}

function cosineMineralogy(
  site: MineralVector | undefined,
  target: MineralVector | undefined,
): number | undefined {
  if (!site || !target) return undefined;

  let dot = 0;
  let siteNormSq = 0;
  let targetNormSq = 0;
  for (const key of MINERAL_KEYS) {
    const a = site[key];
    const b = target[key];
    const x = typeof a === 'number' && Number.isFinite(a) && a > 0 ? a : 0;
    const y = typeof b === 'number' && Number.isFinite(b) && b > 0 ? b : 0;
    dot += x * y;
    siteNormSq += x * x;
    targetNormSq += y * y;
  }

  if (siteNormSq <= 0 || targetNormSq <= 0) return undefined;
  // Clamp: floating point can return 1.0000000000000002, and a hair below zero
  // would draw a negative bar on the radar chart.
  return clamp01(dot / Math.sqrt(siteNormSq * targetNormSq));
}

type CriterionReading = { raw: number; similarity: number; measured: boolean };

function readCriterion(
  id: CriterionId,
  site: Site,
  target: Comparator,
  criterion: Criterion | undefined,
): CriterionReading {
  // Linear ramp rather than exp(-d/k): one sentence explains it to a schoolkid
  // and an editor can recalibrate it by hand from the methodology page.
  if (id === 'geology') {
    const cosine = cosineMineralogy(site.geologyMaterials, target.geologyMaterials);
    if (cosine === undefined) {
      return { raw: NEUTRAL_MISSING, similarity: NEUTRAL_MISSING, measured: false };
    }
    return { raw: 1 - cosine, similarity: cosine, measured: true };
  }

  const siteValue = readFeature(site.features, id);
  const targetValue = readFeature(target.features, id);
  const tolerance = criterion?.tolerance;
  if (siteValue === undefined || targetValue === undefined) {
    return { raw: NEUTRAL_MISSING, similarity: NEUTRAL_MISSING, measured: false };
  }
  if (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance <= 0) {
    return { raw: NEUTRAL_MISSING, similarity: NEUTRAL_MISSING, measured: false };
  }

  const raw = Math.abs(siteValue - targetValue);
  return { raw, similarity: clamp01(1 - raw / tolerance), measured: true };
}

export function similarityScore(
  site: Site,
  target: Comparator,
  criteria: Criterion[],
  weightsOverride?: Partial<Record<CriterionId, number>>,
): SimilarityResult {
  const weights = normalizeWeights(weightsOverride, criteria);
  const byId = new Map(criteria.map((criterion) => [criterion.id, criterion]));

  const readings: CriterionReading[] = [];
  for (const id of CRITERION_IDS) {
    readings.push(readCriterion(id, site, target, byId.get(id)));
  }

  // A criterion with no measurement contributes nothing and is dropped from the
  // denominator too: scoring it 0.5 while counting its weight would drag a high
  // score toward the middle, which is exactly the "missing looks mediocre" bias.
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < CRITERION_IDS.length; i += 1) {
    const reading = readings[i];
    const id = CRITERION_IDS[i];
    if (!reading?.measured || id === undefined) continue;
    const weight = weights[id];
    numerator += weight * reading.similarity;
    denominator += weight;
  }

  const score = denominator > 0 ? round1((100 * numerator) / denominator) : 0;

  const breakdown: CriterionScore[] = CRITERION_IDS.map((id, i) => {
    const reading = readings[i];
    const weight = reading?.measured ? weights[id] : 0;
    return {
      criterionId: id,
      raw: round1(reading?.raw ?? 0),
      similarity: reading?.similarity ?? 0,
      weight,
      contribution: reading?.measured ? weight * reading.similarity : 0,
    };
  });

  // Judges add the numbers up, so the parts must sum to the displayed total.
  // The largest part absorbs the rounding residual.
  const targetSum = score / 100;
  const parts = breakdown.map((entry) => entry.contribution);
  const residual = targetSum - parts.reduce((sum, value) => sum + value, 0);
  let largestIndex = -1;
  for (let i = 0; i < parts.length; i += 1) {
    if (largestIndex === -1 || (parts[i] ?? 0) > (parts[largestIndex] ?? 0)) largestIndex = i;
  }
  const largest = largestIndex >= 0 ? breakdown[largestIndex] : undefined;
  if (largest && Number.isFinite(residual)) {
    breakdown[largestIndex] = {
      ...largest,
      contribution: (parts[largestIndex] ?? 0) + residual,
    };
  }

  return { slug: site.slug, score, breakdown };
}

export function rankAnalogues(
  sites: Site[],
  target: Comparator,
  criteria: Criterion[],
  weightsOverride?: Partial<Record<CriterionId, number>>,
): SimilarityResult[] {
  return sites
    .map((site) => similarityScore(site, target, criteria, weightsOverride))
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
}
