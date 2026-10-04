export type Lang = 'ru' | 'en' | 'uz';

export type LocalizedText = { ru: string; en: string; uz?: string };

const LANG_ORDER: readonly Lang[] = ['ru', 'en', 'uz'];

export function t(text: LocalizedText | undefined, lang: Lang): string {
  if (!text) return '';
  const requested = text[lang];
  if (requested) return requested;
  for (const candidate of LANG_ORDER) {
    const value = text[candidate];
    if (value) return value;
  }
  return '';
}

export type Body = 'earth' | 'mars' | 'moon';

// dry-valley: the McMurdo Dry Valleys are their own biome, not a generic desert.
// basalt-plain: lunar mare are plains of basalt, and the analogue sites share the volcanic setting.
export type TerrainType =
  | 'desert'
  | 'volcano'
  | 'cave'
  | 'impact-crater'
  | 'polar'
  | 'acid-saline-lake'
  | 'dry-valley'
  | 'basalt-plain';

export const TERRAIN_TYPES: readonly TerrainType[] = [
  'desert',
  'volcano',
  'cave',
  'impact-crater',
  'polar',
  'acid-saline-lake',
  'dry-valley',
  'basalt-plain',
];

export type Evidence = 'high' | 'medium' | 'low';
export type ReviewStatus = 'verified' | 'needs-review';

export type CriterionId =
  | 'relief'
  | 'geology'
  | 'climate'
  | 'illumination'
  | 'hydrology'
  | 'engineering';

export const CRITERION_IDS: readonly CriterionId[] = [
  'relief',
  'geology',
  'climate',
  'illumination',
  'hydrology',
  'engineering',
];

export type MineralId = 'hematite' | 'sulfate' | 'basalt' | 'clay' | 'ilmenite';

// Order is load-bearing: mineral vectors are flattened in this exact sequence before
// cosine similarity, so any reordering silently changes every geology score.
export const MINERAL_KEYS: MineralId[] = ['hematite', 'sulfate', 'basalt', 'clay', 'ilmenite'];

export type FeatureScore = { value: number; evidence: Evidence; note: LocalizedText };

export type FeatureVector = Partial<Record<CriterionId, FeatureScore>>;

// Raw abundance estimates; they need not sum to 1 before L2 normalization.
export type MineralVector = Record<MineralId, number>;

export type Criterion = {
  id: CriterionId;
  label: LocalizedText;
  weight: number;
  tolerance: number;
  description: LocalizedText;
  source: string;
};

export type WhySimilar = { summary: LocalizedText; detail: LocalizedText };

export type Analog = {
  // Points at a Comparator slug. The display copy lives in `region`; the link is
  // what stops a site from claiming to be an analogue of an unnamed place.
  slug: string;
  body: 'mars' | 'moon';
  region: LocalizedText;
  center: [number, number];
  radiusKm: number;
  whySimilar: WhySimilar;
};

export type Mission = { org: string; what: LocalizedText; year?: number; url?: string };

export type Photo = { src: string; credit: LocalizedText; license: string; alt: LocalizedText };

export type Source = { title: string; org: string; url: string; accessed?: string };

export type Site = {
  slug: string;
  name: LocalizedText;
  country: string;
  center: [number, number];
  radiusKm: number;
  terrainType: TerrainType[];
  analogs: Analog[];
  features: FeatureVector;
  geologyMaterials: MineralVector;
  missions: Mission[];
  photos: Photo[];
  sources: Source[];
  confidence: Evidence;
  reviewStatus: ReviewStatus;
};

export type Comparator = {
  slug: string;
  name: LocalizedText;
  body: 'mars' | 'moon';
  center: [number, number];
  radiusKm: number;
  terrainTags: string[];
  features: FeatureVector;
  geologyMaterials: MineralVector;
  description: LocalizedText;
};

export type CriterionScore = {
  criterionId: CriterionId;
  raw: number;
  similarity: number;
  weight: number;
  contribution: number;
};

export type SimilarityResult = {
  slug: string;
  score: number;
  breakdown: CriterionScore[];
};

export type ValidationIssue = {
  path: string;
  message: string;
  severity: 'error' | 'warning';
};
