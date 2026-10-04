/**
 * Prints the similarity score for every site against each of its own analogs.
 * This is the check that matters: the validator only proves the data is shaped
 * correctly, not that the formula produces sensible, distinguishable numbers.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { similarityScore } from '../shared/similarity.ts';
import { t, type Comparator, type Criterion, type Site } from '../shared/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'data');

const read = <T,>(file: string): T => JSON.parse(readFileSync(resolve(dataDir, file), 'utf8')) as T;

const criteria = read<Criterion[]>('criteria.json');
const comparators = new Map<string, Comparator>(read<Comparator[]>('comparators.json').map((c) => [c.slug, c]));
const sites = [
  ...read<Site[]>('sites-mars.json'),
  ...read<Site[]>('sites-moon.json'),
  ...read<Site[]>('sites-central-asia.json'),
];

console.log('=== Индекс сходства: каждая локация против каждого своего аналога ===\n');

const all: { slug: string; score: number }[] = [];

for (const site of sites) {
  const lines: string[] = [];
  for (const analog of site.analogs) {
    const target = comparators.get(analog.slug);
    if (!target) {
      lines.push(`    ${analog.slug}: НЕТ ЦЕЛИ`);
      continue;
    }
    const result = similarityScore(site, target, criteria);
    all.push({ slug: `${site.slug} -> ${analog.slug}`, score: result.score });

    const measured = result.breakdown.filter((b) => b.weight > 0);
    const missing = result.breakdown.filter((b) => b.weight === 0).map((b) => b.criterionId);

    const parts = measured
      .map((b) => `${b.criterionId} ${(b.similarity * 100).toFixed(0)}%×${(b.weight * 100).toFixed(0)}%`)
      .join('  ');

    lines.push(
      `    ${String(result.score).padStart(3)} / 100  vs ${analog.slug.padEnd(20)} ` +
        `(${t(analog.region, 'ru').slice(0, 38)})`,
    );
    lines.push(`        ${parts}`);
    if (missing.length > 0) lines.push(`        не измерено: ${missing.join(', ')}`);
  }
  console.log(`  ${site.slug}  [${site.reviewStatus}, confidence: ${site.confidence}]`);
  console.log(lines.join('\n'));
  console.log();
}

const scores = all.map((a) => a.score);
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

console.log('=== Сводка ===');
console.log(`пар всего: ${all.length}`);
console.log(`средний индекс: ${avg.toFixed(1)}`);
console.log(`минимум: ${Math.min(...scores)}, максимум: ${Math.max(...scores)}`);

const top = [...all].sort((a, b) => b.score - a.score).slice(0, 5);
console.log('\nтоп-5 по абсолютному индексу:');
for (const item of top) console.log(`  ${String(item.score).padStart(3)}  ${item.slug}`);

const zero = all.filter((a) => a.score === 0);
if (zero.length > 0) {
  console.log(`\nнулевой индекс (${zero.length}) — данные не считаются:`);
  for (const item of zero) console.log(`  ${item.slug}`);
}