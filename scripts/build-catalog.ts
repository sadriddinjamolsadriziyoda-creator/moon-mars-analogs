/**
 * DISABLED ON PURPOSE. Do not re-enable without rebuilding the catalog from scratch.
 *
 * This script used to treat data/sites.json as derived output and regenerate it by merging
 * the themed source files. That is no longer true, and running it now would destroy the
 * catalog:
 *
 *   - data/sites-{mars,moon,central-asia}.json use a different slug scheme
 *     (`dallol-danakil` vs `danakil-dallol`, `barringer-crater` vs `meteor-crater`)
 *     and spell countries out in full ("Chile") where shared/types.ts requires ISO codes.
 *     Merging them fails type validation and breaks every internal analog link.
 *   - data/sites-extra.json does not exist at all.
 *
 * data/sites.json is now hand-curated, validated by `npm run validate`, and the single
 * source of truth for the app, the server and the seed script. The split-by-topic files
 * are stale scratch work and are deliberately not read.
 *
 * If the catalog ever needs regenerating, write a new script that validates its output
 * with shared/validation.ts before it touches data/sites.json.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'data');

export const SOURCE_FILES: readonly string[] = [];

function read(file: string): unknown[] {
  return JSON.parse(readFileSync(resolve(dataDir, file), 'utf8')) as unknown[];
}

export function buildCatalog(): { sites: unknown[]; slugs: string[]; duplicates: string[] } {
  const sites: unknown[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const file of SOURCE_FILES) {
    for (const site of read(file)) {
      const slug = (site as { slug?: string }).slug;
      if (typeof slug !== 'string') {
        throw new Error(`${file}: запись без slug`);
      }
      if (seen.has(slug)) {
        duplicates.push(slug);
        continue;
      }
      seen.add(slug);
      sites.push(site);
    }
  }

  return { sites, slugs: [...seen], duplicates };
}

function main(): void {
  throw new Error(
    'build-catalog is disabled — it would overwrite data/sites.json with stale, invalid data. ' +
      'See the comment at the top of this file.',
  );
}

function unused(): void {
  const { sites, duplicates } = buildCatalog();

  if (duplicates.length > 0) {
    throw new Error(`дублирующиеся slug: ${duplicates.join(', ')}`);
  }

  writeFileSync(resolve(dataDir, 'sites.json'), `${JSON.stringify(sites, null, 2)}\n`);

  const byCountry = new Map<string, number>();
  for (const site of sites as Array<{ country: string }>) {
    byCountry.set(site.country, (byCountry.get(site.country) ?? 0) + 1);
  }

  console.log(`data/sites.json: ${sites.length} локаций из ${SOURCE_FILES.length} файлов`);
  console.log(`стран: ${byCountry.size}`);
  for (const [country, count] of [...byCountry].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${country.padEnd(16)} ${count}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}