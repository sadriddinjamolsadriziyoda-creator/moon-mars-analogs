import type { StyleSpecification } from 'maplibre-gl';
import type { Body } from '@shared/types';

/**
 * Every source below was probed from the build machine on 2026-10-04 by inspecting the
 * response BODY, not the status code. That distinction matters: services.arcgisonline.com
 * answers 200 for the Moon and Mars paths while the body is
 * `{"error":{"code":404,"message":"Service not found"}}`, so a status-code-only check
 * would have shipped two dead basemaps.
 */

const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

/**
 * Mars: MOLA colour mosaic, verified 200 image/png.
 *
 * Relayed by the API (server/src/routes/tiles.ts) rather than fetched from the bucket: the
 * bucket sends no Access-Control-Allow-Origin, which a WebGL texture request requires, so the
 * map rendered black while every status-code probe reported the source as healthy. Going
 * through the API works identically in development and in production.
 */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const MARS_TILES = `${API_BASE}/api/tiles/mars/{z}/{x}/{y}`;

/**
 * Moon: no working public tile source exists.
 *
 * Probed and dead: mars.nasa.gov/wmts (403), wac.earth.nasa.gov (no response),
 * lroc.imgspear.com (no response), api.mars.nasa.gov (no response), jpl.nasa.gov (403),
 * svs.gsfc.nasa.gov (timeout), services.arcgisonline.com Moon/* (404 inside a 200 body).
 * NASA GIBS was checked too and carries no lunar or martian layers — Earth only.
 *
 * So the Moon pane is declared absent rather than pointed at something that renders grey.
 * A fabricated basemap would be worse than no basemap: the project's central claim is
 * that every statement is sourced.
 */
export const MOON_TILE_SOURCE: string | null = null;

export const MOON_FALLBACK_URL = 'https://quickmap.lroc.nasa.gov/';

export const EARTH_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#07090f' } },
    { id: 'imagery', type: 'raster', source: 'esri' },
  ],
};

export function planetaryStyle(body: 'mars' | 'moon'): StyleSpecification | null {
  if (body === 'moon') return null;

  return {
    version: 8,
    sources: {
      mola: {
        type: 'raster',
        tiles: [MARS_TILES],
        tileSize: 256,
        minzoom: 3,
        maxzoom: 6,
        attribution: 'MOLA — NASA / Where on Mars',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#0d0a08' } },
      { id: 'mola', type: 'raster', source: 'mola' },
    ],
  };
}

export function bodyAttribution(body: Body): string {
  if (body === 'earth') return 'Imagery © Esri';
  if (body === 'mars') return 'MOLA — NASA / Where on Mars';
  return `LROC — NASA (${MOON_FALLBACK_URL})`;
}

export { OSM_ATTRIBUTION };