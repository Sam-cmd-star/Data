/** Catálogo de producto: el Admin elige, no tipea. Así la comparación no se rompe. */

export const RUBROS = [
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'retail', label: 'Retail / tienda' },
  { id: 'gastronomia', label: 'Gastronomía' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'logistica', label: 'Logística' },
  { id: 'salud', label: 'Salud' },
  { id: 'educacion', label: 'Educación' },
  { id: 'finanzas', label: 'Finanzas' },
] as const;

export const METODOLOGIAS = [
  { id: 'entrega_rapida', label: 'Entrega rápida' },
  { id: 'envio_estandar', label: 'Envío estándar' },
  { id: 'sucursal', label: 'Atención en sucursal' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'venta_directa', label: 'Venta directa' },
  { id: 'suscripcion', label: 'Suscripción' },
  { id: 'precio_agresivo', label: 'Precio agresivo' },
  { id: 'calidad_premium', label: 'Calidad premium' },
] as const;

export const METODOLOGIA_OTRA = 'otra';

const RUBRO_ALIASES: Record<string, string> = {
  ecommerce: 'ecommerce',
  'e-commerce': 'ecommerce',
  'e commerce': 'ecommerce',
  'comercio electronico': 'ecommerce',
  retail: 'retail',
  'tienda fisica': 'retail',
  tienda: 'retail',
  gastronomia: 'gastronomia',
  restaurant: 'gastronomia',
  restaurante: 'gastronomia',
  servicios: 'servicios',
  logistica: 'logistica',
  salud: 'salud',
  educacion: 'educacion',
  finanzas: 'finanzas',
};

export function stripAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeRubro(value: string): string {
  const key = stripAccents(value);
  return RUBRO_ALIASES[key] ?? key;
}

export function rubroLabel(id: string): string {
  const want = normalizeRubro(id);
  return RUBROS.find((r) => r.id === want)?.label ?? id;
}

export function metodologiaLabel(value: string): string {
  const found = METODOLOGIAS.find((m) => m.id === value || m.label === value);
  return found?.label ?? value;
}
