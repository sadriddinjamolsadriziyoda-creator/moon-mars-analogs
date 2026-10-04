import { loadCatalogFromDisk } from '../src/store/catalog';

/**
 * A dead source link has to fail the build. "Every claim is sourced" is the whole
 * credibility claim of this project, and a citation that 404s is worse than no citation:
 * it looks checked.
 *
 * Status code alone is not enough — several hosts answer 200 with an error page in the
 * body. So we read a chunk of the body and look for known error markers.
 */

const CONCURRENCY = 6;
const TIMEOUT_MS = 12_000;
const RETRIES = 2;

const BODY_MARKERS = [
  'page not found',
  'not found',
  '404',
  'access denied',
  'forbidden',
  'no longer available',
  'does not exist',
];

interface Check {
  url: string;
  slug: string;
  title: string;
}

async function checkOne(check: Check): Promise<{ check: Check; ok: boolean; detail: string }> {
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(check.url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'user-agent': 'moon-mars-analogs-source-check/1.0 (+NASA Space Apps)' },
      });
      const body = response.ok ? await response.text().catch(() => '') : '';
      const lowered = body.slice(0, 4000).toLowerCase();
      const looksBroken = BODY_MARKERS.some((marker) => lowered.includes(marker));

      if (response.ok && !looksBroken) {
        return { check, ok: true, detail: `HTTP ${response.status}` };
      }
      const detail = looksBroken
        ? `HTTP ${response.status} but body looks like an error page`
        : `HTTP ${response.status}`;
      if (attempt === RETRIES) return { check, ok: false, detail };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (attempt === RETRIES) return { check, ok: false, detail };
    } finally {
      clearTimeout(timer);
    }
  }
  return { check, ok: false, detail: 'unreachable' };
}

async function runPool<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) results.push(await worker(item));
    }
  });
  await Promise.all(runners);
  return results;
}

async function main(): Promise<void> {
  const { sites } = await loadCatalogFromDisk(true);

  const seen = new Map<string, Check>();
  for (const site of sites) {
    for (const source of site.sources) {
      if (!seen.has(source.url)) {
        seen.set(source.url, { url: source.url, slug: site.slug, title: source.title });
      }
    }
    for (const photo of site.photos) {
      if (!seen.has(photo.src)) {
        seen.set(photo.src, { url: photo.src, slug: site.slug, title: `photo: ${photo.src}` });
      }
    }
  }

  const checks = [...seen.values()];
  console.log(`[sources] checking ${checks.length} unique URLs from ${sites.length} sites`);

  const results = await runPool(checks, checkOne);
  const dead = results.filter((result) => !result.ok);

  for (const failure of dead) {
    console.error(`  DEAD  ${failure.check.url}\n        ${failure.detail}  (first seen at ${failure.check.slug})`);
  }
  console.log(`[sources] ${results.length - dead.length}/${results.length} reachable`);

  if (dead.length > 0) {
    console.error(`[sources] ${dead.length} dead link(s). Fix or replace them before shipping.`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('[sources] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});