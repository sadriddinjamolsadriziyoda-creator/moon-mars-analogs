import { Router } from 'express';
import { z } from 'zod';
import { rankAnalogues } from '../../../shared/similarity';
import { CRITERION_IDS, type CriterionId } from '../../../shared/types';
import { loadCatalogFromDisk } from '../store/catalog';
import { isDbReady } from '../db';
import { SiteModel } from '../models/Site';

export const similarityRouter: Router = Router();

const weightsSchema = z
  .object(
    Object.fromEntries(CRITERION_IDS.map((id) => [id, z.number().min(0).max(1)])) as Record<
      CriterionId,
      z.ZodNumber
    >,
  )
  .partial();

const bodySchema = z.object({
  targetSlug: z.string().min(1),
  weights: weightsSchema.optional(),
});

similarityRouter.post('/similarity', async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid request', detail: parsed.error.flatten() });
      return;
    }

    const { targetSlug, weights } = parsed.data;
    const { comparators, criteria } = await loadCatalogFromDisk();
    const target = comparators.find((comparator) => comparator.slug === targetSlug);
    if (!target) {
      res.status(404).json({ error: `no comparator with slug "${targetSlug}"` });
      return;
    }

    // Same code path as the browser: one implementation, so the number on the radar chart is
    // the number this endpoint returns.
    let sites = (await loadCatalogFromDisk()).sites;
    if (isDbReady()) {
      const fromDb = await SiteModel.find().lean();
      if (Array.isArray(fromDb) && fromDb.length > 0) sites = fromDb as typeof sites;
    }

    res.json(rankAnalogues(sites, target, criteria, weights));
  } catch (error) {
    next(error);
  }
});