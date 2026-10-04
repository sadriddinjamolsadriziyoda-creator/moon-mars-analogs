import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@shared/types';
import { UI } from '../i18n/strings';
import { useCatalog } from '../state/catalog';
import { useRanking, weightsFromSearch } from '../similarity/useWeights';
import { useLocation } from 'react-router-dom';

export function SearchPage() {
  const { sites, comparators, criteria, lang, targetSlug, setTarget } = useCatalog();
  const location = useLocation();
  const s = UI[lang];
  const weights = useMemo(() => weightsFromSearch(location.search), [location.search]);

  const target = useMemo(
    () => comparators.find((comparator) => comparator.slug === targetSlug),
    [comparators, targetSlug],
  );
  const top = useRanking(sites, target, criteria, weights, 5);

  const marsTargets = comparators.filter((comparator) => comparator.body === 'mars');
  const moonTargets = comparators.filter((comparator) => comparator.body === 'moon');

  return (
    <div className="page">
      <div className="page__inner">
        <h2>{s.search_top}</h2>
        <p>{s.search_intro}</p>

        <div className="field" style={{ maxWidth: 460 }}>
          <label className="field__label" htmlFor="target-select">
            {s.search_target}
          </label>
          <select id="target-select" value={targetSlug ?? ''} onChange={(event) => setTarget(event.target.value)}>
            <optgroup label="Марс">
              {marsTargets.map((comparator) => (
                <option key={comparator.slug} value={comparator.slug}>
                  {t(comparator.name, lang)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Луна">
              {moonTargets.map((comparator) => (
                <option key={comparator.slug} value={comparator.slug}>
                  {t(comparator.name, lang)}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {target ? (
          <>
            <div className="callout">
              <p>{t(target.description, lang)}</p>
            </div>

            <h3>{top.length > 0 ? `Топ-5 для «${t(target.name, lang)}»` : ''}</h3>
            {top.map((result, index) => {
              const site = sites.find((entry) => entry.slug === result.slug);
              if (!site) return null;
              return (
                <Link
                  key={result.slug}
                  className="resultrow"
                  to={`/?site=${result.slug}`}
                  style={{ display: 'flex' }}
                >
                  <span className="resultrow__rank">{index + 1}</span>
                  <span className="resultrow__name">{t(site.name, lang)}</span>
                  <span className="chip">{site.country}</span>
                  <span className="resultrow__score">{result.score.toFixed(1)}</span>
                </Link>
              );
            })}
          </>
        ) : (
          <p className="muted">Выберите цель.</p>
        )}
      </div>
    </div>
  );
}