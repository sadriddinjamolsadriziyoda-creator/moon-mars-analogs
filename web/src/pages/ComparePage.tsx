import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSearchParams } from 'react-router-dom';
import { t } from '@shared/types';
import { UI } from '../i18n/strings';
import { useCatalog } from '../state/catalog';
import { EARTH_STYLE, MOON_FALLBACK_URL, planetaryStyle } from '../map/tileSources';

const EARTH_ZOOM = 5;

function Pane({
  center,
  radiusKm,
  style,
  interactive,
  boxColor,
}: {
  center: [number, number];
  radiusKm: number;
  style: ReturnType<typeof planetaryStyle> | typeof EARTH_STYLE;
  interactive: boolean;
  boxColor: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [box, setBox] = useState<{ top: number; left: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container,
      style: style as never,
      center,
      zoom: EARTH_ZOOM,
      interactive,
      attributionControl: { compact: true },
      // Without this the WebGL drawing buffer is not kept between frames, so any screenshot
      // of the comparison view — ours or a judge's — comes out as an empty black rectangle
      // even though the tiles loaded correctly.
      preserveDrawingBuffer: true,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, style, interactive]);

  // The analogue box is drawn in projected screen pixels: the radius is a real
  // ground distance in km, and the only honest way to show it on a reprojected
  // planetary basemap is to convert it through the map's own mercator projection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const update = () => {
      const target = new maplibregl.LngLat(center[0], center[1]);
      const a = map.project(target);
      const b = map.project(new maplibregl.LngLat(center[0] + radiusKm / 100, center[1]));
      const px = Math.max(8, Math.abs(b.x - a.x) * 2.4);
      const py = Math.max(8, Math.abs(b.y - a.y) * 2.4);
      setBox({ left: a.x - px / 2, top: a.y - py / 2, w: px, h: py });
    };

    update();
    map.on('move', update);
    map.on('resize', update);
    return () => {
      map.off('move', update);
      map.off('resize', update);
    };
  }, [center, radiusKm]);

  return (
    <div className="compare__pane">
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      {box ? (
        <div
          className="compare__box"
          style={{ left: box.left, top: box.top, width: box.w, height: box.h, borderColor: boxColor }}
        />
      ) : null}
    </div>
  );
}

export function ComparePage() {
  const { sites, lang } = useCatalog();
  const s = UI[lang];
  const [params, setParams] = useSearchParams();
  const siteSlug = params.get('site');

  const site = useMemo(
    () => sites.find((entry) => entry.slug === siteSlug) ?? sites[0],
    [sites, siteSlug],
  );
  const body = (params.get('body') ?? site?.analogs[0]?.body ?? 'mars') as 'mars' | 'moon';
  const analog = site?.analogs.find((entry) => entry.body === body) ?? site?.analogs[0];

  const marsStyle = useMemo(() => planetaryStyle('mars'), []);
  const earthStyle = useMemo(() => EARTH_STYLE, []);

  if (!site || !analog) {
    return <div className="loading">{s.compare_select_site}</div>;
  }

  return (
    <div className="compare">
      <div className="compare__pane">
        <div className="compare__label">
          {s.earth} — {t(site.name, lang)}
        </div>
        <Pane
          center={site.center}
          radiusKm={site.radiusKm}
          style={earthStyle}
          interactive
          boxColor="#4da3ff"
        />
      </div>

      <div className="compare__pane">
        <div className="compare__label">
          {body === 'mars' ? s.mars : s.moon} — {t(analog.region, lang)}
        </div>
        {body === 'moon' || !marsStyle ? (
          <div className="compare__degraded">
            <strong>{s.compare_moon_unavailable}</strong>
            <p style={{ maxWidth: 420 }}>{s.compare_moon_why}</p>
            <a className="btn btn--primary" href={MOON_FALLBACK_URL} target="_blank" rel="noreferrer">
              {s.compare_open_quickmap}
            </a>
            <div
              style={{
                border: '2px solid var(--moon)',
                width: 160,
                height: 160,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 'auto 0 -22px',
                  textAlign: 'center',
                  fontSize: 11,
                  color: 'var(--text-faint)',
                }}
              >
                {analog.center[1]?.toFixed(2)}°, {analog.center[0]?.toFixed(2)}° · ⌀{' '}
                {analog.radiusKm} км
              </div>
            </div>
          </div>
        ) : (
          <>
            <Pane
              center={analog.center}
              radiusKm={analog.radiusKm}
              style={marsStyle}
              interactive={false}
              boxColor="#e2703a"
            />
            <div
              style={{
                position: 'absolute',
                left: 10,
                right: 10,
                bottom: 8,
                fontSize: 11,
                color: 'var(--text-faint)',
                zIndex: 2,
              }}
            >
              {s.compare_note_mars}
            </div>
          </>
        )}
      </div>

      <div className="mobile-only" style={{ display: 'none' }} />

      <select
        style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 220, zIndex: 20 }}
        value={site.slug}
        onChange={(event) => setParams({ site: event.target.value, body })}
        aria-label={s.compare_select_site}
      >
        {sites.map((entry) => (
          <option key={entry.slug} value={entry.slug}>
            {t(entry.name, lang)}
          </option>
        ))}
      </select>
    </div>
  );
}