import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeWeights, similarityScore, rankAnalogues } from '../../shared/similarity.ts';
import {
  CRITERION_IDS,
  MINERAL_KEYS,
  type Comparator,
  type Criterion,
  type CriterionId,
  type FeatureVector,
  type MineralVector,
  type Site,
} from '../../shared/types.ts';

const CRITERIA: Criterion[] = CRITERION_IDS.map((id) => ({
  id,
  label: { ru: id, en: id },
  weight: 1 / CRITERION_IDS.length,
  tolerance: 0.5,
  description: { ru: '', en: '' },
  source: 'test',
}));

function feature(value: number): FeatureVector {
  const out = {} as FeatureVector;
  for (const id of CRITERION_IDS) {
    out[id] = { value, evidence: 'high', note: { ru: '', en: '' } };
  }
  // Geology is scored from the mineral vector, not from this number.
  out.geology = { value: 0, evidence: 'high', note: { ru: '', en: '' } };
  return out;
}

function minerals(overrides: Partial<MineralVector> = {}): MineralVector {
  const base = {} as MineralVector;
  for (const key of MINERAL_KEYS) base[key] = 0;
  return { ...base, ...overrides };
}

function makeSite(slug: string, value: number, mineral: MineralVector, body: 'mars' | 'moon' = 'mars'): Site {
  return {
    slug,
    name: { ru: slug, en: slug },
    country: 'Test',
    center: [0, 0],
    radiusKm: 10,
    terrainType: ['desert'],
    analogs: [],
    features: feature(value),
    geologyMaterials: mineral,
    missions: [],
    photos: [],
    sources: [],
    confidence: 'high',
    reviewStatus: 'verified',
  };
}

function makeTarget(mineral: MineralVector, body: 'mars' | 'moon' = 'mars'): Comparator {
  return {
    slug: 'target',
    name: { ru: 'target', en: 'target' },
    body,
    center: [0, 0],
    radiusKm: 10,
    terrainTags: [],
    features: feature(0.5),
    geologyMaterials: mineral,
    description: { ru: '', en: '' },
  };
}

test('identical features with identical minerals score 100', () => {
  const mineral = minerals({ basalt: 4, ilmenite: 1 });
  const site = makeSite('identical', 0.5, mineral);
  const target = makeTarget(mineral);

  const result = similarityScore(site, target, CRITERIA);
  assert.equal(result.score, 100);
});

test('identical features with orthogonal minerals lose the geology points only', () => {
  const site = makeSite('orthogonal', 0.5, minerals({ basalt: 5 }));
  const target = makeTarget(minerals({ hematite: 5 }));

  const result = similarityScore(site, target, CRITERIA);
  // Geology is one of six criteria and its cosine is 0 for disjoint recipes,
  // so five sixths of the weight still contributes at full similarity.
  assert.equal(result.score, 83.3);
  const geology = result.breakdown.find((entry) => entry.criterionId === 'geology');
  assert.equal(geology?.similarity, 0);
  assert.ok((geology?.weight ?? 0) > 0, 'geology was measured, so it keeps its weight');
});

test('breakdown contributions sum to the displayed score', () => {
  const site = makeSite('sum-check', 0.8, minerals({ sulfate: 3, clay: 1 }));
  const target = makeTarget(minerals({ sulfate: 2, hematite: 1 }));

  const result = similarityScore(site, target, CRITERIA);
  const total = result.breakdown.reduce((sum, entry) => sum + entry.contribution, 0);
  assert.ok(Math.abs(total - result.score / 100) < 1e-9, `parts ${total} vs score ${result.score / 100}`);
});

test('a criterion with no measurement is dropped from both parts of the average', () => {
  const mineral = minerals({ basalt: 5 });
  // 0.5 is the target value on every criterion, so every measured one matches.
  const site = makeSite('missing', 0.5, mineral);
  const target = makeTarget(mineral);
  delete site.features.climate;
  delete target.features.climate;

  const result = similarityScore(site, target, CRITERIA);
  assert.equal(result.score, 100, 'missing data must not drag a perfect match toward the middle');
  const climate = result.breakdown.find((entry) => entry.criterionId === ('climate' as CriterionId));
  assert.equal(climate?.weight, 0);
});

test('a value at the tolerance distance scores zero, one at the target value scores full', () => {
  // tolerance is 0.5, so |1 - 0.5| = 0.5 is exactly one tolerance away.
  const far = similarityScore(makeSite('far', 1, minerals({ basalt: 5 })), makeTarget(minerals({ basalt: 5 })), CRITERIA);
  const onTarget = similarityScore(makeSite('on', 0.5, minerals({ basalt: 5 })), makeTarget(minerals({ basalt: 5 })), CRITERIA);

  assert.ok(far.score < onTarget.score);
  const relief = far.breakdown.find((entry) => entry.criterionId === 'relief');
  assert.equal(relief?.similarity, 0, 'exactly one tolerance away must clamp to zero, not go negative');
});

test('a site with no measurable evidence at all scores 0 rather than a neutral 50', () => {
  const site = makeSite('blank', 0.5, minerals({ basalt: 1 }));
  const target = makeTarget(minerals({ basalt: 1 }));
  for (const id of CRITERION_IDS) delete site.features[id];

  // Geology still has evidence: it is derived from the mineral vector, not from
  // features.geology. Remove that too and nothing measurable is left.
  const withMinerals = similarityScore(site, target, CRITERIA);
  assert.equal(withMinerals.score, 100, 'geology alone remains measurable and it matches');

  const noEvidence = makeSite('no-evidence', 0.5, minerals());
  for (const id of CRITERION_IDS) delete noEvidence.features[id];
  const result = similarityScore(noEvidence, target, CRITERIA);

  assert.equal(result.score, 0, 'no measurement must give 0, never the 0.5 neutral default');
  for (const entry of result.breakdown) assert.equal(entry.weight, 0);
});

test('normalizeWeights sums to 1 and survives degenerate input', () => {
  const equal = normalizeWeights(undefined, CRITERIA);
  const sum = CRITERION_IDS.reduce((acc, id) => acc + (equal[id] ?? 0), 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `sum ${sum}`);

  const zeroed = normalizeWeights(
    Object.fromEntries(CRITERION_IDS.map((id) => [id, 0])),
    CRITERIA.map((c) => ({ ...c, weight: 0 })),
  );
  const zeroSum = CRITERION_IDS.reduce((acc, id) => acc + (zeroed[id] ?? 0), 0);
  assert.ok(Math.abs(zeroSum - 1) < 1e-9, 'all-zero weights must fall back to uniform');
});

test('weight override replaces the defaults and normalises to 1', () => {
  const site = makeSite('weighted', 0.9, minerals({ basalt: 5 }));
  const target = makeTarget(minerals({ basalt: 5 }));

  const even = similarityScore(site, target, CRITERIA);
  const climateHeavy = similarityScore(site, target, CRITERIA, {
    climate: 10,
    relief: 0.1,
    geology: 0.1,
    illumination: 0.1,
    hydrology: 0.1,
    engineering: 0.1,
  });

  // Site is 0.9 against a target of 0.5: distance 0.4 over tolerance 0.5,
  // so climate alone scores 0.2. With climate at ~91% of the weight the total
  // must land near 0.2, well below the evenly weighted score.
  assert.ok(climateHeavy.score < even.score, `${climateHeavy.score} should be below ${even.score}`);
  assert.ok(climateHeavy.score > 0 && climateHeavy.score < 30);

  const climateEntry = climateHeavy.breakdown.find((entry) => entry.criterionId === 'climate');
  const totalWeight = climateHeavy.breakdown.reduce((sum, entry) => sum + entry.weight, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9, `weights sum ${totalWeight}`);
  assert.ok((climateEntry?.weight ?? 0) > 0.9);
});

test('cosine similarity is scale invariant for mineral recipes', () => {
  const small = minerals({ basalt: 1, ilmenite: 0.25 });
  const large = minerals({ basalt: 4, ilmenite: 1 });
  const result = similarityScore(makeSite('scaled', 0.5, small), makeTarget(large), CRITERIA);
  assert.equal(result.score, 100, 'multiplying the whole recipe must not change cosine similarity');
});

test('a zero mineral vector yields no geology score instead of dividing by zero', () => {
  const site = makeSite('empty-minerals', 0.5, minerals());
  const target = makeTarget(minerals({ basalt: 5 }));
  const result = similarityScore(site, target, CRITERIA);
  const geology = result.breakdown.find((entry) => entry.criterionId === 'geology');
  assert.equal(geology?.weight, 0);
  assert.ok(Number.isFinite(result.score));
});

test('rankAnalogues sorts by score, then by slug on an exact tie', () => {
  const mineral = minerals({ basalt: 4 });
  const sites = [
    // 0.9 and 0.1 are equidistant from the 0.5 target, so those two genuinely tie.
    makeSite('zzz-tied', 0.9, mineral),
    makeSite('aaa-tied', 0.1, mineral),
    makeSite('bbb-best', 0.5, mineral),
  ];
  const ranked = rankAnalogues(sites, makeTarget(mineral), CRITERIA);

  assert.equal(ranked[0]?.slug, 'bbb-best', 'an exact match ranks first');
  assert.equal(ranked[1]?.slug, 'aaa-tied', 'the 0.1/0.9 pair ties and breaks alphabetically');
  assert.equal(ranked[2]?.slug, 'zzz-tied');
  assert.equal(ranked[1]?.score, ranked[2]?.score);
});

test('score never leaves the 0..100 range for extreme input', () => {
  const site = makeSite('extreme', 0, minerals({ hematite: 5 }));
  const target = makeTarget(minerals({ basalt: 5 }));
  const result = similarityScore(site, target, CRITERIA);
  assert.ok(result.score >= 0 && result.score <= 100);
  for (const entry of result.breakdown) {
    assert.ok(entry.similarity >= 0 && entry.similarity <= 1);
    assert.ok(entry.weight >= 0);
  }
});