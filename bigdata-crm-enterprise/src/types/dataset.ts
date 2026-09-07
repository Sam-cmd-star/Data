export interface Dataset {
  id: string;
  name: string;
  rubro: string;
  metodologia: string;
  isMine: boolean;
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
  createdAt: string;
  ingresos?: number;
  costos?: number;
}

export interface ColumnStats {
  column: string;
  count: number;
  avg: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  sum: number | null;
}

export interface Financials {
  ingresos: number;
  costos: number;
  gananciaNeta: number;
  margen: number;
  /** How numbers were obtained — never invented. */
  basis: 'ingresos_costos' | 'monto_y_costos' | 'solo_ingresos' | 'sin_dinero';
}

export interface DelayReviewInsight {
  delayCol: string;
  reviewCol: string;
  thresholdDays: number;
  nLate: number;
  nOnTime: number;
  pct1StarLate: number | null;
  pct1StarOnTime: number | null;
  sampleTooSmall: boolean;
}
