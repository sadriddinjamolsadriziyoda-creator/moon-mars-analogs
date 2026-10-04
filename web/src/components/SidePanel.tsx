import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MINERAL_KEYS,
  t,
  type Comparator,
  type Criterion,
  type Evidence,
  type Lang,
  type Site,
} from '@shared/types';
import type { SimilarityResult } from '@shared/types';
import { BreakdownTable, RadarChart } from './RadarChart';

const MINERAL_LABEL: Record<string, { ru: string; en: string }> = {
  hematite: { ru: 'гематит', en: 'hematite' },
  sulfate: { ru: 'сульфаты', en: 'sulfates' },
  basalt: { ru: 'базальт', en: 'basalt' },
  clay: { ru: 'глины', en: 'clays' },
  ilmenite: { ru: 'ильменит', en: 'ilmenite' },
};

const EVIDENCE_LABEL: Record<Evidence, { ru: string; en: string }> = {
  high: { ru: 'высокая', en: 'high' },
  medium: { ru: 'средняя', en: 'medium' },
  low: { ru: 'низкая', en: 'low' },
};

type Props = {
  site: Site;
  lang: Lang;
  criteria: Criterion[];
  comparator: Comparator | undefined;
  result: SimilarityResult | null;
  onClose: () => void;
};

export function SidePanel({ site, lang, criteria, comparator, result, onClose }: Props) {
  const [imgOk, setImgOk] = useState(true);
  const photo = site.photos[0];

  return (
    <aside className="sidepanel" aria-label={t(site.name, lang)}>
      <header className="sidepanel__head">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 19, letterSpacing: '-0.015em' }}>{t(site.name, lang)}</h2>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {site.country} · {site.center[1]?.toFixed(3)}°, {site.center[0]?.toFixed(3)}° · ⌀{' '}
              {site.radiusKm} км
            </div>
          </div>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {site.analogs.map((analog) => (
            <span key={`${analog.slug}-${analog.body}`} className={`chip chip--${analog.body}`}>
              {analog.body === 'mars' ? 'Марс' : 'Луна'}: {t(analog.region, lang)}
            </span>
          ))}
          {site.reviewStatus === 'needs-review' ? (
            <span className="chip chip--warn">Требует проверки</span>
          ) : null}
        </div>
      </header>

      <div className="sidepanel__body">
        {result ? (
          <section className="section">
            <div className="score">
              <span className="score__value">{result.score.toFixed(1)}</span>
              <span className="score__unit">из 100</span>
            </div>
            <div className="meter">
              <div className="meter__fill" style={{ width: `${Math.min(100, result.score)}%` }} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Сходство с «{comparator ? t(comparator.name, lang) : '—'}» по шести критериям. Пропущенный
              признак выпадает из расчёта, а не считается нулём.
            </div>
          </section>
        ) : (
          <section className="section">
            <div className="muted">
              Для этой локации не выбрана цель сравнения. Откройте «Поиск аналога», чтобы увидеть
              разбор баллов.
            </div>
          </section>
        )}

        {result && criteria.length > 0 ? (
          <section className="section">
            <h3 className="section__title">Разбор по критериям</h3>
            <RadarChart
              breakdown={result.breakdown}
              criteria={criteria}
              lang={lang}
              targetLabel={comparator ? t(comparator.name, lang) : ''}
            />
            <BreakdownTable breakdown={result.breakdown} criteria={criteria} lang={lang} />
          </section>
        ) : null}

        <section className="section">
          <h3 className="section__title">Чем похоже</h3>
          {site.analogs.length === 0 ? (
            <p className="muted">Аналоги пока не описаны.</p>
          ) : (
            site.analogs.map((analog) => (
              <div key={`${analog.slug}-detail`} className="card" style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {t(analog.region, lang)}
                  {comparator?.slug === analog.slug ? (
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {' '}
                      — цель сравнения
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: '0 0 6px' }}>{t(analog.whySimilar.summary, lang)}</p>
                <details className="reveal">
                  <summary>Подробнее</summary>
                  <p style={{ margin: 0 }}>{t(analog.whySimilar.detail, lang)}</p>
                  <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                    Радиус аналога: {analog.radiusKm} км · центр{' '}
                    {analog.center[1]?.toFixed(2)}°, {analog.center[0]?.toFixed(2)}°
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Link
                      className="btn"
                      to={`/compare?site=${site.slug}&body=${analog.body}`}
                      onClick={onClose}
                    >
                      Сравнить на карте
                    </Link>
                  </div>
                </details>
              </div>
            ))
          )}
        </section>

        <section className="section">
          <h3 className="section__title">Признаки места</h3>
          <table className="breakdown">
            <tbody>
              {criteria.map((criterion) => {
                const feature = site.features[criterion.id];
                return (
                  <tr key={criterion.id}>
                    <td>
                      <span className={`evid evid--${feature?.evidence ?? 'low'}`} aria-hidden />
                      {t(criterion.label, lang)}
                      {feature?.note ? (
                        <div className="breakdown__note">{t(feature.note, lang)}</div>
                      ) : null}
                    </td>
                    <td className="breakdown__num" style={{ textAlign: 'right', width: 74 }}>
                      {feature ? `${feature.value.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
            Цвет точки — качество данных: {EVIDENCE_LABEL[site.confidence].ru}. Оно не входит в
            индекс: точность измерения и похожесть — разные вещи.
          </div>
        </section>

        <section className="section">
          <h3 className="section__title">Минералогия</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MINERAL_KEYS.map((key) => {
              const value = site.geologyMaterials[key] ?? 0;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 78, fontSize: 12 }}>{MINERAL_LABEL[key]?.ru}</span>
                  <div className="meter" style={{ flex: 1 }}>
                    <div className="meter__fill" style={{ width: `${Math.min(100, value * 100)}%` }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, width: 34, textAlign: 'right' }}>
                    {value.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {photo ? (
          <section className="section">
            <h3 className="section__title">Фотография</h3>
            {imgOk ? (
              <img
                className="photo"
                src={photo.src}
                alt={t(photo.alt, lang)}
                loading="lazy"
                onError={() => setImgOk(false)}
              />
            ) : (
              <div className="photo photo--broken">Фотография не загрузилась</div>
            )}
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              {t(photo.credit, lang)} · {photo.license}
            </div>
          </section>
        ) : null}

        {site.missions.length > 0 ? (
          <section className="section">
            <h3 className="section__title">Миссии и исследования</h3>
            <ul className="sourcelist">
              {site.missions.map((mission, index) => (
                <li key={`${mission.org}-${index}`}>
                  {mission.url ? (
                    <a href={mission.url} target="_blank" rel="noreferrer">
                      {t(mission.what, lang)}
                    </a>
                  ) : (
                    t(mission.what, lang)
                  )}
                  <span className="sourcelist__org">
                    {mission.org}
                    {mission.year ? ` · ${mission.year}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="section">
          <h3 className="section__title">Источники</h3>
          <ul className="sourcelist">
            {site.sources.map((source, index) => (
              <li key={`${source.url}-${index}`}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <span className="sourcelist__org">
                  {source.org}
                  {source.accessed ? ` · accessed ${source.accessed}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="sidepanel__foot">
        <Link className="btn btn--primary" to={`/method?site=${site.slug}`}>
          Как считается индекс
        </Link>
        <button type="button" className="btn" onClick={onClose}>
          Закрыть
        </button>
      </footer>
    </aside>
  );
}