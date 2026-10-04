import { useMemo } from 'react';
import { t } from '@shared/types';
import { useCatalog } from '../state/catalog';

export function LicensesPage() {
  const { sites, lang } = useCatalog();

  const all = useMemo(() => {
    const seen = new Map<string, { title: string; org: string; url: string }>();
    for (const site of sites) {
      for (const source of site.sources) {
        if (!seen.has(source.url)) {
          seen.set(source.url, { title: source.title, org: source.org, url: source.url });
        }
      }
    }
    return [...seen.values()].sort((a, b) => a.org.localeCompare(b.org));
  }, [sites]);

  const photos = useMemo(() => {
    const byLicense = new Map<string, number>();
    for (const site of sites) {
      for (const photo of site.photos) {
        byLicense.set(photo.license, (byLicense.get(photo.license) ?? 0) + 1);
      }
    }
    return [...byLicense.entries()].sort((a, b) => b[1] - a[1]);
  }, [sites]);

  return (
    <div className="page">
      <div className="page__inner">
        <h2>Источники и лицензии</h2>
        <p>
          Каждое утверждение в атласе привязано к источнику. Ниже — уникальные источники по всем{' '}
          {sites.length} локациям ({all.length} шт.).
        </p>

        <div className="callout">
          <p>
            <strong>Честное замечание о текстурах глобуса.</strong> Текстуры планет подгружаются
            с CDN three.js. В каталоге `threejs.org/examples/textures/planets/` нет файла с
            атрибуцией, поэтому мы не заявляем лицензию, которую не смогли проверить. Текстуры — не
            данные: карта, карточки, индекс и радар работают и без них.
          </p>
        </div>

        <h3>Фотографии</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Лицензия</th>
              <th style={{ textAlign: 'right' }}>Снимков</th>
            </tr>
          </thead>
          <tbody>
            {photos.map(([license, count]) => (
              <tr key={license}>
                <td>{license}</td>
                <td className="num">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12 }}>
          Авторство каждого снимка указано в карточке локации.
        </p>

        <h3>Источники данных</h3>
        <ul className="sourcelist">
          {all.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
              <span className="sourcelist__org">{source.org}</span>
            </li>
          ))}
        </ul>

        <h3>Программные зависимости</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Пакет</th>
              <th>Лицензия</th>
              <th>Зачем</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>globe.gl / three.js</td>
              <td>MIT</td>
              <td>3D-глобус</td>
            </tr>
            <tr>
              <td>maplibre-gl</td>
              <td>BSD-3-Clause</td>
              <td>Сравнительный режим</td>
            </tr>
            <tr>
              <td>React</td>
              <td>MIT</td>
              <td>Интерфейс</td>
            </tr>
            <tr>
              <td>Recharts</td>
              <td>MIT</td>
              <td>Радар-диаграмма</td>
            </tr>
            <tr>
              <td>MOLA (Mars Orbiter Laser Altimeter)</td>
              <td>NASA public domain</td>
              <td>Тайлы Марса в сравнении</td>
            </tr>
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12 }}>
          Фотографии: {sites.filter((site) => site.photos.length > 0).length} локаций снабжены снимком с
          указанным авторством — {t({ ru: 'проверяйте по карточкам', en: 'check the cards', uz: 'kartalarda tekshiring' }, lang)}.
        </p>
      </div>
    </div>
  );
}