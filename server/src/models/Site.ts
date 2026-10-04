import { Schema, model, type Model } from 'mongoose';
import type { Site } from '../../../shared/types';

/**
 * Documents are stored verbatim rather than through a hand-written schema that could drift
 * from shared/types.ts. The seed is generated from the same JSON the frontend bundles, so a
 * schema that rejects valid data would break the catalog in a way the types cannot catch.
 */
const siteSchema = new Schema(
  {},
  {
    strict: false,
    minimize: false,
    versionKey: false,
    collection: 'sites',
    // Array-of-documents subtrees need to preserve key order for stable reads.
    preserveKeyOrder: true,
  },
);

siteSchema.index({ slug: 1 }, { unique: true });
siteSchema.index({ country: 1 });
siteSchema.index({ 'center': '2dsphere' });
siteSchema.index({ reviewStatus: 1 });

export type SiteDoc = Site & { _id?: unknown };
export const SiteModel: Model<SiteDoc> = model<SiteDoc>('Site', siteSchema);