import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import 'dotenv/config';

import { connectDb, isDbReady, describeError } from './db';
import { loadCatalogFromDisk } from './store/catalog';
import { sitesRouter } from './routes/sites';
import { similarityRouter } from './routes/similarity';
import { createAdminRouter } from './routes/admin';
import { requireAdmin } from './auth';

const PORT = Number(process.env.PORT ?? 8787);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

async function main(): Promise<void> {
  await loadCatalogFromDisk();
  await connectDb(process.env.MONGODB_URI);

  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('tiny'));

  // Rate limiting matters more than usual here: the similarity endpoint is a public
  // calculator and the admin routes are token-guarded.
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.get('/api/health', (_req, res) => {
    void loadCatalogFromDisk()
      .then((catalog) => {
        res.json({
          status: 'ok',
          db: isDbReady() ? 'up' : 'down',
          sites: catalog.sites.length,
          comparators: catalog.comparators.length,
          criteria: catalog.criteria.length,
          uptime: Math.round(process.uptime()),
        });
      })
      .catch((error: unknown) => {
        res.status(500).json({ status: 'error', error: describeError(error) });
      });
  });

  app.use('/api', sitesRouter);
  app.use('/api', similarityRouter);
  app.use('/api/admin', createAdminRouter(requireAdmin(process.env.ADMIN_TOKEN)));

  app.use((_req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error('[error]', describeError(error));
      res.status(500).json({ error: 'internal error' });
    },
  );

  app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`);
    console.log(`[server] db: ${isDbReady() ? 'connected' : 'down — serving bundled catalog'}`);
    console.log(`[server] admin: ${process.env.ADMIN_TOKEN ? 'enabled' : 'disabled (ADMIN_TOKEN unset)'}`);
  });
}

main().catch((error: unknown) => {
  console.error('[server] failed to start:', describeError(error));
  process.exit(1);
});