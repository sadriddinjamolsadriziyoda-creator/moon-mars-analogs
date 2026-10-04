import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CRITERION_IDS, t, type CriterionId } from '@shared/types';
import { useCatalog } from '../state/catalog';
import { UI } from '../i18n/strings';
import { useWeights, weightsToSearch } from '../similarity/useWeights';

export function MethodPage() {
  const { sites, comparators, criteria, lang, selectedSlug, targetSlug } = useCatalog();
  const s = UI[lang];
  const [params, setParams] = useSearchParams();
  const [weights, setWeights] = useState<Partial<Record<CriterionId, number>>>(() => {
    const initial: Partial<Record<CriterionId, number>> = {};
    for (const id of CRITERION_IDS) {
      const raw = params.get(id);
      const value = raw === null ? NaN : Number(raw);
      if (Number.isFinite(value)) initial[id] = value;
    }
    return initial;
  });

  const site = useMemo(() => sites.find((entry) => entry.slug === selectedSlug), [sites, selectedSlug]);
  const target = useMemo(
    () => comparators.find((entry) => entry.slug === targetSlug),
    [comparators, targetSlug],
  );
  const { score } = useWeights(criteria, site, target, weights);

  const apply = (next: Partial<Record<CriterionId, number>>) => {
    setWeights(next);
    setParams(weightsToSearch(next, site ? `site=${site.slug}` : ''), { replace: true });
  };

  return (
    <div className="page">
      <div className="page__inner">
        <h2>{s.method_title}</h2>

        <h3>Как считается индекс</h3>
        <p>
          Каждая локация сравнивается с конкретной целью на Марсе или Луне. Для каждого из шести
          критериев считается процент совпадения, затем берётся взвешенная сумма.
        </p>

        <div className="formula">sᵢ = clamp(1 − |fᵢ − tᵢ| / Δᵢ, 0, 1)</div>
        <p>
          <strong>fᵢ</strong> — нормированное значение признака у земного места,{' '}
          <strong>tᵢ</strong> — то же у цели, <strong>Δᵢ</strong> — допуск из{' '}
          <code>criteria.json</code>. Если отличие меньше допуска, критерий засчитывается полностью;
          чем дальше отличие, тем меньше балл; за пределами допуска — ноль. Линейная рампа выбрана
          сознательно: её можно объяснить за секунду, и её можно перекалибровать вручную.
        </p>

        <div className="formula">S = 100 · Σ(wᵢ · sᵢ) / Σ wᵢ</div>
        <p>
          Деление на сумму весов, а не на константу — чтобы ползунки можно было двигать как
          угодно и всегда получать шкалу 0–100.
        </p>

        <div className="callout">
          <p>
            <strong>Пропущенный признак исключается целиком.</strong> Если у места или у цели нет
            измерения по критерию, он не считается нулём и не портит балл «средним» — его вес
            выпадает и из числителя, и из знаменателя. Иначе отсутствие данных выглядело бы как
            посредственное качество места, а это неправда.
          </p>
        </div>

        <h3>Геология считается не так</h3>
        <p>
          Для минералогии берётся <strong>косинус угла</strong> между L2-нормированными векторами
          состава (гематит, сульфаты, базальт, глины, ильменит). Это доля, а не направление:
          косинус здесь меряет схожесть «рецептуры», а не угол на карте.
        </p>

        <h3>Веса и допуски</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Критерий</th>
              <th style={{ textAlign: 'right' }}>Вес</th>
              <th style={{ textAlign: 'right' }}>Допуск Δ</th>
              <th>Источник значений</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion) => (
              <tr key={criterion.id}>
                <td>{t(criterion.label, lang)}</td>
                <td className="num">{criterion.weight.toFixed(2)}</td>
                <td className="num">{criterion.tolerance.toFixed(2)}</td>
                <td>{criterion.source}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Подкрутить под себя</h3>
        <p>
          {site && target
            ? `Сейчас: ${t(site.name, lang)} против «${t(target.name, lang)}».`
            : 'Выберите локацию на атласе, чтобы увидеть, как меняется балл.'}
        </p>

        {criteria.map((criterion) => {
          const current = weights[criterion.id] ?? criterion.weight;
          return (
            <div key={criterion.id} className="slider-row">
              <span>{t(criterion.label, lang)}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={current}
                onChange={(event) =>
                  apply({ ...weights, [criterion.id]: Number(event.target.value) })
                }
                aria-label={`${t(criterion.label, lang)} — вес`}
              />
              <span className="slider-row__val">{current.toFixed(2)}</span>
            </div>
          );
        })}

        {score ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="score">
              <span className="score__value">{score.score.toFixed(1)}</span>
              <span className="score__unit">из 100</span>
            </div>
            <button type="button" className="btn" onClick={() => apply({})} style={{ marginTop: 8 }}>
              Сбросить к исходным
            </button>
          </div>
        ) : null}

        <h3>Чего этот индекс не делает</h3>
        <ul style={{ color: 'var(--text-muted)', paddingLeft: 18 }}>
          <li>
            Ни одно место на Земле не воспроизводит Марс или Луну целиком: другой воздух, другая
            гравитация, другая радиация, другой масштаб.
          </li>
          <li>
            Качество данных (<code>evidence</code>) не входит в индекс — это разные вещи: точность
            измерения и похожесть.
          </li>
          <li>
            Признаки нормализованы на глаз по опубликованным диапазонам, а не выведены из
            пиксельных данных DEM/ГИС. Это приближение первого порядка, и оно так и подписано.
          </li>
          <li>Индекс показывает сходство по шести осям — не по всем возможным.</li>
        </ul>
      </div>
    </div>
  );
}