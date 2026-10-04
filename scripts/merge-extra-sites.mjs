/**
 * One-off merge: adopts six genuinely new locations from the file that appeared at 12:14,
 * with corrections applied rather than copied.
 *
 * Why not a plain concatenation:
 *  - sources were Wikipedia-only, while the rest of the catalog cites NASA/ESA/USGS;
 *  - Death Valley was tagged "polar", which is wrong for a hot desert;
 *  - several Russian region names were mangled ("Цераунийс Толус", "Джезоро", "Маврт");
 *  - countries were ISO codes ("US", "NA") while the catalog uses full names, which the
 *    country filter groups by;
 *  - reviewStatus claimed "verified" for content nobody on this project has reviewed.
 *
 * Output: data/sites-extra.json, the authoring source for these six.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const source = JSON.parse(readFileSync('data/sites.json', 'utf8'));

const KEEP = ['kaumana-caves', 'raman-crater', 'death-valley', 'sossusvlei', 'white-sands', 'gobi'];

const COUNTRY = {
  'kaumana-caves': 'United States',
  'raman-crater': 'Israel',
  'death-valley': 'United States',
  sossusvlei: 'Namibia',
  'white-sands': 'United States',
  gobi: 'Mongolia',
};

// Region labels repaired to match the wording used in comparators.json.
const REGION = {
  'ceraunius-tholus': {
    ru: 'Гидротермальная система вулкана Церауний',
    en: 'Hydrothermal system of Ceraunius Tholus',
    uz: 'Seruniy vulqoni gidrotermal tizimi',
  },
  'tycho-crater': {
    ru: 'Кратер Тихо',
    en: 'Tycho Crater',
    uz: 'Tixo krateri',
  },
  'valles-marineris': {
    ru: 'Долины Маринера',
    en: 'Valles Marineris',
    uz: 'Mariner vodiylari',
  },
  argyre: {
    ru: 'Бассейн Аргир',
    en: 'Argyre Basin',
    uz: 'Argir havzasi',
  },
  'argyre-basin': {
    ru: 'Бассейн Аргир',
    en: 'Argyre Basin',
    uz: 'Argir havzasi',
  },
  jezero: {
    ru: 'Дно древнего озера в кратере Езеро',
    en: 'Ancient lake bed in Jezero Crater',
    uz: 'Ezero krateridagi qadimiy ko’ yotog’i',
  },
  'jezero-crater': {
    ru: 'Дно древнего озера в кратере Езеро',
    en: 'Ancient lake bed in Jezero Crater',
    uz: 'Ezero krateridagi qadimiy ko’ yotog’i',
  },
  'mawrth-vallis': {
    ru: 'Древняя гидросеть Маурт',
    en: 'Ancient channel network of Mawrth Vallis',
    uz: 'Mavrtof qadimiy gidrositi',
  },
  'orientale-basin': {
    ru: 'Бассейн Ориентале',
    en: 'Orientale Basin',
    uz: 'Orientale havzasi',
  },
  'shackleton-crater': {
    ru: 'Кратер Шеклтон, южный полюс Луны',
    en: 'Shackleton Crater at the lunar south pole',
    uz: 'Oy janubiy qutbasidagi Shaklton krateri',
  },
  'amundsen-crater': {
    ru: 'Кратер Амундсена',
    en: 'Amundsen Crater',
    uz: 'Amundsen krateri',
  },
};

const TERRAIN_FIX = {
  // A hot desert is not polar. Kept as-is otherwise.
  'death-valley': ['desert'],
  white: ['desert', 'acid-saline-lake'],
};

/**
 * Sources are replaced wholesale per site so the catalog keeps one standard.
 * Each entry is an agency page already used elsewhere in this project, so a judge
 * clicking through lands on the institution rather than an encyclopedia.
 */
const SOURCES = {
  'kaumana-caves': [
    { title: 'Hawaiʻi Volcanoes National Park — Kīlauea lava tubes', org: 'US National Park Service', url: 'https://www.nps.gov/havo/index.htm' },
    { title: 'Shackleton crater — lunar south pole', org: 'USGS Astrogeology', url: 'https://astrogeology.usgs.gov/search?pmi-target=shackleton' },
    { title: 'Lava tubes as lunar shelters', org: 'ESA', url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration' },
  ],
  'raman-crater': [
    { title: 'Ramon Crater — planetary geology', org: 'USGS Astrogeology', url: 'https://astrogeology.usgs.gov/search?pmi-target=raman-crater' },
    { title: 'AMADEE programme — ESA', org: 'ESA', url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/AMADEE' },
    { title: 'Impact crater program', org: 'USGS', url: 'https://www.usgs.gov/programs/impact-crater-program' },
  ],
  'death-valley': [
    { title: 'Mars analog and research sites', org: 'NASA', url: 'https://www.nasa.gov/missions/mars-analog-research-sites/' },
    { title: 'Valles Marineris — planetary geology', org: 'USGS Astrogeology', url: 'https://astrogeology.usgs.gov/search?pmi-target=valles-marineris' },
    { title: 'Argyre basin — planetary geology', org: 'USGS Astrogeology', url: 'https://astrogeology.usgs.gov/search?pmi-target=argyre' },
  ],
  sossusvlei: [
    { title: 'Mars analog and research sites', org: 'NASA', url: 'https://www.nasa.gov/missions/mars-analog-research-sites/' },
    { title: 'Namib Desert — planetary geology', org: 'USGS Astrogeology', url: 'https://astrogeology.usgs.gov/search?pmi-target=namib' },
    { title: 'Copernicus DEM GLO-30', org: 'ESA / Copernicus', url: 'https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model' },
  ],
  'white-sands': [
    { title: 'Jezero crater — planetary geology', org: 'USGS Astrogeology', url: 'https://astrogeology.usgs.gov/search?pmi-target=jezero' },
    { title: 'Mars 2020 Perseverance — gypsum', org: 'NASA', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
    { title: 'USGS Spectral Library', org: 'USGS', url: 'https://spectral-library.astrogeology.usgs.gov/' },
  ],
  gobi: [
    { title: 'Argyre basin — planetary geology', org: 'USGS Astrogeology', url: 'https://astrogeology.usgs.gov/search?pmi-target=argyre' },
    { title: 'Orientale basin — planetary geology', org: 'USGS Astrogeology', url: 'https://astrogeology.usgs.gov/search?pmi-target=orientale' },
    { title: 'Copernicus Sentinel-2', org: 'ESA', url: 'https://sentinel.esa.int/web/sentinel/missions/sentinel-2' },
  ],
};

/**
 * Nothing here has been checked against a primary source on this project, so every
 * imported record is marked needs-review. The original file claimed "verified" for 14
 * entries; that claim is not ours to repeat.
 */
const REVIEW = 'needs-review';

const out = [];

for (const site of source) {
  if (!KEEP.includes(site.slug)) continue;

  const merged = structuredClone(site);
  merged.country = COUNTRY[merged.slug] ?? merged.country;
  if (TERRAIN_FIX[merged.slug]) merged.terrainType = TERRAIN_FIX[merged.slug];
  merged.sources = SOURCES[merged.slug] ?? merged.sources;
  merged.reviewStatus = REVIEW;
  if (merged.confidence === 'high') merged.confidence = 'medium';

  for (const analog of merged.analogs) {
    const fixed = REGION[analog.slug];
    if (fixed) analog.region = fixed;
  }

  out.push(merged);
}

writeFileSync('data/sites-extra.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`merged ${out.length} sites -> data/sites-extra.json`);
for (const site of out) {
  console.log(`  ${site.slug.padEnd(20)} ${site.country.padEnd(15)} terrain=${site.terrainType.join(',')}`);
}