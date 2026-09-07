import type { Dataset } from '../types/dataset';
import { columnStats, findHeader, INGRESO_HEADERS, COSTO_HEADERS } from './analyze';

export const DELAY_HEADERS = ['dias_entrega', 'dias', 'delivery_days', 'delay', 'demora', 'lead_time'];
export const REVIEW_HEADERS = ['review_score', 'review', 'score', 'estrellas', 'rating', 'calificacion'];
export const PLACE_HEADERS = ['ciudad', 'city', 'localidad', 'provincia', 'region', 'estado', 'pais', 'country'];
export const ORDER_HEADERS = ['order_id', 'pedido', 'id', 'orden'];
export const DATE_HEADERS = ['fecha', 'date', 'created_at', 'order_date', 'dia'];

/** Núcleo BI: sirve para ecommerce, retail, gastronomía, servicios… el nombre de la columna puede cambiar. */
export const COLUMN_CONTRACT = [
  { id: 'id', need: 'clave', title: 'Identificador', why: 'Cada fila es un pedido o venta, no un total mezclado.', names: ORDER_HEADERS },
  { id: 'fecha', need: 'recomendado', title: 'Fecha', why: 'Para ver si mejoró con el tiempo.', names: DATE_HEADERS },
  { id: 'ingresos', need: 'clave', title: 'Dinero que entra', why: 'Sin esto no hay ingresos ni ganancia.', names: INGRESO_HEADERS },
  { id: 'costos', need: 'clave', title: 'Dinero que sale', why: 'Sin esto no hay ganancia neta, solo facturación.', names: COSTO_HEADERS },
  { id: 'demora', need: 'importante', title: 'Tiempo / demora', why: 'La metodología se nota en cuánto tarda (entrega, mesa, turno).', names: DELAY_HEADERS },
  { id: 'calidad', need: 'importante', title: 'Calidad / reseña', why: 'Plata alta con clientes enojados no es un buen método.', names: REVIEW_HEADERS },
  { id: 'lugar', need: 'importante', title: 'Lugar o canal', why: 'Sucursal, ciudad o marketplace: dónde ocurre.', names: PLACE_HEADERS },
] as const;

export function matchContract(headers: string[]) {
  return COLUMN_CONTRACT.map((item) => {
    const column = findHeader(headers, [...item.names]);
    return { ...item, column, found: Boolean(column) };
  });
}

export interface ColumnUse {
  role: string;
  column: string;
}

export interface DatasetProfile {
  pedidos: number;
  delayCol: string | null;
  delayAvg: number | null;
  reviewCol: string | null;
  reviewAvg: number | null;
  placeCol: string | null;
  topPlaces: { name: string; count: number }[];
  used: ColumnUse[];
}

function countPlaces(rows: Record<string, string>[], column: string): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = String(row[column] ?? '').trim();
    if (!name) continue;
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/** Lee las columnas que sirven para BI: plata, demora, reseña, lugar, volumen. */
export function profileDataset(dataset: Dataset): DatasetProfile {
  const headers = dataset.headers ?? [];
  const rows = dataset.rows ?? [];
  const used: ColumnUse[] = [];

  const ingreso = findHeader(headers, INGRESO_HEADERS);
  const costo = findHeader(headers, COSTO_HEADERS);
  const delayCol = findHeader(headers, DELAY_HEADERS);
  const reviewCol = findHeader(headers, REVIEW_HEADERS);
  const placeCol = findHeader(headers, PLACE_HEADERS);
  const orderCol = findHeader(headers, ORDER_HEADERS);
  const dateCol = findHeader(headers, DATE_HEADERS);

  if (ingreso) used.push({ role: 'Ventas / ingresos', column: ingreso });
  if (costo) used.push({ role: 'Costos', column: costo });
  if (delayCol) used.push({ role: 'Demora de entrega', column: delayCol });
  if (reviewCol) used.push({ role: 'Reseñas', column: reviewCol });
  if (placeCol) used.push({ role: 'Lugar', column: placeCol });
  if (orderCol) used.push({ role: 'Pedido', column: orderCol });
  if (dateCol) used.push({ role: 'Fecha', column: dateCol });

  const delayAvg = delayCol ? columnStats(dataset, delayCol).avg : null;
  const reviewAvg = reviewCol ? columnStats(dataset, reviewCol).avg : null;

  return {
    pedidos: rows.length,
    delayCol,
    delayAvg,
    reviewCol,
    reviewAvg,
    placeCol,
    topPlaces: placeCol ? countPlaces(rows, placeCol) : [],
    used,
  };
}
