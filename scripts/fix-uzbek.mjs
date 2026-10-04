/**
 * Fixes mixed-alphabet typos in the Uzbek translations: a Cyrillic letter
 * slipped inside a Latin word (lavа, kattа, havzа, eriб). These are invisible in
 * code review and reach the user as misspelled text.
 *
 * The corrections are an explicit table, never a blanket transliteration, so a
 * genuinely mixed string still gets reported rather than silently mangled.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FIXES = new Map([
  ['lavа', 'lava'],
  ['Lavа', 'Lava'],
  ['kattа', 'katta'],
  ['havzа', 'havza'],
  ['eriб', 'erib'],
]);

const files = [
  'data/sites-mars.json',
  'data/sites-moon.json',
  'data/sites-central-asia.json',
  'data/comparators.json',
  'data/criteria.json',
];

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let after = before;

  for (const [wrong, right] of FIXES) {
    after = after.split(wrong).join(right);
  }

  if (after !== before) {
    writeFileSync(file, after);
    JSON.parse(after);
    console.log(`fixed ${file}`);
  } else {
    console.log(`clean  ${file}`);
  }
}

// Report anything still mixed, so a new typo is caught next run.
const mixed = /[\u0400-\u04FF][a-zA-Z]{2,}|[a-zA-Z]{3,}[\u0400-\u04FF]/;

function walk(node, path, hits) {
  if (typeof node === 'string') {
    if (mixed.test(node)) hits.push(`${path}: ${node.slice(0, 80)}`);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((value, index) => walk(value, `${path}[${index}]`, hits));
    return;
  }
  if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) walk(node[key], `${path}.${key}`, hits);
  }
}

const remaining = [];
for (const file of files) {
  walk(JSON.parse(readFileSync(file, 'utf8')), file, remaining);
}

if (remaining.length > 0) {
  console.log(`\nstill mixed (${remaining.length}):`);
  for (const hit of remaining) console.log(`  ${hit}`);
} else {
  console.log('\nno mixed alphabets left');
}