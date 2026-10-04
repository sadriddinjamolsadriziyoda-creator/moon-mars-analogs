import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import type { Comparator, Criterion, Site } from '../../../shared/types';

/**
 * data/ holds the authoritative catalog. Only these three files are ever read.
 *
 * The repo also carries sites-mars.json, sites-moon.json and sites-central-asia.json — an
 * earlier draft with a different slug scheme (danakil-dallol vs dallol-danakil) and full
 * country names instead of ISO codes. Reading them would split the catalog into two
 * incompatible sets, so they are deliberately not part of the catalog path.
 */
// server/src/store/ -> three levels up is the repository root, which is where data/ lives.
// Two levels up resolves to server/data, which does not exist, so the server died with ENOENT.
const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url));

async function readJson<T>(name: string): Promise<T> {
  const raw = await readFile(`${DATA_DIR}${name}`, 'utf8');
  return JSON.parse(raw) as T;
}

export type Catalog = {
  sites: Site[];
  comparators: Comparator[];
  criteria: Criterion[];
};

let cache: Catalog | null = null;

export async function loadCatalogFromDisk(force = false): Promise<Catalog> {
  if (cache && !force) return cache;
  const [sites, comparators, criteria] = await Promise.all([
    readJson<Site[]>('sites.json'),
    readJson<Comparator[]>('comparators.json'),
    readJson<Criterion[]>('criteria.json'),
  ]);
  cache = { sites, comparators, criteria };
  return cache;
}