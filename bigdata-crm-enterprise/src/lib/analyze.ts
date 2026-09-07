import type { ColumnStats, Dataset, DelayReviewInsight, Financials } from '../types/dataset';

export function toNumbers(rows: Record<string, string>[], column: string): number[] {
  return rows
    .map((r) => Number(String(r[column] ?? '').replace(',', '.')))
    .filter((n) => Number.isFinite(n));
}

export function findHeader(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase());
  for (const name of candidates) {
    const i = lower.indexOf(name.toLowerCase());
    if (i >= 0) return headers[i];
  }
  return null;
}

export function isNumericColumn(dataset: Dataset, column: string): boolean {
  const nums = toNumbers(dataset.rows, column);
  const filled = dataset.rows.filter((r) => String(r[column] ?? '').trim() !== '').length;
  return filled > 0 && nums.length >= Math.ceil(filled * 0.8);
}

export function columnStats(dataset: Dataset, column: string): ColumnStats {
  const values = toNumbers(dataset.rows, column).sort((a, b) => a - b);
  if (values.length === 0) {
    return { column, count: 0, avg: null, median: null, min: null, max: null, sum: null };
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  return {
    column,
    count: values.length,
    avg: Number((sum / values.length).toFixed(4)),
    median: Number(median.toFixed(4)),
    min: values[0],
    max: values[values.length - 1],
    sum: Number(sum.toFixed(4)),
  };
}

export const INGRESO_HEADERS = [
  'ingresos',
  'revenue',
  'monto',
  'price',
  'precio',
  'total',
  'venta',
  'ventas',
  'sales',
  'amount',
  'valor',
  'ticket',
];

export const COSTO_HEADERS = ['costos', 'cost', 'costo', 'gasto', 'gastos', 'expense', 'cogs', 'coste'];

export function numericHeadersOf(headers: string[], rows: Record<string, string>[]): string[] {
  const probe = { headers, rows } as Dataset;
  return headers.filter((h) => isNumericColumn(probe, h));
}

export function suggestMoneyMap(headers: string[], rows: Record<string, string>[]): {
  ingresos: string;
  costos: string;
  numeric: string[];
} {
  return {
    ingresos: findHeader(headers, INGRESO_HEADERS) ?? '',
    costos: findHeader(headers, COSTO_HEADERS) ?? '',
    numeric: numericHeadersOf(headers, rows),
  };
}

/** Deja columnas canónicas ingresos/costos para que Postgres y el ranking usen lo mismo. */
export function withCanonicalMoney(
  headers: string[],
  rows: Record<string, string>[],
  map: { ingresos: string; costos: string },
): { headers: string[]; rows: Record<string, string>[] } {
  const nextHeaders = [...headers];
  const nextRows = rows.map((r) => ({ ...r }));
  if (map.ingresos) {
    if (!nextHeaders.includes('ingresos')) nextHeaders.push('ingresos');
    for (const row of nextRows) row.ingresos = row[map.ingresos] ?? '';
  }
  if (map.costos) {
    if (!nextHeaders.includes('costos')) nextHeaders.push('costos');
    for (const row of nextRows) row.costos = row[map.costos] ?? '';
  }
  return { headers: nextHeaders, rows: nextRows };
}

export function sumColumn(dataset: Dataset, candidates: string[]): { header: string; sum: number } | null {
  const header = findHeader(dataset.headers, candidates);
  if (!header || !isNumericColumn(dataset, header)) return null;
  const stats = columnStats(dataset, header);
  if (stats.sum == null) return null;
  return { header, sum: stats.sum };
}

export function financials(dataset: Dataset): Financials {
  // 1. Priorizar totales precargados si existen en el objeto dataset (evita recalcular sobre muestras incompletas)
  if (typeof dataset.ingresos === 'number' && dataset.ingresos > 0) {
    const ingresos = dataset.ingresos;
    const costos = typeof dataset.costos === 'number' ? dataset.costos : 0;
    const gananciaNeta = Number((ingresos - costos).toFixed(2));
    const margen = ingresos === 0 ? 0 : Number((((ingresos - costos) / ingresos) * 100).toFixed(4));
    const basis = costos > 0 ? 'ingresos_costos' : 'solo_ingresos';
    return { ingresos, costos, gananciaNeta, margen, basis };
  }

  // 2. Si no hay totales precargados, calcular dinámicamente sumando la columna
  const ingresosHit = sumColumn(dataset, INGRESO_HEADERS);
  const costosHit = sumColumn(dataset, COSTO_HEADERS);
  const ingresos = ingresosHit?.sum ?? 0;
  const costos = costosHit?.sum ?? 0;
  const gananciaNeta = Number((ingresos - costos).toFixed(2));
  const margen = ingresos === 0 ? 0 : Number((((ingresos - costos) / ingresos) * 100).toFixed(4));

  let basis: Financials['basis'] = 'sin_dinero';
  if (ingresosHit && costosHit) {
    basis = findHeader(dataset.headers, ['ingresos', 'revenue']) ? 'ingresos_costos' : 'monto_y_costos';
  } else if (ingresosHit) {
    basis = 'solo_ingresos';
  }

  return { ingresos, costos, gananciaNeta, margen, basis };
}

export function delayReviewInsight(dataset: Dataset, thresholdDays = 8): DelayReviewInsight | null {
  const delayCol = findHeader(dataset.headers, ['dias_entrega', 'dias', 'delivery_days', 'delay']);
  const reviewCol = findHeader(dataset.headers, ['review_score', 'review', 'score', 'estrellas']);
  if (!delayCol || !reviewCol) return null;

  const late: number[] = [];
  const onTime: number[] = [];
  for (const row of dataset.rows) {
    const days = Number(String(row[delayCol] ?? '').replace(',', '.'));
    const score = Number(String(row[reviewCol] ?? '').replace(',', '.'));
    if (!Number.isFinite(days) || !Number.isFinite(score)) continue;
    (days > thresholdDays ? late : onTime).push(score);
  }

  const pct1 = (scores: number[]) => {
    if (scores.length === 0) return null;
    return Number(((scores.filter((s) => s === 1).length / scores.length) * 100).toFixed(1));
  };

  return {
    delayCol,
    reviewCol,
    thresholdDays,
    nLate: late.length,
    nOnTime: onTime.length,
    pct1StarLate: pct1(late),
    pct1StarOnTime: pct1(onTime),
    sampleTooSmall: late.length + onTime.length < 8,
  };
}

export function sharedNumericHeaders(datasets: Dataset[]): string[] {
  if (datasets.length === 0) return [];
  return datasets[0].headers.filter(
    (h) => datasets.every((d) => d.headers.includes(h) && isNumericColumn(d, h)),
  );
}