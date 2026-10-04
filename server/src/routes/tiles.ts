import { Router, type Request, type Response } from 'express';

/**
 * Mars basemap tiles, relayed through the API.
 *
 * The MOLA bucket answers 200 with a real PNG but sends no Access-Control-Allow-Origin, and a
 * WebGL texture needs CORS. Pointed straight at the bucket the comparison map renders black,
 * even though every status-code probe calls the source healthy. Relaying server-side makes
 * the browser request same-origin, which fixes it in development and in production alike —
 * there is no dev-only proxy to remember to configure.
 *
 * The extension is deliberately absent from the route pattern: Express 5 runs on
 * path-to-regexp v8, where a parameter glued to a literal (":y.png") does not match and the
 * route silently falls through to the 404 handler. The response sets image/png itself, and
 * MapLibre never inspects the extension of a raster tile URL.
 *
 * z/x/y arrive as strings, so each segment is validated as digits before it can reach the
 * upstream URL: this route is a public open relay and must not be usable to fetch arbitrary
 * hosts or to smuggle a path.
 */

const TILE_HOST = 's3-eu-west-1.amazonaws.com';
const TILE_PREFIX = '/whereonmars.cartodb.net/mola-color/';
const ZOOM_MIN = 0;
const ZOOM_MAX = 8;

const isTilePart = (value: string): boolean => /^\d{1,2}$/.test(value);

export const tilesRouter: Router = Router();

tilesRouter.get('/tiles/mars/:z/:x/:y', async (req: Request, res: Response) => {
  const { z, x, y } = req.params as { z: string; x: string; y: string };

  if (!isTilePart(z) || !isTilePart(x) || !isTilePart(y)) {
    res.status(400).json({ error: 'invalid tile coordinates' });
    return;
  }

  const zoom = Number(z);
  if (zoom < ZOOM_MIN || zoom > ZOOM_MAX) {
    res.status(400).json({ error: `zoom out of range: ${ZOOM_MIN}..${ZOOM_MAX}` });
    return;
  }

  // Cap the axis so a caller cannot ask for coordinates far outside any real tile and get a
  // 404 storm against the bucket.
  const axisLimit = 2 ** zoom;
  if (Number(x) >= axisLimit || Number(y) >= axisLimit) {
    res.status(400).json({ error: 'tile coordinates outside the zoom level' });
    return;
  }

  const upstream = `https://${TILE_HOST}${TILE_PREFIX}${zoom}/${x}/${y}.png`;

  try {
    const response = await fetch(upstream, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok || !response.body) {
      res.status(response.status === 404 ? 404 : 502).json({ error: 'upstream tile unavailable' });
      return;
    }

    res.setHeader('content-type', 'image/png');
    res.setHeader('cache-control', 'public, max-age=86400, immutable');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.status(504).json({ error: 'upstream tile request timed out' });
  }
});