import { financials } from './analyze';
import { normalizeRubro } from './catalog';
import type { Dataset, Financials } from '../types/dataset';

export interface RankedRow {
  dataset: Dataset;
  money: Financials;
}

export interface Ranking {
  rubro: string;
  ranked: RankedRow[];
  winner: RankedRow;
  metric: 'ganancia_neta' | 'ingresos';
  comparable: boolean;
}

export function rankSameRubro(datasets: Dataset[], rubro: string): Ranking | null {
  const want = normalizeRubro(rubro);
  const ofRubro = datasets.filter((d) => normalizeRubro(d.rubro) === want);
  if (ofRubro.length === 0) return null;

  const ranked: RankedRow[] = ofRubro
    .map((dataset) => ({ dataset, money: financials(dataset) }))
    .sort((a, b) => b.money.gananciaNeta - a.money.gananciaNeta);

  const withMoney = ranked.filter((r) => r.money.basis !== 'sin_dinero');
  const comparable = withMoney.length >= 2;
  const metric: Ranking['metric'] = ranked.some((r) => r.money.basis !== 'solo_ingresos' && r.money.basis !== 'sin_dinero')
    ? 'ganancia_neta'
    : 'ingresos';

  const ordered =
    metric === 'ganancia_neta'
      ? ranked
      : [...ranked].sort((a, b) => b.money.ingresos - a.money.ingresos);

  return {
    rubro,
    ranked: ordered,
    winner: ordered[0],
    metric,
    comparable,
  };
}
