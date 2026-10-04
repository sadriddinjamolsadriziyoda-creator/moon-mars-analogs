import {
  CRITERION_IDS,
  MINERAL_KEYS,
  type CriterionId,
  type ValidationIssue,
} from './types';

type Record_ = Record<string, unknown>;

function isRecord(value: unknown): value is Record_ {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record_ | undefined {
  return isRecord(value) ? value : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim());
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type IssueSink = { push: (issue: ValidationIssue) => void };

function error(sink: IssueSink, path: string, message: string): void {
  sink.push({ path, message, severity: 'error' });
}

function warn(sink: IssueSink, path: string, message: string): void {
  sink.push({ path, message, severity: 'warning' });
}

function validateCenter(sink: IssueSink, path: string, value: unknown): void {
  const tuple = asArray(value);
  if (!tuple) {
    error(sink, path, 'координаты должны быть парой [долгота, широта]');
    return;
  }
  if (tuple.length !== 2) {
    error(sink, path, `ожидалось 2 координаты, получено ${tuple.length}`);
    return;
  }
  const [lon, lat] = tuple;
  if (!isFiniteNumber(lon) || lon < -180 || lon > 180) {
    error(sink, `${path}[0]`, `долгота должна быть числом в диапазоне -180..180, получено ${String(lon)}`);
  }
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    error(sink, `${path}[1]`, `широта должна быть числом в диапазоне -90..90, получено ${String(lat)}`);
  }
}

function validateMineralVector(sink: IssueSink, path: string, value: unknown): void {
  const record = asRecord(value);
  if (!record) {
    error(sink, path, 'минералогия должна быть объектом с пятью материалами');
    return;
  }
  for (const key of MINERAL_KEYS) {
    const amount = record[key];
    if (amount === undefined) {
      error(sink, `${path}.${key}`, 'отсутствует обязательный материал');
      continue;
    }
    if (!isFiniteNumber(amount) || amount < 0) {
      error(sink, `${path}.${key}`, `доля должна быть конечным неотрицательным числом, получено ${String(amount)}`);
    }
  }
}

function validateFeatures(sink: IssueSink, path: string, value: unknown): void {
  const record = asRecord(value);
  if (!record) {
    error(sink, path, 'признаки должны быть объектом по шести критериям');
    return;
  }
  for (const id of CRITERION_IDS) {
    const feature = asRecord(record[id]);
    if (!feature) {
      error(sink, `${path}.${id}`, 'критерий не заполнен');
      continue;
    }
    const raw = feature.value;
    if (!isFiniteNumber(raw) || raw < 0 || raw > 1) {
      error(sink, `${path}.${id}.value`, `значение должно быть числом в диапазоне 0..1, получено ${String(raw)}`);
    }
    if (feature.evidence === 'low') {
      warn(sink, `${path}.${id}.evidence`, 'низкая обоснованность: нужна публикация со ссылкой');
    }
  }
}

function validatePhotos(sink: IssueSink, value: unknown): void {
  const photos = asArray(value);
  if (!photos || photos.length === 0) {
    warn(sink, 'photos', 'нет фотографий — карточка останется без иллюстрации');
    return;
  }
  photos.forEach((entry, index) => {
    const path = `photos[${index}]`;
    const photo = asRecord(entry);
    if (!photo) {
      error(sink, path, 'фотография должна быть объектом');
      return;
    }
    if (!isNonEmptyString(photo.src)) error(sink, `${path}.src`, 'нет адреса изображения');
    if (!isNonEmptyString(photo.license)) warn(sink, `${path}.license`, 'не указана лицензия — обязательно для страницы источников');
    const alt = asRecord(photo.alt);
    if (!alt || !isNonEmptyString(alt.ru) || !isNonEmptyString(alt.en)) {
      warn(sink, `${path}.alt`, 'нет описания для программ экранного доступа');
    }
    if (!isNonEmptyString(photo.credit) || !isRecord(photo.credit)) {
      warn(sink, `${path}.credit`, 'не указан автор');
    }
  });
}

function validateMissions(sink: IssueSink, value: unknown): void {
  const missions = asArray(value);
  if (!missions || missions.length === 0) {
    warn(sink, 'missions', 'нет записанных миссий или тренировок');
  }
}

function validateSources(sink: IssueSink, value: unknown): void {
  const sources = asArray(value);
  if (!sources || sources.length === 0) {
    error(sink, 'sources', 'нужен хотя бы один проверяемый источник');
    return;
  }

  const seen = new Set<string>();
  sources.forEach((entry, index) => {
    const path = `sources[${index}]`;
    const source = asRecord(entry);
    if (!source) {
      error(sink, path, 'источник должен быть объектом');
      return;
    }
    if (!isNonEmptyString(source.title)) error(sink, `${path}.title`, 'нет названия источника');
    if (!isNonEmptyString(source.org)) warn(sink, `${path}.org`, 'не указана организация');
    if (!isHttpUrl(source.url)) {
      error(sink, `${path}.url`, `нужен http(s)-адрес, получено ${String(source.url)}`);
      return;
    }
    const key = source.url.trim().toLowerCase();
    if (seen.has(key)) {
      error(sink, `${path}.url`, `дубликат адреса источника: ${source.url.trim()}`);
      return;
    }
    seen.add(key);
  });

  if (sources.length < 3) {
    warn(sink, 'sources', `источников ${sources.length}, для сдачи нужно минимум 3`);
  }
}

function validateAnalogs(sink: IssueSink, value: unknown): void {
  const analogs = asArray(value);
  if (!analogs || analogs.length === 0) {
    error(sink, 'analogs', 'у локации должен быть хотя бы один аналог');
    return;
  }
  analogs.forEach((entry, index) => {
    const path = `analogs[${index}]`;
    const analog = asRecord(entry);
    if (!analog) {
      error(sink, path, 'аналог должен быть объектом');
      return;
    }
    if (!isNonEmptyString(analog.slug)) {
      error(sink, `${path}.slug`, 'не указана цель сравнения (slug из comparators.json)');
    } else if (!SLUG_PATTERN.test(analog.slug)) {
      error(sink, `${path}.slug`, 'идентификатор цели должен быть в kebab-case');
    }
    if (analog.body !== 'mars' && analog.body !== 'moon') {
      error(sink, `${path}.body`, `тело должно быть "mars" или "moon", получено ${String(analog.body)}`);
    }
    validateCenter(sink, `${path}.center`, analog.center);
    if (analog.radiusKm !== undefined && (!isFiniteNumber(analog.radiusKm) || analog.radiusKm <= 0)) {
      error(sink, `${path}.radiusKm`, 'радиус должен быть положительным числом');
    }
  });
}

export function validateSite(site: unknown, existingSlugs: string[] = []): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sink: IssueSink = { push: (issue) => issues.push(issue) };

  const record = asRecord(site);
  if (!record) {
    error(sink, 'site', 'локация должна быть объектом');
    return issues;
  }

  const slug = record.slug;
  if (!isNonEmptyString(slug)) {
    error(sink, 'slug', 'нужен идентификатор локации');
  } else {
    if (!SLUG_PATTERN.test(slug)) {
      error(sink, 'slug', 'идентификатор должен быть в kebab-case, латиницей: atacama-desert');
    }
    if (existingSlugs.includes(slug)) {
      error(sink, 'slug', `идентификатор ${slug} уже занят`);
    }
  }

  const name = asRecord(record.name);
  if (!name || !isNonEmptyString(name.ru) || !isNonEmptyString(name.en)) {
    error(sink, 'name', 'нужно название минимум на русском и английском');
  }

  if (!isNonEmptyString(record.country)) warn(sink, 'country', 'не указана страна — фильтр по странам не сработает');

  validateCenter(sink, 'center', record.center);

  if (!isFiniteNumber(record.radiusKm) || record.radiusKm <= 0) {
    error(sink, 'radiusKm', 'радиус должен быть положительным числом');
  }

  const terrain = asArray(record.terrainType);
  if (!terrain || terrain.length === 0) {
    error(sink, 'terrainType', 'нужен хотя бы один тип местности');
  }

  validateAnalogs(sink, record.analogs);
  validateFeatures(sink, 'features', record.features);
  validateMineralVector(sink, 'geologyMaterials', record.geologyMaterials);
  validateMissions(sink, record.missions);
  validatePhotos(sink, record.photos);
  validateSources(sink, record.sources);

  if (record.reviewStatus !== 'verified') {
    warn(sink, 'reviewStatus', 'локация ещё не проверена научным лидером');
  }

  return issues;
}

export function validateComparator(comparator: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sink: IssueSink = { push: (issue) => issues.push(issue) };

  const record = asRecord(comparator);
  if (!record) {
    error(sink, 'comparator', 'цель должна быть объектом');
    return issues;
  }

  if (!isNonEmptyString(record.slug)) error(sink, 'slug', 'нужен идентификатор цели');
  else if (!SLUG_PATTERN.test(record.slug)) {
    error(sink, 'slug', 'идентификатор должен быть в kebab-case, латиницей: valles-marineris');
  }

  const name = asRecord(record.name);
  if (!name || !isNonEmptyString(name.ru) || !isNonEmptyString(name.en)) {
    error(sink, 'name', 'нужно название минимум на русском и английском');
  }

  if (record.body !== 'mars' && record.body !== 'moon') {
    error(sink, 'body', `тело должно быть "mars" или "moon", получено ${String(record.body)}`);
  }

  validateCenter(sink, 'center', record.center);
  validateFeatures(sink, 'features', record.features);
  validateMineralVector(sink, 'geologyMaterials', record.geologyMaterials);

  return issues;
}

export function validateCriteriaSet(criteria: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sink: IssueSink = { push: (issue) => issues.push(issue) };

  const list = asArray(criteria);
  if (!list) {
    error(sink, 'criteria', 'набор критериев должен быть массивом');
    return issues;
  }

  const seen = new Set<string>();
  const validIds = new Set<string>(CRITERION_IDS);

  list.forEach((entry, index) => {
    const path = `criteria[${index}]`;
    const criterion = asRecord(entry);
    if (!criterion) {
      error(sink, path, 'критерий должен быть объектом');
      return;
    }

    const id = criterion.id;
    if (!isNonEmptyString(id) || !validIds.has(id)) {
      error(sink, `${path}.id`, `неизвестный критерий: ${String(id)}`);
      return;
    }
    const typedId = id as CriterionId;
    if (seen.has(typedId)) {
      error(sink, `${path}.id`, `критерий ${typedId} повторяется`);
      return;
    }
    seen.add(typedId);

    if (!isFiniteNumber(criterion.weight) || criterion.weight < 0) {
      error(sink, `${path}.weight`, 'вес должен быть конечным неотрицательным числом');
    }
    if (!isFiniteNumber(criterion.tolerance) || criterion.tolerance <= 0) {
      error(sink, `${path}.tolerance`, 'допуск должен быть положительным числом');
    }
    if (!isNonEmptyString(criterion.source)) {
      warn(sink, `${path}.source`, 'не указан источник данных для критерия');
    }
  });

  for (const id of CRITERION_IDS) {
    if (!seen.has(id)) error(sink, 'criteria', `отсутствует критерий ${id}`);
  }

  return issues;
}

export function summarize(issues: ValidationIssue[]): { errors: number; warnings: number; ok: boolean } {
  let errors = 0;
  let warnings = 0;
  for (const issue of issues) {
    if (issue.severity === 'error') errors += 1;
    else warnings += 1;
  }
  return { errors, warnings, ok: errors === 0 };
}
