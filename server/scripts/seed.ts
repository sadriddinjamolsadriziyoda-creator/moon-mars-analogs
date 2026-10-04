import 'dotenv/config';
import { connectDb, disconnectDb, describeError } from '../src/db';
import { SiteModel } from '../src/models/Site';
import { loadCatalogFromDisk } from '../src/store/catalog';

/**
 * Idempotent by slug: re-running replaces documents rather than duplicating them, so the
 * team can seed freely during the 48 hours without thinking about how many times they ran it.
 */
async function main(): Promise<void> {
  const ready = await connectDb(process.env.MONGODB_URI);
  if (!ready) {
    console.error('[seed] MongoDB unavailable. Set MONGODB_URI and try again.');
    process.exitCode = 1;
    return;
  }

  const { sites } = await loadCatalogFromDisk(true);

  let created = 0;
  let updated = 0;
  for (const site of sites) {
    const exists = await SiteModel.exists({ slug: site.slug });
    await SiteModel.findOneAndUpdate({ slug: site.slug }, site, { upsert: true, new: true, lean: true });
    if (exists) updated += 1;
    else created += 1;
  }

  console.log(`[seed] done: ${created} created, ${updated} updated, ${sites.length} total`);
  await disconnectDb();
}

main().catch(async (error: unknown) => {
  console.error('[seed] failed:', describeError(error));
  await disconnectDb();
  process.exit(1);
});