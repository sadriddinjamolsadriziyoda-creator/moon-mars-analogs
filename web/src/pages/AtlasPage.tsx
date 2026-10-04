import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlanetGlobe } from '../globe/PlanetGlobe';
import { FiltersPanel } from '../components/FiltersPanel';
import { SidePanel } from '../components/SidePanel';
import { UI } from '../i18n/strings';
import { filterSites, useCatalog } from '../state/catalog';
import { useWeights, weightsFromSearch } from '../similarity/useWeights';
import { similarityScore } from '@shared/similarity';
import { useLocation } from 'react-router-dom';

export function AtlasPage() {
  const {
    sites,
    comparators,
    criteria,
    lang,
    filters,
    selectedSlug,
    targetSlug,
    targetExplicit,
    filtersOpen,
    setFilters,
    toggleTerrain,
    resetFilters,
    select,
    setFiltersOpen,
  } = useCatalog();
  const location = useLocation();
  const s = UI[lang];

  const visible = useMemo(() => filterSites(sites, filters, comparators), [sites, filters, comparators]);
  const selected = useMemo(() => sites.find((site) => site.slug === selectedSlug), [sites, selectedSlug]);
  const weights = useMemo(() => weightsFromSearch(location.search), [location.search]);

  /**
   * A card should report how similar the place is to what it is actually an analogue of.
   * Scoring every site against one globally selected target would show McMurdo Dry Valleys
   * under "Jezero crater" and hide that its closest match is the northern polar plain. The
   * user can still pin a target explicitly, and then that choice wins.
   */
  const closestTargetSlug = useMemo(() => {
    if (!selected || criteria.length === 0) return null;
    // Only among the analogues this site actually declares. Searching all 18 targets can
    // surface a higher score against a region the site was never compared to, which would put
    // a name in the card that contradicts the site's own "why it works" text.
    const candidates = comparators.filter((comparator) =>
      selected.analogs.some((analog) => analog.slug === comparator.slug),
    );
    let best: { slug: string; score: number } | null = null;
    for (const comparator of candidates) {
      const result = similarityScore(selected, comparator, criteria, weights);
      if (!best || result.score > best.score) best = { slug: comparator.slug, score: result.score };
    }
    return best?.slug ?? null;
  }, [selected, comparators, criteria, weights]);

  const effectiveTargetSlug = targetExplicit ? targetSlug : (closestTargetSlug ?? targetSlug);

  const target = useMemo(
    () => comparators.find((comparator) => comparator.slug === effectiveTargetSlug),
    [comparators, effectiveTargetSlug],
  );
  const { score } = useWeights(criteria, selected, target, weights);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select]);

  return (
    <div className="atlas">
      <FiltersPanel
        sites={visible}
        allSites={sites}
        filters={filters}
        open={filtersOpen}
        lang={lang}
        onChange={setFilters}
        onToggleTerrain={toggleTerrain}
        onReset={resetFilters}
      />

      <div className="atlas__stage">
        <button
          type="button"
          className="btn mobile-only"
          style={{ position: 'absolute', top: 12, left: 12, zIndex: 14 }}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          {s.filter_show}
        </button>

        <PlanetGlobe
          sites={visible}
          selectedSlug={selectedSlug}
          onSelect={(slug) => select(slug === selectedSlug ? null : slug)}
          focusCenter={selected ? selected.center : undefined}
        />

        <div className="legend">
          <div className="legend__row" style={{ fontWeight: 600, color: 'var(--text)' }}>
            {s.legend_title}
          </div>
          <div className="legend__row">
            <span className="toggle__swatch" style={{ background: '#e2703a' }} /> {s.mars}
          </div>
          <div className="legend__row">
            <span className="toggle__swatch" style={{ background: '#b9bdc4' }} /> {s.moon}
          </div>
          <div className="legend__row">
            <span className="toggle__swatch" style={{ background: '#8f7fd8' }} /> {s.both}
          </div>
          <div className="legend__row" style={{ fontSize: 11, opacity: 0.7 }}>
            {s.hint_rotate}
          </div>
          <Link className="legend__row" to="/compare" style={{ marginTop: 4 }}>
            {s.nav_compare} →
          </Link>
        </div>

        {selected ? (
          <SidePanel
            site={selected}
            lang={lang}
            criteria={criteria}
            comparator={target}
            result={score}
            onClose={() => select(null)}
          />
        ) : null}

        {visible.length === 0 ? (
          <div className="loading" style={{ pointerEvents: 'none' }}>
            {s.search_empty}
          </div>
        ) : null}
      </div>
    </div>
  );
}