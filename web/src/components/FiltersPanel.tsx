import { TERRAIN_TYPES, type Lang, type Site, type TerrainType } from '@shared/types';
import { interpolate } from '../i18n/strings';
import { UI } from '../i18n/strings';
import { countries, type BodyFilter, type Filters } from '../state/catalog';

const TERRAIN_LABEL: Record<TerrainType, { ru: string; en: string; uz: string }> = {
  desert: { ru: 'Пустыня', en: 'Desert', uz: 'Cho‘l' },
  volcano: { ru: 'Вулкан', en: 'Volcano', uz: 'Vulkan' },
  cave: { ru: 'Пещеры', en: 'Caves', uz: 'G‘orlar' },
  'impact-crater': { ru: 'Ударный кратер', en: 'Impact crater', uz: 'Ustki krater' },
  polar: { ru: 'Полярная', en: 'Polar', uz: 'Quyosh' },
  'acid-saline-lake': { ru: 'Кислотно-солёное озеро', en: 'Acid-saline lake', uz: 'Kislota-sho‘r ko‘l' },
  'dry-valley': { ru: 'Сухая долина', en: 'Dry valley', uz: 'Quruq vodiysi' },
  'basalt-plain': { ru: 'Базальтовое плато', en: 'Basalt plain', uz: 'Bazalt tekisligi' },
};

const BODIES: Array<{ id: BodyFilter; label: string; color: string }> = [
  { id: 'all', label: 'Луна и Марс', color: '#8f7fd8' },
  { id: 'mars', label: 'Марс', color: '#e2703a' },
  { id: 'moon', label: 'Луна', color: '#b9bdc4' },
];

type Props = {
  sites: Site[];
  allSites: Site[];
  filters: Filters;
  open: boolean;
  lang: Lang;
  onChange: (patch: Partial<Filters>) => void;
  onToggleTerrain: (terrain: TerrainType) => void;
  onReset: () => void;
};

export function FiltersPanel({
  sites,
  allSites,
  filters,
  open,
  lang,
  onChange,
  onToggleTerrain,
  onReset,
}: Props) {
  const s = UI[lang];
  const terrainCounts = new Map<TerrainType, number>();
  for (const site of allSites) {
    for (const type of site.terrainType) terrainCounts.set(type, (terrainCounts.get(type) ?? 0) + 1);
  }

  return (
    <div className={open ? 'atlas__filters atlas__filters--open' : 'atlas__filters'}>
      <div className="filters__group">
        <h3 className="filters__title">{s.filters_title}</h3>
        <input
          type="search"
          placeholder={s.filter_search}
          value={filters.query}
          onChange={(event) => onChange({ query: event.target.value })}
          aria-label={s.filter_search}
        />
      </div>

      <div className="filters__group">
        <h3 className="filters__title">{s.filter_body}</h3>
        <div className="toggles">
          {BODIES.map((body) => {
            const count = allSites.filter((site) =>
              body.id === 'all'
                ? true
                : site.analogs.some((analog) => analog.body === body.id),
            ).length;
            return (
              <button
                key={body.id}
                type="button"
                className={`toggle ${filters.bodies === body.id ? 'toggle--on' : ''}`}
                onClick={() => onChange({ bodies: body.id })}
                aria-pressed={filters.bodies === body.id}
              >
                <span className="toggle__swatch" style={{ background: body.color }} />
                {lang === 'en' ? body.label.replace('Луна и Марс', 'Moon & Mars').replace('Марс', 'Mars').replace('Луна', 'Moon') : lang === 'uz' ? (body.id === 'all' ? 'Oy va Mars' : body.id === 'mars' ? 'Mars' : 'Oy') : body.label}
                <span className="toggle__count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filters__group">
        <h3 className="filters__title">{s.filter_terrain}</h3>
        <div className="toggles">
          {TERRAIN_TYPES.filter((type) => terrainCounts.has(type)).map((type) => {
            const on = filters.terrains.includes(type);
            const label = lang === 'ru' ? TERRAIN_LABEL[type].ru : lang === 'uz' ? TERRAIN_LABEL[type].uz : TERRAIN_LABEL[type].en;
            return (
              <button
                key={type}
                type="button"
                className={`toggle ${on ? 'toggle--on' : ''}`}
                onClick={() => onToggleTerrain(type)}
                aria-pressed={on}
              >
                <span className="toggle__swatch" style={{ background: on ? '#e2703a' : '#2e3a52' }} />
                {label}
                <span className="toggle__count">{terrainCounts.get(type)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filters__group">
        <h3 className="filters__title">{s.filter_country}</h3>
        <select
          value={filters.country ?? ''}
          onChange={(event) => onChange({ country: event.target.value || null })}
          aria-label={s.filter_country}
        >
          <option value="">—</option>
          {countries(allSites).map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      <div className="filters__group">
        <button type="button" className="btn" style={{ width: '100%' }} onClick={onReset}>
          {s.filter_reset}
        </button>
        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          {interpolate(s.result_count, { n: sites.length, total: allSites.length })}
        </div>
      </div>
    </div>
  );
}