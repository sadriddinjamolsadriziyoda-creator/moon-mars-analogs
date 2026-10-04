import type { Lang } from '@shared/types';

const RU = {
    tagline: 'Интерактивный атлас земных аналогов Луны и Марса',
    nav_atlas: 'Атлас',
    nav_compare: 'Сравнение',
    nav_method: 'Методика',
    nav_search: 'Поиск аналога',
    nav_licenses: 'Лицензии',

    offline_banner: 'API недоступен — работаем на встроенной копии каталога. Все расчёты и данные те же самые.',
    online_banner: 'Каталог загружен с сервера.',

    filters_title: 'Фильтры',
    filter_body: 'Сравнение с',
    filter_terrain: 'Тип местности',
    filter_country: 'Страна',
    filter_search: 'Поиск по названию',
    filter_reset: 'Сбросить',
    filter_show: 'Фильтры',
    result_count: 'Показано {n} из {total}',

    mars: 'Марс',
    moon: 'Луна',
    both: 'Луна и Марс',
    earth: 'Земля',

    card_why: 'Чем похоже',
    card_why_detail: 'Подробнее',
    card_criteria: 'Разбор по критериям',
    card_features: 'Признаки места',
    card_minerals: 'Минералогия',
    card_missions: 'Миссии и исследования',
    card_sources: 'Источники',
    card_photo: 'Фотография',
    card_photo_broken: 'Фотография не загрузилась',
    card_open_compare: 'Сравнить на карте',
    card_close: 'Закрыть',
    card_country: 'Страна',
    card_radius: 'Радиус области',
    card_coords: 'Координаты',
    card_no_analogs: 'Для этой локации аналоги пока не описаны.',
    card_needs_review: 'Данные требуют проверки',
    card_confidence: 'Уверенность данных',
    card_why_summary_is_region: 'Аналог:',

    evidence_high: 'высокая',
    evidence_medium: 'средняя',
    evidence_low: 'низкая',
    evidence_label: 'Качество данных',
    evidence_explain:
      'Уверенность показывает, насколько прочно значение признака опирается на источник. Она не входит в индекс сходства: точность измерения и похожесть — разные вещи.',

    search_intro:
      'Выберите цель на Марсе или Луне — атлас покажет пять самых похожих земных мест с разбором баллов.',
    search_target: 'Цель',
    search_top: 'Топ-5 аналогов',
    search_empty: 'Ничего не найдено',

    score_of: 'Индекс сходства',
    score_percent: 'из 100',
    score_explain:
      'Взвешенная сумма шести критериев. Отсутствующий признак не считается нулём и не портит балл — он выпадает из суммы весов.',
    criterion_raw: 'Разница',
    criterion_sim: 'Похоже',
    criterion_weight: 'Вес',
    criterion_contrib: 'Вклад',
    criterion_missing: 'нет данных',
    criterion_no_data_explain:
      'У этого места или у цели нет измерения по критерию, поэтому критерий исключён из расчёта, а его вес не входит в знаменатель.',

    compare_intro: 'Слева Земля, справе небесное тело. Рамка — область аналога.',
    compare_loading: 'Загрузка карты…',
    compare_moon_unavailable:
      'Публичного тайлового сервиса Луны, доступного без ключа, не существует. Мы не будем показывать пустую или выдуманную карту.',
    compare_moon_why:
      'Проверены и не отвечают: mars.nasa.gov/wmts, wac.earth.nasa.gov, lroc.imgspear.com, api.mars.nasa.gov, jpl.nasa.gov, svs.gsfc.nasa.gov и все службы ArcGIS для Луны.',
    compare_open_quickmap: 'Открыть LROC QuickMap',
    compare_note_mars:
      'Тайлы MOLA через whereonmars.cartodb.net. Доступны только зуммы 3–6; на других зумах подложка не подгружается.',
    compare_select_site: 'Выберите локацию',

    method_title: 'Методика',
    licenses_title: 'Источники и лицензии',

    loading: 'Загрузка каталога…',
    load_failed: 'Не удалось загрузить каталог даже из встроенной копии.',
    legend_title: 'Легенда',
    hint_rotate: 'Тяните, чтобы вращать · колесо, чтобы приблизить',
} as const;

/**
 * Keys are derived from the Russian table, so `s.anything` is a string rather than
 * `string | undefined` and a missing translation in `en`/`uz` is a type error instead of
 * a blank label in the UI.
 */
export type Strings = { [K in keyof typeof RU]: string };

export const UI: Record<Lang, Strings> = {
  ru: RU,

  en: {
    tagline: 'Interactive atlas of terrestrial analogues for the Moon and Mars',
    nav_atlas: 'Atlas',
    nav_compare: 'Compare',
    nav_method: 'Method',
    nav_search: 'Find analogue',
    nav_licenses: 'Licenses',

    offline_banner: 'API unreachable — running on the bundled catalog. Same data, same math.',
    online_banner: 'Catalog loaded from the server.',

    filters_title: 'Filters',
    filter_body: 'Analogue of',
    filter_terrain: 'Terrain type',
    filter_country: 'Country',
    filter_search: 'Search by name',
    filter_reset: 'Reset',
    filter_show: 'Filters',
    result_count: 'Showing {n} of {total}',

    mars: 'Mars',
    moon: 'Moon',
    both: 'Moon & Mars',
    earth: 'Earth',

    card_why: 'Why it works',
    card_why_detail: 'More detail',
    card_criteria: 'Criterion breakdown',
    card_features: 'Site features',
    card_minerals: 'Mineralogy',
    card_missions: 'Missions & research',
    card_sources: 'Sources',
    card_photo: 'Photograph',
    card_photo_broken: 'Photograph failed to load',
    card_open_compare: 'Compare on map',
    card_close: 'Close',
    card_country: 'Country',
    card_radius: 'Area radius',
    card_coords: 'Coordinates',
    card_no_analogs: 'No analogues described for this site yet.',
    card_needs_review: 'Data needs review',
    card_confidence: 'Data confidence',
    card_why_summary_is_region: 'Analogue:',

    evidence_high: 'high',
    evidence_medium: 'medium',
    evidence_low: 'low',
    evidence_label: 'Data quality',
    evidence_explain:
      'Confidence says how firmly a feature value rests on its source. It is not part of the similarity index: measurement precision and similarity are different things.',

    search_intro:
      'Pick a target on Mars or the Moon — the atlas returns the five closest terrestrial sites with a score breakdown.',
    search_target: 'Target',
    search_top: 'Top 5 analogues',
    search_empty: 'Nothing found',

    score_of: 'Similarity index',
    score_percent: 'out of 100',
    score_explain:
      'A weighted sum of six criteria. A missing measurement is neither scored zero nor allowed to drag the result down — it leaves the weight sum entirely.',
    criterion_raw: 'Gap',
    criterion_sim: 'Match',
    criterion_weight: 'Weight',
    criterion_contrib: 'Contribution',
    criterion_missing: 'no data',
    criterion_no_data_explain:
      'Neither the site nor the target has a measurement for this criterion, so it is dropped from the calculation and its weight leaves the denominator.',

    compare_intro: 'Earth on the left, the other body on the right. The box is the analogue region.',
    compare_loading: 'Loading map…',
    compare_moon_unavailable:
      'There is no public lunar tile service reachable without an API key. We will not show a blank or invented map.',
    compare_moon_why:
      'Checked and unresponsive: mars.nasa.gov/wmts, wac.earth.nasa.gov, lroc.imgspear.com, api.mars.nasa.gov, jpl.nasa.gov, svs.gsfc.nasa.gov and every ArcGIS lunar service.',
    compare_open_quickmap: 'Open LROC QuickMap',
    compare_note_mars:
      'MOLA tiles via whereonmars.cartodb.net. Only zooms 3–6 are available; the basemap does not load outside that range.',
    compare_select_site: 'Select a site',

    method_title: 'Methodology',
    licenses_title: 'Sources & licenses',

    loading: 'Loading catalog…',
    load_failed: 'Could not load the catalog, not even from the bundled copy.',
    legend_title: 'Legend',
    hint_rotate: 'Drag to rotate · scroll to zoom',
  },

  uz: {
    tagline: 'Oy va Mars uchun Yerning analog muhiti interaktiv atlasi',
    nav_atlas: 'Atlas',
    nav_compare: 'Taqqoslash',
    nav_method: 'Metodika',
    nav_search: 'Analog izlash',
    nav_licenses: 'Litsenziya',

    offline_banner: "API ishlamayapti — katalog ichki nusxadan yuklanmoqda. Ma'lumot va hisob-kitob bir xil.",
    online_banner: 'Katalog serverdan yuklandi.',

    filters_title: 'Filtrlar',
    filter_body: 'Analog',
    filter_terrain: 'Yer yuzasi turi',
    filter_country: 'Davlat',
    filter_search: 'Nomi bo‘yicha qidirish',
    filter_reset: 'Tozalash',
    filter_show: 'Filtrlar',
    result_count: '{total} tadan {n} ta ko‘rsatilmoqda',

    mars: 'Mars',
    moon: 'Oy',
    both: 'Oy va Mars',
    earth: 'Yer',

    card_why: 'Nima uchun o‘xshaydi',
    card_why_detail: 'Batafsil',
    card_criteria: 'Mezonlar bo‘yicha tahlil',
    card_features: 'Joy xususiyatlari',
    card_minerals: 'Mineralogiya',
    card_missions: 'Misyonlar va tadqiqotlar',
    card_sources: 'Manbalar',
    card_photo: 'Rasm',
    card_photo_broken: 'Rasm yuklanmadi',
    card_open_compare: 'Xaritada taqqoslash',
    card_close: 'Yopish',
    card_country: 'Davlat',
    card_radius: 'Hudud radiusi',
    card_coords: 'Koordinatalar',
    card_no_analogs: 'Bu joy uchun analoglar hali tasvirlanmagan.',
    card_needs_review: 'Ma’lumotlar tekshirilishi kerak',
    card_confidence: 'Ma’lumot ishonchliligi',
    card_why_summary_is_region: 'Analog:',

    evidence_high: 'yuqori',
    evidence_medium: 'o‘rta',
    evidence_low: 'past',
    evidence_label: 'Ma’lumot sifati',
    evidence_explain:
      'Ishonchlilik qiymat manbaga qanchalik tayanishini ko‘rsatadi. U o‘xshashlik indeksiga kirmaydi: o‘lchov aniqligi va o‘xshashlik — turli narsalar.',

    search_intro:
      'Mars yoki Oydan maqsadni tanlang — atlas eng o‘xshash besh yer joyini va ballarning tafsilotini ko‘rsatadi.',
    search_target: 'Maqsad',
    search_top: 'Eng yaqin 5 analog',
    search_empty: 'Hech narsa topilmadi',

    score_of: 'O‘xshashlik indeksi',
    score_percent: '100 dan',
    score_explain:
      'Olti mezonning vaznli yig‘indisi. O‘lchov yo‘q mezon ham nolga tenglanmaydi, ham ballni pasaytirmaydi — u vazm yig‘indisidan chiqariladi.',
    criterion_raw: 'Farq',
    criterion_sim: 'O‘xshashlik',
    criterion_weight: 'Vazn',
    criterion_contrib: 'Kiritma',
    criterion_missing: 'ma’lumot yo‘q',
    criterion_no_data_explain:
      'Bu mezon bo‘yicha joyda ham, maqsadda ham o‘lchov yo‘q, shuning uchun u hisobdan chiqariladi va vazni maxrajga kirmaydi.',

    compare_intro: 'Chapda Yer, o‘ngda osmon jismi. Ramka — analog hududi.',
    compare_loading: 'Xarita yuklanmoqda…',
    compare_moon_unavailable:
      'Kalit talab qilinmaydigan ochiq Oy tayl xizmati mavjud emas. Bo‘sh yoki sun’iy xarita ko‘rsatmaymiz.',
    compare_moon_why:
      'Tekshirilib, javob bermagan: mars.nasa.gov/wmts, wac.earth.nasa.gov, lroc.imgspear.com, api.mars.nasa.gov, jpl.nasa.gov, svs.gsfc.nasa.gov va barcha ArcGIS Oy xizmatlari.',
    compare_open_quickmap: 'LROC QuickMap ochish',
    compare_note_mars:
      'MOLA tayllari — whereonmars.cartodb.net. Faqat 3–6 masshtabda mavjud.',
    compare_select_site: 'Joyni tanlang',

    method_title: 'Metodika',
    licenses_title: 'Manba va litsenziya',

    loading: 'Katalog yuklanmoqda…',
    load_failed: 'Katalogni ichki nusxadan ham yuklab bo‘lmadi.',
    legend_title: 'Belgilar',
    hint_rotate: 'Aylantirish uchun suring · yaqinlashtirish uchun g‘ildirak',
  },
};

export const LANG_LABEL: Record<Lang, string> = { ru: 'RU', en: 'EN', uz: 'UZ' };

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}