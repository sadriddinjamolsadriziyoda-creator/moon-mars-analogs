import { Router } from 'express';
import type { RequestHandler } from 'express';
import { validateSite, summarize } from '../../../shared/validation';
import type { Site } from '../../../shared/types';
import { isDbReady } from '../db';
import { SiteModel } from '../models/Site';

export function createAdminRouter(adminGuard: RequestHandler): Router {
  const router = Router();
  router.use(adminGuard);

  // The validator is the same one the CI gate and the admin UI run, so a document that
  // saves cleanly is a document that will not break the catalog.
  router.post('/sites', async (req, res, next) => {
    try {
      const site = req.body as Site;
      const issues = validateSite(site, []);
      const summary = summarize(issues);
      if (!summary.ok) {
        res.status(422).json({ error: 'validation failed', issues });
        return;
      }
      if (!isDbReady()) {
        res.status(503).json({ error: 'database unavailable — cannot persist edits' });
        return;
      }
      await SiteModel.findOneAndUpdate({ slug: site.slug }, site, { upsert: true, new: true, lean: true });
      res.status(201).json({ ok: true, slug: site.slug, warnings: issues });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/sites/:slug', async (req, res, next) => {
    try {
      if (!isDbReady()) {
        res.status(503).json({ error: 'database unavailable — cannot persist edits' });
        return;
      }
      const { slug } = req.params;
      const site = { ...(req.body as Site), slug };
      const issues = validateSite(site, [slug]);
      const summary = summarize(issues);
      if (!summary.ok) {
        res.status(422).json({ error: 'validation failed', issues });
        return;
      }
      const existing = await SiteModel.findOne({ slug }).lean();
      if (!existing) {
        res.status(404).json({ error: `no site with slug "${slug}"` });
        return;
      }
      await SiteModel.updateOne({ slug }, { $set: site });
      res.json({ ok: true, slug, warnings: issues });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/sites/:slug', async (req, res, next) => {
    try {
      if (!isDbReady()) {
        res.status(503).json({ error: 'database unavailable — cannot persist edits' });
        return;
      }
      const { slug } = req.params;
      const result = await SiteModel.deleteOne({ slug });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: `no site with slug "${slug}"` });
        return;
      }
      res.json({ ok: true, slug });
    } catch (error) {
      next(error);
    }
  });

  return router;
}