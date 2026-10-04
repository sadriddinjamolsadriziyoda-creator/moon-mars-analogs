import { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeInstance } from 'globe.gl';
import type { Site } from '@shared/types';
import { siteBodies } from '../state/catalog';

/**
 * Textures are vendored under web/public/textures instead of pulled from a CDN.
 *
 * The CDN paths that used to be here did not exist — three@0.180 ships only
 * examples/fonts and examples/jsm in its npm tarball, so every request 404'd and the globe
 * rendered black. These three files were downloaded from the three-globe example assets and
 * verified with `file`: earth-blue-marble.jpg and earth-night.jpg are 4096x2048 equirectangular
 * JPEG, earth-topology.png is 2048x1024 grayscale.
 *
 * Vendoring also removes a network dependency from the demo: a judge on conference wifi should
 * not get a black planet because a CDN is blocked.
 *
 * There is no cloud texture in that asset set, so there is no cloud layer. The layer was removed
 * rather than left as a checkbox that silently does nothing.
 */
const COLOR = '/textures/earth-blue-marble.jpg';
const BUMP = '/textures/earth-topology.png';
const NIGHT = '/textures/earth-night.jpg';

export type Layers = { atmosphere: boolean; nightLights: boolean; bump: boolean };

const DEFAULT_LAYERS: Layers = { atmosphere: true, nightLights: false, bump: true };


export function markerColor(site: Site): string {
  const bodies = siteBodies(site);
  if (bodies.has('mars') && bodies.has('moon')) return '#8f7fd8';
  if (bodies.has('mars')) return '#e2703a';
  return '#b9bdc4';
}


type Props = {
  sites: Site[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  focusCenter?: [number, number];
};

export function PlanetGlobe({ sites, selectedSlug, onSelect, focusCenter }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeInstance | undefined>(undefined);
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS);
  const [ready, setReady] = useState(false);

  // The handler lives in a ref because globe.gl re-binds its object API on every props()
  // call; closing over onSelect directly would capture a stale closure after a re-render.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const globe = new Globe(container, { animateIn: true });
    globeRef.current = globe;

    globe
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#6ba8ff')
      .atmosphereAltitude(0.22)
      .globeImageUrl(COLOR)
      .bumpImageUrl(BUMP)
      .enablePointerInteraction(true)
      .onGlobeReady(() => setReady(true));

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minDistance = 220;
    controls.maxDistance = 420;

    // Auto-rotate stops on the first pointer-down: a globe that keeps spinning under the
    // cursor makes the small markers very hard to hit.
    const stopSpin = () => {
      controls.autoRotate = false;
      container.removeEventListener('pointerdown', stopSpin);
    };
    container.addEventListener('pointerdown', stopSpin);

    const observer = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = container;
      if (width > 0 && height > 0) globe.width(width).height(height);
    });
    observer.observe(container);
    globe.width(container.clientWidth).height(container.clientHeight);

    return () => {
      observer.disconnect();
      container.removeEventListener('pointerdown', stopSpin);
      globe._destructor?.();
      globeRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.showAtmosphere(layers.atmosphere);
    globe.bumpImageUrl(layers.bump ? BUMP : '');

    // Both textures are equirectangular, which is what customLayerData expects.
    // three-globe 2.45 has no customLayerAltitude, so overlays sit on the default
    // altitude and stay visible only from far enough away to see the whole planet.
    const overlays = [
      layers.nightLights ? { url: NIGHT, blending: 1 as const, opacity: 0.85 } : null,
    ].filter((entry): entry is { url: string; blending: 1; opacity: number } => entry !== null);

    globe.customLayerData(overlays);
  }, [layers, ready]);

  const markers = useMemo(
    () =>
      sites.map((site) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'globe-marker';
        el.setAttribute('aria-label', site.name.en);
        el.title = site.name.en;
        el.innerHTML = '<span class="globe-marker__dot"></span>';
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          onSelectRef.current(site.slug);
        });
        return { slug: site.slug, el, lat: site.center[1] ?? 0, lng: site.center[0] ?? 0 };
      }),
    [sites],
  );

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return undefined;

    // three-globe 2.45 exposes a single htmlElement(accessor) rather than an
    // htmlElements(array): the accessor is called once per datum, so the datum must
    // carry the element itself.
    globe
      .htmlElementsData(
        markers.map((marker) => ({
          lat: marker.lat,
          lng: marker.lng,
          el: marker.el,
        })),
      )
      .htmlElement((datum: object) => {
        // Typed as (d: object) => HTMLElement, so there is no string branch to handle and
        // no empty-string fallback. Every datum carries an element; the ?? exists only so a
        // malformed datum cannot hand three.js undefined.
        return (datum as { el?: HTMLElement }).el ?? document.createElement('span');
      })
      // three-globe 2.45 hands this modifier (element, isVisible) and no coordinates, so a
      // horizon test is not possible here. Markers on the far side stay rendered but the
      // globe rotates to any site on click, which is what makes them reachable anyway.
      .htmlElementVisibilityModifier(() => true);

    return () => {
      globe.htmlElement('');
    };
  }, [markers, ready]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    for (const marker of markers) {
      marker.el.classList.toggle('globe-marker--selected', marker.slug === selectedSlug);
    }
    if (selectedSlug) {
      globe.controls().autoRotate = false;
      const site = markers.find((marker) => marker.slug === selectedSlug);
      if (site) globe.pointOfView({ lat: site.lat, lng: site.lng, altitude: 2.0 }, 700);
    }
  }, [markers, selectedSlug]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !focusCenter) return;
    globe.pointOfView({ lat: focusCenter[1] ?? 0, lng: focusCenter[0] ?? 0, altitude: 1.9 }, 900);
  }, [focusCenter]);

  const toggleLabels: Array<[keyof Layers, string]> = [
    ['atmosphere', 'Атмосфера'],
    ['nightLights', 'Ночные огни'],
    ['bump', 'Рельеф'],
  ];

  return (
    <div className="globe">
      <div ref={containerRef} className="globe__canvas" />
      <div className="layerbar">
        {toggleLabels.map(([key, label]) => (
          <label key={key} className="layerbar__item">
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={(event) => setLayers((prev) => ({ ...prev, [key]: event.target.checked }))}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}