import { Router } from 'express';
import type { Comparator, Criterion, Site } from '../../../shared/types';
import { loadCatalogFromDisk } from '../store/catalog';
import { isDbReady } from '../db';
import { SiteModel } from '../models/Site';

export const sitesRouter: Router = Router();

/**
 * Every read route tries Mongo first and falls back to disk. The fallback is not defensive
 * programming for its own sake: the demo has to survive a dead database, and a 500 here
 * would take out the whole atlas rather than just the admin features.
 */

sitesRouter.get('/sites', async (req, res, next) => {
  try {
    const { body, terrain, country, q } = req.query;
    if (isDbReady()) {
      const filter: Record<string, unknown> = {};
      if (typeof body === 'string' && body !== 'all') filter['analogs.body'] = body;
      if (typeof country === 'string' && country) filter.country = country;
      if (typeof terrain === 'string' && terrain) filter.terrainType = terrain;
      if (typeof q === 'string' && q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
      const sites = await SiteModel.find(filter).lean();
      if (Array.isArray(sites) && sites.length > 0) {
        res.json(sites);
        return;
      }
    }

    const { sites } = await loadCatalogFromDisk();
    let filtered = sites;
    if (typeof body === 'string' && body !== 'all') {
      filtered = filtered.filter((site) => site.analogs.some((a) => a.body === body));
    }
    if (typeof country === 'string' && country) {
      filtered = filtered.filter((site) => site.country === country);
    }
    if (typeof terrain === 'string' && terrain) {
      filtered = filtered.filter((site) => site.terrainType.includes(terrain as never));
    }
    if (typeof q === 'string' && q.trim()) {
      const needle = q.trim().toLowerCase();
      filtered = filtered.filter((site) =>
        `${site.name.ru} ${site.name.en} ${site.slug}`.toLowerCase().includes(needle),
      );
    }
    res.json(filtered);
  } catch (error) {
    next(error);
  }
});

sitesRouter.get('/sites/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (isDbReady()) {
      const site = await SiteModel.findOne({ slug }).lean();
      if (site) {
        res.json(site);
        return;
      }
    }
    const { sites } = await loadCatalogFromDisk();
    const site = sites.find((entry) => entry.slug === slug);
    if (!site) {
      res.status(404).json({ error: `no site with slug "${slug}"` });
      return;
    }
    res.json(site);
  } catch (error) {
    next(error);
  }
});

sitesRouter.get('/comparators', async (_req, res, next) => {
  try {
    const { comparators } = await loadCatalogFromDisk();
    res.json(comparators);
  } catch (error) {
    next(error);
  }
});

sitesRouter.get('/criteria', async (_req, res, next) => {
  try {
    const { criteria } = await loadCatalogFromDisk();
    res.json(criteria);
  } catch (error) {
    next(error);
  }
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type { Site, Comparator, Criterion };