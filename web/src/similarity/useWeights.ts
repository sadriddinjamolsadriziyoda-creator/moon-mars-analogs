import { useCallback, useMemo } from 'react';
import type { Criterion, CriterionId, CriterionScore, Site, Comparator, SimilarityResult } from '@shared/types';
import { similarityScore, rankAnalogues } from '@shared/similarity';

export type Weights = Partial<Record<CriterionId, number>>;

/**
 * Weight overrides live in the URL so a judge can link straight to "what does this site
 * score if I care only about geology?". Sharing the exact view matters more than
 * convenience here.
 */
export function weightsFromSearch(search: string): Weights {
  const params = new URLSearchParams(search);
  const weights: Weights = {};
  let any = false;
  for (const [key, value] of params.entries()) {
    if (!/^[a-z]+$/.test(key)) continue;
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0 && num <= 1) {
      weights[key as CriterionId] = num;
      any = true;
    }
  }
  return any ? weights : {};
}

export function weightsToSearch(weights: Weights, base: string): string {
  const params = new URLSearchParams(base);
  for (const key of Object.keys(params.keys())) {
    if (/^[a-z]+$/.test(key)) params.delete(key);
  }
  for (const [key, value] of Object.entries(weights)) {
    if (typeof value === 'number') params.set(key, value.toFixed(2));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useWeights(
  criteria: Criterion[],
  site: Site | undefined,
  target: Comparator | undefined,
  weights: Weights,
) {
  const score = useMemo<SimilarityResult | null>(() => {
    if (!site || !target || criteria.length === 0) return null;
    return similarityScore(site, target, criteria, weights);
  }, [site, target, criteria, weights]);

  const breakdownById = useMemo(() => {
    const map = new Map<CriterionId, CriterionScore>();
    for (const entry of score?.breakdown ?? []) map.set(entry.criterionId, entry);
    return map;
  }, [score]);

  const setWeight = useCallback((id: CriterionId, value: number) => {
    weights[id] = Math.max(0, Math.min(1, value));
  }, [weights]);

  return { score, breakdownById, setWeight };
}

export function useRanking(
  sites: Site[],
  target: Comparator | undefined,
  criteria: Criterion[],
  weights: Weights,
  limit = 5,
): SimilarityResult[] {
  return useMemo(() => {
    if (!target || criteria.length === 0) return [];
    return rankAnalogues(sites, target, criteria, weights).slice(0, limit);
  }, [sites, target, criteria, weights, limit]);
}