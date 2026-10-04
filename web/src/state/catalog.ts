import { create } from 'zustand';
import type { Comparator, Lang, Site, TerrainType } from '@shared/types';
import { loadCatalog, type CatalogState } from '../data/loadSites';

export type BodyFilter = 'all' | 'mars' | 'moon';
export type SortMode = 'score' | 'name';

export type Filters = {
  bodies: BodyFilter;
  terrains: TerrainType[];
  country: string | null;
  query: string;
  sort: SortMode;
};

export const EMPTY_FILTERS: Filters = {
  bodies: 'all',
  terrains: [],
  country: null,
  query: '',
  sort: 'score',
};

type CatalogStore = CatalogState & {
  lang: Lang;
  filters: Filters;
  selectedSlug: string | null;
  targetSlug: string | null;
  /**
   * Whether the user picked the comparison target themselves. Until they do, the atlas scores
   * a site against its own closest analogue, which is what the card is meant to report;
   * otherwise every site would be measured against whichever target happened to be selected.
   */
  targetExplicit: boolean;
  filtersOpen: boolean;
  init: () => Promise<void>;
  setLang: (lang: Lang) => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  toggleTerrain: (terrain: TerrainType) => void;
  select: (slug: string | null) => void;
  setTarget: (slug: string | null) => void;
  setFiltersOpen: (open: boolean) => void;
};

export const useCatalog = create<CatalogStore>((set) => ({
  status: 'loading',
  origin: null,
  sites: [],
  comparators: [],
  criteria: [],
  error: null,
  lang: 'ru',
  filters: EMPTY_FILTERS,
  selectedSlug: null,
  targetSlug: null,
  targetExplicit: false,
  filtersOpen: false,

  init: async () => {
    if (useCatalog.getState().status !== 'loading') return;
    try {
      const catalog = await loadCatalog();
      set({
        status: 'ready',
        origin: catalog.origin,
        sites: catalog.sites,
        comparators: catalog.comparators,
        criteria: catalog.criteria,
      });
      const first = catalog.comparators.find((c) => c.body === 'mars');
      set({ targetSlug: first?.slug ?? null });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : String(error) });
    }
  },

  setLang: (lang) => set({ lang }),
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: EMPTY_FILTERS }),
  toggleTerrain: (terrain) =>
    set((state) => ({
      filters: {
        ...state.filters,
        terrains: state.filters.terrains.includes(terrain)
          ? state.filters.terrains.filter((item) => item !== terrain)
          : [...state.filters.terrains, terrain],
      },
    })),
  select: (slug) => set({ selectedSlug: slug }),
  setTarget: (slug) => set({ targetSlug: slug, targetExplicit: true }),
  setFiltersOpen: (open) => set({ filtersOpen: open }),
}));

export function siteHasBody(site: Site, body: BodyFilter): boolean {
  if (body === 'all') return true;
  return site.analogs.some((analog) => analog.body === body);
}

export function filterSites(sites: Site[], filters: Filters, comparators: Comparator[]): Site[] {
  const bySlug = new Map(comparators.map((c) => [c.slug, c]));
  const query = filters.query.trim().toLowerCase();

  return sites.filter((site) => {
    if (!siteHasBody(site, filters.bodies)) return false;
    if (filters.terrains.length > 0 && !filters.terrains.some((type) => site.terrainType.includes(type))) {
      return false;
    }
    if (filters.country && site.country !== filters.country) return false;
    if (query) {
      const haystack = [
        site.name.ru,
        site.name.en,
        site.slug,
        site.country,
        ...site.analogs.map((analog) => `${analog.region.ru} ${analog.region.en} ${analog.slug}`),
        ...site.analogs.map((analog) => bySlug.get(analog.slug)?.name.ru ?? ''),
        ...site.analogs.map((analog) => bySlug.get(analog.slug)?.name.en ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Bodies a site is linked to, for marker colouring: a Mars-only site and a dual site differ. */
export function siteBodies(site: Site): Set<'mars' | 'moon'> {
  const bodies = new Set<'mars' | 'moon'>();
  for (const analog of site.analogs) bodies.add(analog.body);
  return bodies;
}

export function countries(sites: Site[]): string[] {
  return [...new Set(sites.map((site) => site.country))].sort();
}