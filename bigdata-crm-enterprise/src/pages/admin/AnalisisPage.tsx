import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDatasets } from '../../context/DatasetContext';
import { normalizeRubro, rubroLabel } from '../../lib/catalog';
import { formatMoney } from '../../lib/format';
import { csvKindLabel } from '../../lib/inspectCsv';
import { rankSameRubro } from '../../lib/recommend';
import { ProfitBarChart } from '../../modules/charts/ProfitBarChart';

export const AnalisisPage: React.FC = () => {
  const { datasets } = useDatasets();
  const rubros = [...new Set(datasets.map((d) => normalizeRubro(d.rubro)).filter(Boolean))];
  const [rubro, setRubro] = useState(rubros[0] ?? '');

  useEffect(() => {
    const unique = [...new Set(datasets.map((d) => normalizeRubro(d.rubro)).filter(Boolean))];
    if (unique.length === 0) {
      setRubro('');
      return;
    }
    setRubro((current) => (unique.includes(current) ? current : unique[0]));
  }, [datasets]);

  const [comparativeMetric, setComparativeMetric] = useState<'ganancia' | 'ingresos' | 'costos'>('ganancia');
  const ranking = useMemo(() => (rubro ? rankSameRubro(datasets, rubro) : null), [datasets, rubro]);
  const winner = ranking?.winner;
  const otros = datasets.filter((d) => normalizeRubro(d.rubro) !== normalizeRubro(rubro));
  const delRubro = ranking?.ranked.length ?? 0;
  const mine = ranking?.ranked.find((r) => r.dataset.isMine);

  // Cálculo de valores según la variable elegida
  const chartValues = useMemo(() => {
    if (!ranking?.ranked) return [];
    return ranking.ranked.map((r) => {
      if (comparativeMetric === 'ingresos') return r.money.ingresos;
      if (comparativeMetric === 'costos') return r.money.costos;
      return r.money.gananciaNeta;
    });
  }, [ranking, comparativeMetric]);

  const chartLabel = comparativeMetric === 'ingresos' ? 'Ingresos totales' : comparativeMetric === 'costos' ? 'Costos' : 'Ganancia neta';

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="font-display text-4xl font-extrabold text-white">Comparar mismo rubro</h1>
        <p className="text-slate-400 mt-2">
          Los CSV pueden ser de empresas distintas. El ranking <strong className="text-slate-200">nunca mezcla rubros</strong>.
        </p>
      </div>

      {rubros.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Todavía no hay archivos.{' '}
          <Link to="/admin/cargas" className="text-blue-400 hover:underline">
            Subí un CSV
          </Link>
          .
        </p>
      ) : (
        <label className="text-sm text-slate-400 block max-w-sm">
          Rubro a analizar
          <select className="nx-input" value={rubro} onChange={(e) => setRubro(e.target.value)}>
            {rubros.map((r) => (
              <option key={r} value={r}>
                {rubroLabel(r)} ({datasets.filter((d) => normalizeRubro(d.rubro) === r).length} CSV)
              </option>
            ))}
          </select>
        </label>
      )}

      {delRubro === 1 && (
        <p className="text-sm text-amber-300/90">
          Hay 1 CSV de {rubroLabel(rubro)}. Para recomendar una metodología hacen falta al menos dos del mismo rubro.
        </p>
      )}

      {otros.length > 0 && (
        <p className="text-xs text-slate-500">
          Quedan afuera: {otros.map((d) => `${d.name} (${rubroLabel(d.rubro)})`).join(', ')}.
        </p>
      )}

      {!ranking?.ranked.length ? null : delRubro === 1 ? (
        <div className="nx-card p-6 text-sm text-slate-300">
          <p className="text-white font-medium">{ranking.ranked[0].dataset.name}</p>
          <p className="text-slate-400 mt-1">{csvKindLabel(ranking.ranked[0].dataset)}</p>
          <p className="mt-3">
            Ganancia de este archivo: {formatMoney(ranking.ranked[0].money.gananciaNeta)}. Subí otro CSV de{' '}
            {rubroLabel(rubro)} para comparar.
          </p>
        </div>
      ) : (
        <>
          <div className="nx-card p-6 space-y-4">
            {/* Control selector de variable comparativa */}
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-slate-300">Comparativa Visual</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Métrica:</span>
                <select
                  value={comparativeMetric}
                  onChange={(e) => setComparativeMetric(e.target.value as any)}
                  className="nx-input !w-auto !py-1 text-xs"
                >
                  <option value="ganancia">Ganancia Neta ($)</option>
                  <option value="ingresos">Ingresos Totales ($)</option>
                  <option value="costos">Costos ($)</option>
                </select>
              </div>
            </div>

            <ProfitBarChart
              labels={ranking.ranked.map((r) => (r.dataset.isMine ? `${r.dataset.name} (mío)` : r.dataset.name))}
              values={chartValues}
              label={chartLabel}
            />
          </div>

          <div className="nx-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-white/10">
                  <th className="p-4 font-medium">Empresa</th>
                  <th className="p-4 font-medium">CSV</th>
                  <th className="p-4 font-medium">Metodología</th>
                  <th className="p-4 font-medium">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {ranking.ranked.map((r, i) => (
                  <tr key={r.dataset.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">
                      {i === 0 ? <span className="text-blue-400 mr-2 text-xs font-semibold">GANA</span> : null}
                      {r.dataset.name}
                      {r.dataset.isMine ? <span className="text-blue-400"> · mío</span> : null}
                    </td>
                    <td className="p-4 text-slate-400 text-xs">{csvKindLabel(r.dataset)}</td>
                    <td className="p-4 text-slate-400">{r.dataset.metodologia}</td>
                    <td className="p-4 text-blue-300 font-medium">{formatMoney(r.money.gananciaNeta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ranking.comparable && winner && (
            <div className="nx-card p-6 bg-blue-600/10 border-blue-500/30 space-y-3">
              <p>
                En <strong className="text-white">{rubroLabel(rubro)}</strong> gana{' '}
                <strong className="text-white">{winner.dataset.metodologia}</strong> ({winner.dataset.name},{' '}
                {formatMoney(winner.money.gananciaNeta)}).
              </p>
              {mine && mine.dataset.id !== winner.dataset.id && (
                <p className="text-sm text-slate-400">
                  Lo nuestro está a {formatMoney(winner.money.gananciaNeta - mine.money.gananciaNeta)} de esa palanca.
                </p>
              )}
              {mine && mine.dataset.id === winner.dataset.id && (
                <p className="text-sm text-slate-400">Lo nuestro ya es la metodología más rentable de este rubro.</p>
              )}
              <Link to="/admin" className="nx-btn inline-flex">
                Pasar al equipo
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};