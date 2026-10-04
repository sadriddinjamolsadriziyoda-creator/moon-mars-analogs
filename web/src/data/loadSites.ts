import type { Comparator, Criterion, Site } from '@shared/types';

// Bundled copy. The demo must survive a dead API — that is the whole point of
// keeping the catalog in the repo — so this import is the guaranteed floor, not a fallback.
import sitesJson from '@data/sites.json';
import comparatorsJson from '@data/comparators.json';
import criteriaJson from '@data/criteria.json';

export type Catalog = {
  sites: Site[];
  comparators: Comparator[];
  criteria: Criterion[];
  origin: 'api' | 'bundled';
};

export type CatalogState = {
  status: 'loading' | 'ready' | 'error';
  origin: 'api' | 'bundled' | null;
  sites: Site[];
  comparators: Comparator[];
  criteria: Criterion[];
  error: string | null;
};

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export const BUNDLED_SITES = sitesJson as unknown as Site[];
export const BUNDLED_COMPARATORS = comparatorsJson as unknown as Comparator[];
export const BUNDLED_CRITERIA = criteriaJson as unknown as Criterion[];

async function fetchJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${path} → HTTP ${response.status}`);
  return (await response.json()) as T;
}

/**
 * Loads the catalog from the API when it answers, and from the bundled JSON when it
 * does not. A partial API response is treated as failure: 20 sites out of 25 would
 * look like a data gap rather than an outage, and the honest move is to show everything
 * we know rather than most of it.
 */
export async function loadCatalog(timeoutMs = 4000): Promise<Catalog> {
  if (!API_BASE) {
    return {
      sites: BUNDLED_SITES,
      comparators: BUNDLED_COMPARATORS,
      criteria: BUNDLED_CRITERIA,
      origin: 'bundled',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const [sites, comparators, criteria] = await Promise.all([
      fetchJson<Site[]>('/api/sites', controller.signal),
      fetchJson<Comparator[]>('/api/comparators', controller.signal),
      fetchJson<Criterion[]>('/api/criteria', controller.signal),
    ]);
    if (!Array.isArray(sites) || sites.length === 0) throw new Error('empty catalog');
    return { sites, comparators, criteria, origin: 'api' };
  } catch {
    return {
      sites: BUNDLED_SITES,
      comparators: BUNDLED_COMPARATORS,
      criteria: BUNDLED_CRITERIA,
      origin: 'bundled',
    };
  } finally {
    clearTimeout(timer);
  }
}

export function catalogFromError(message: string): CatalogState {
  return {
    status: 'error',
    origin: null,
    sites: BUNDLED_SITES,
    comparators: BUNDLED_COMPARATORS,
    criteria: BUNDLED_CRITERIA,
    error: message,
  };
}