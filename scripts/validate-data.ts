/**
 * Data gate. Nothing reaches the UI or the API until this passes.
 *
 * Two jobs beyond calling the shared validators:
 *  - cross-file integrity: a site's analog body must match a comparator that exists,
 *    otherwise the score silently falls back to nothing;
 *  - a weight budget check on minerals, so nobody quietly ships a "recipe" that is
 *    really one mineral with four zeros.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  validateComparator,
  validateCriteriaSet,
  validateSite,
  summarize,
} from '../shared/validation.ts';
import {
  CRITERION_IDS,
  MINERAL_KEYS,
  type Comparator,
  type MineralId,
  type Site,
} from '../shared/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dataDir = resolve(root, 'data');

function readJson<T>(file: string): T {
  const raw = readFileSync(resolve(dataDir, file), 'utf8');
  return JSON.parse(raw) as T;
}

type Issue = { file: string; path: string; message: string; severity: 'error' | 'warning' };

const issues: Issue[] = [];

function report(file: string, list: { path: string; message: string; severity: 'error' | 'warning' }[]): void {
  for (const entry of list) issues.push({ file, ...entry });
}

const criteria = readJson<unknown>('criteria.json');
report('criteria.json', validateCriteriaSet(criteria));

const comparatorList = readJson<Comparator[]>('comparators.json');
comparatorList.forEach((comparator, index) => {
  report(`comparators.json[${index}]`, validateComparator(comparator));
});

// sites.json is the hand-curated single source of truth — the same file the app bundles
// and the seed script reads. The themed sites-*.json files are stale scratch work with a
// different slug scheme and full country names, so validating them would only report noise.
const siteList: Site[] = readJson<Site[]>('sites.json');
const existingSlugs: string[] = [];
siteList.forEach((site, index) => {
  report(`sites.json[${index}]`, validateSite(site, existingSlugs));
  if (typeof site?.slug === 'string') existingSlugs.push(site.slug);
});

const comparatorBySlug = new Map(comparatorList.map((entry) => [entry.slug, entry]));

// Two analogs pointing at the same target produce two identical scores and read
// as a bug in the UI, so treat it as an error rather than a duplicate row.
for (const site of siteList) {
  const seenAnalogs = new Set<string>();
  for (const analog of site.analogs ?? []) {
    if (seenAnalogs.has(analog.slug)) {
      issues.push({
        file: `${site.slug}`,
        path: 'analogs',
        message: `аналог "${analog.slug}" указан дважды — карточка покажет одинаковый индекс два раза`,
        severity: 'error',
      });
    }
    seenAnalogs.add(analog.slug);
  }
}

for (const site of siteList) {
  for (const analog of site.analogs ?? []) {
    if (!comparatorBySlug.has(analog.slug)) {
      issues.push({
        file: `${site.slug}`,
        path: 'analogs',
        message: `аналог ссылается на несуществующую цель "${analog.slug}"`,
        severity: 'error',
      });
    } else if (comparatorBySlug.get(analog.slug)?.body !== analog.body) {
      issues.push({
        file: `${site.slug}`,
        path: 'analogs',
        message: `цель "${analog.slug}" объявлена как ${comparatorBySlug.get(analog.slug)?.body}, а аналог — как ${analog.body}`,
        severity: 'error',
      });
    }
  }
}

/** A mineral vector of 1/0/0/0/0 passes the type check but is not a composition. */
const MINERAL_SPREAD = 0.3;

for (const entry of [...siteList.map((s) => [s.slug, s.geologyMaterials, s.features.geology?.value] as const), ...comparatorList.map((c) => [c.slug, c.geologyMaterials, c.features.geology?.value] as const)]) {
  const [slug, minerals, geologyFeature] = entry;
  const values = MINERAL_KEYS.map((key: MineralId) => minerals?.[key] ?? 0);
  const sum = values.reduce((a, b) => a + b, 0);
  const share = sum > 0 ? Math.max(...values) / sum : 0;
  if (share > 0.9) {
    issues.push({
      file: `${slug}`,
      path: 'geologyMaterials',
      message: `один минерал занимает ${Math.round(share * 100)}% состава — косинус сходства будет вырожденным`,
      severity: 'warning',
    });
  }
  if (typeof geologyFeature === 'number' && geologyFeature > 0) {
    issues.push({
      file: `${slug}`,
      path: 'features.geology',
      message: 'geology считается по косинусу минерального вектора; значение features.geology не участвует в формуле и может вводить в заблуждение',
      severity: 'warning',
    });
  }
}

const bodyCounts = siteList.reduce<Record<string, number>>((acc, site) => {
  const bodies = new Set((site.analogs ?? []).map((a) => a.body));
  for (const body of bodies) acc[body] = (acc[body] ?? 0) + 1;
  return acc;
}, {});

const orphanComparators = [...comparatorBySlug.keys()].filter(
  (slug) => !siteList.some((site) => site.analogs?.some((a) => a.slug === slug)),
);

const errors = issues.filter((i) => i.severity === 'error');
const warnings = issues.filter((i) => i.severity === 'warning');

console.log('=== Moon & Mars on Earth — проверка данных ===');
console.log(`локаций: ${siteList.length}`);
console.log(`целей (Луна/Марс): ${comparatorList.length}`);
console.log(`критериев в наборе: ${CRITERION_IDS.length}, минералов в векторе: ${MINERAL_KEYS.length}`);
console.log(`локаций с аналогом на Марс: ${bodyCounts.mars ?? 0}, на Луну: ${bodyCounts.moon ?? 0}`);
console.log(`ошибок: ${errors.length}, предупреждений: ${warnings.length}`);

if (orphanComparators.length > 0) {
  console.log(`\nцели без локаций-аналогов (${orphanComparators.length}): ${orphanComparators.join(', ')}`);
}

const grouped = new Map<string, Issue[]>();
for (const entry of issues) {
  const list = grouped.get(entry.severity) ?? [];
  list.push(entry);
  grouped.set(entry.severity, list);
}

for (const severity of ['error', 'warning'] as const) {
  const list = grouped.get(severity) ?? [];
  if (list.length === 0) continue;
  console.log(`\n--- ${severity === 'error' ? 'ОШИБКИ' : 'ПРЕДУПРЕЖДЕНИЯ'} (${list.length}) ---`);
  for (const entry of list.slice(0, 60)) {
    console.log(`${entry.file} :: ${entry.path} — ${entry.message}`);
  }
  if (list.length > 60) console.log(`... ещё ${list.length - 60}`);
}

const result = summarize(issues);
console.log(`\n${result.ok ? 'OK: данные консистентны' : 'FAILED: есть блокирующие ошибки'}`);
process.exit(result.ok ? 0 : 1);