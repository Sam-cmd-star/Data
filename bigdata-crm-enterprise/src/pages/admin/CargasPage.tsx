import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Columns3, Building2 } from 'lucide-react';
import { useDatasets } from '../../context/DatasetContext';
import { financials, withCanonicalMoney } from '../../lib/analyze';
import { METODOLOGIA_OTRA, METODOLOGIAS, RUBROS, metodologiaLabel, normalizeRubro, rubroLabel } from '../../lib/catalog';
import { formatMoney, formatPct } from '../../lib/format';
import { csvKindLabel, readCsvFile } from '../../lib/inspectCsv';
import { DatasetModal } from '../../components/DatasetModal';
import type { Dataset } from '../../types/dataset';

type Draft = {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
  kindLabel: string;
  numeric: string[];
};

export const CargasPage: React.FC = () => {
  const { datasets, addDataset, removeDataset, markMine, clearAll } = useDatasets();
  const defaultRubro = datasets.find((d) => d.isMine)?.rubro ?? datasets[0]?.rubro ?? 'ecommerce';

  const [name, setName] = useState('');
  const [rubro, setRubro] = useState(normalizeRubro(defaultRubro) || 'ecommerce');
  const [rubroOtro, setRubroOtro] = useState('');
  const [metodologia, setMetodologia] = useState<string>(METODOLOGIAS[0].id);
  const [metodologiaOtra, setMetodologiaOtra] = useState('');
  const [isMine, setIsMine] = useState(false);
  const [ingresosCol, setIngresosCol] = useState('');
  const [costosCol, setCostosCol] = useState('');
  const [drag, setDrag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeId, setActiveId] = useState<string | null>(datasets.at(-1)?.id ?? null);
  const [rubroTouched, setRubroTouched] = useState(false);
  const [selectedDatasetForModal, setSelectedDatasetForModal] = useState<Dataset | null>(null);

  useEffect(() => {
    if (rubroTouched) return;
    const preferred = datasets.find((d) => d.isMine)?.rubro ?? datasets[0]?.rubro;
    if (preferred && RUBROS.some((r) => r.id === normalizeRubro(preferred))) {
      setRubro(normalizeRubro(preferred));
    }
  }, [datasets, rubroTouched]);

  const active = datasets.find((d) => d.id === activeId) ?? datasets.at(-1);
  const money = active ? financials(active) : null;

  const preview = useMemo(() => {
    if (!draft || !ingresosCol) return null;
    const canonical = withCanonicalMoney(draft.headers, draft.rows, { ingresos: ingresosCol, costos: costosCol });
    return financials({
      id: 'draft',
      name: '',
      rubro: '',
      metodologia: '',
      isMine: false,
      filename: draft.filename,
      createdAt: '',
      ...canonical,
    });
  }, [draft, ingresosCol, costosCol]);

  const ingest = async (file: File) => {
    setError(null);
    try {
      const read = await readCsvFile(file);
      if (read.suggested.numeric.length === 0) {
        setDraft(null);
        setError('El CSV se leyó, pero no tiene columnas numéricas para calcular ganancia.');
        return;
      }
      setDraft({
        filename: read.filename,
        headers: read.headers,
        rows: read.rows,
        kindLabel: read.kindLabel,
        numeric: read.suggested.numeric,
      });
      setIngresosCol(read.suggested.ingresos);
      setCostosCol(read.suggested.costos);
      if (!name.trim()) setName(file.name.replace(/\.csv$/i, ''));
    } catch (e) {
      setDraft(null);
      setError(e instanceof Error ? e.message : 'No se pudo leer el CSV.');
    }
  };

  const guardar = async () => {
    if (!draft) {
      setError('Primero soltá un CSV para que el sistema lo lea.');
      return;
    }
    if (!ingresosCol) {
      setError('Indicá qué columna es el dinero que entra (ingresos / monto / precio).');
      return;
    }
    if (costosCol && costosCol === ingresosCol) {
      setError('Ingresos y costos no pueden ser la misma columna.');
      return;
    }
    const rubroId = rubro === 'otro' ? normalizeRubro(rubroOtro) : normalizeRubro(rubro);
    if (!rubroId) {
      setError('Elegí el rubro. La comparación solo junta el mismo tipo de negocio.');
      return;
    }
    const metodo =
      metodologia === METODOLOGIA_OTRA ? metodologiaOtra.trim() : metodologiaLabel(metodologia);
    if (!metodo) {
      setError('Indicá cómo trabajan (la metodología).');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const canonical = withCanonicalMoney(draft.headers, draft.rows, { ingresos: ingresosCol, costos: costosCol });
      const id = await addDataset({
        name: name.trim() || draft.filename.replace(/\.csv$/i, ''),
        rubro: rubroId,
        metodologia: metodo,
        isMine,
        filename: draft.filename,
        headers: canonical.headers,
        rows: canonical.rows,
      });
      setActiveId(id);
      setDraft(null);
      setName('');
      setIsMine(false);
      setMetodologiaOtra('');
      setRubroOtro('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-extrabold text-white">Subir dataset</h1>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Cualquier CSV de ventas. El sistema lee las columnas. El análisis después solo mezcla el{' '}
            <strong className="text-slate-200">mismo rubro</strong>.
          </p>
        </div>
        <button
          type="button"
          disabled={!datasets.length}
          onClick={() => window.confirm('¿Vaciar la lista?') && void clearAll().then(() => setActiveId(null))}
          className="nx-btn-ghost"
        >
          Vaciar
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { n: '1', t: 'Leer CSV', d: 'Solo archivos .csv', icon: FileSpreadsheet, on: true },
          { n: '2', t: 'Mapear dinero', d: 'Qué columna es ingreso y costo', icon: Columns3, on: Boolean(draft) },
          { n: '3', t: 'Etiquetar negocio', d: 'Rubro + metodología', icon: Building2, on: Boolean(draft && ingresosCol) },
        ].map((s) => (
          <div key={s.n} className={`nx-card p-4 ${s.on ? 'border-blue-500/40' : 'opacity-50'}`}>
            <s.icon size={16} className="text-blue-400" />
            <p className="text-white text-sm font-medium mt-2">
              {s.n}. {s.t}
            </p>
            <p className="text-xs text-slate-500 mt-1">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="nx-card p-6 space-y-6">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const file = e.dataTransfer.files[0];
            if (file) void ingest(file);
          }}
          className={`block cursor-pointer rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
            drag ? 'border-blue-500 bg-blue-600/10' : 'border-white/15 hover:border-blue-500/50'
          }`}
        >
          <p className="text-white font-medium">Soltá el CSV o hacé clic</p>
          <p className="text-xs text-slate-500 mt-2">Excel u otros formatos no. El sistema inspecciona encabezados y filas.</p>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={saving}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ingest(f);
              e.target.value = '';
            }}
          />
        </label>

        {draft && (
          <div className="space-y-6">
            <div className="rounded-xl border border-blue-500/30 bg-blue-600/10 p-4">
              <p className="text-sm text-white font-medium">{draft.filename}</p>
              <p className="text-sm text-blue-200 mt-1">{draft.kindLabel}</p>
              <p className="text-xs text-slate-400 mt-1">
                {draft.rows.length} filas · {draft.headers.join(', ')}
              </p>
            </div>

            <div>
              <p className="text-sm text-white font-medium mb-3">¿Qué columna es el dinero?</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm text-slate-400">
                  Entra (ingresos / monto)
                  <select className="nx-input" value={ingresosCol} onChange={(e) => setIngresosCol(e.target.value)}>
                    <option value="">Elegí una columna</option>
                    {draft.numeric.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-400">
                  Sale (costos) · opcional
                  <select className="nx-input" value={costosCol} onChange={(e) => setCostosCol(e.target.value)}>
                    <option value="">Sin costos en este archivo</option>
                    {draft.numeric.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {preview && preview.basis !== 'sin_dinero' && (
                <p className="text-xs text-slate-400 mt-3">
                  Con este mapeo: ingresos {formatMoney(preview.ingresos)}
                  {preview.basis !== 'solo_ingresos' ? ` · costos ${formatMoney(preview.costos)} · ganancia ${formatMoney(preview.gananciaNeta)}` : ''}
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm text-slate-400">
                Empresa / sucursal
                <input className="nx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi empresa" />
              </label>
              <label className="text-sm text-slate-400">
                Rubro
                <select
                  className="nx-input"
                  value={RUBROS.some((r) => r.id === rubro) ? rubro : 'otro'}
                  onChange={(e) => {
                    setRubroTouched(true);
                    setRubro(e.target.value);
                  }}
                >
                  {RUBROS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                  <option value="otro">Otro…</option>
                </select>
              </label>
              {rubro === 'otro' && (
                <label className="text-sm text-slate-400 sm:col-span-2">
                  Nombre del rubro
                  <input className="nx-input" value={rubroOtro} onChange={(e) => setRubroOtro(e.target.value)} placeholder="ej. turismo" />
                </label>
              )}
              <label className="text-sm text-slate-400 sm:col-span-2">
                Metodología (cómo trabajan)
                <select className="nx-input" value={metodologia} onChange={(e) => setMetodologia(e.target.value)}>
                  {METODOLOGIAS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                  <option value={METODOLOGIA_OTRA}>Otra…</option>
                </select>
              </label>
              {metodologia === METODOLOGIA_OTRA && (
                <label className="text-sm text-slate-400 sm:col-span-2">
                  Describí la metodología
                  <input className="nx-input" value={metodologiaOtra} onChange={(e) => setMetodologiaOtra(e.target.value)} placeholder="ej. dark kitchen" />
                </label>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" className="accent-blue-600" checked={isMine} onChange={(e) => setIsMine(e.target.checked)} />
              Este dataset es el mío (el negocio que vamos a mejorar)
            </label>

            <button type="button" className="nx-btn" disabled={saving} onClick={() => void guardar()}>
              {saving ? 'Guardando…' : 'Guardar en el sistema'}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>

      {datasets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {datasets.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveId(d.id)}
              className={`rounded-full px-4 py-1.5 text-sm border transition ${
                active?.id === d.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/10 text-slate-300 hover:border-blue-500/50'
              }`}
            >
              {d.name}
              {d.isMine ? ' · mío' : ''} · {rubroLabel(d.rubro)}
            </button>
          ))}
        </div>
      )}

      {active && money && (
        <div className="nx-card p-6 space-y-4">
          <div className="flex justify-between gap-3">
            <div>
              <h2 className="text-lg text-white">{active.name}</h2>
              <p className="text-xs text-slate-500">
                {csvKindLabel(active)} · {rubroLabel(active.rubro)} · {active.metodologia}
              </p>
            </div>
            <div className="flex gap-2">
              {!active.isMine && (
                <button type="button" className="nx-btn-ghost text-xs" onClick={() => void markMine(active.id)}>
                  Es mío
                </button>
              )}
              <button type="button" className="text-xs text-slate-500" onClick={() => void removeDataset(active.id).then(() => setActiveId(null))}>
                Quitar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Ingresos', money.basis === 'sin_dinero' ? '—' : formatMoney(money.ingresos)],
              ['Costos', money.basis === 'sin_dinero' || money.basis === 'solo_ingresos' ? '—' : formatMoney(money.costos)],
              ['Ganancia', money.basis === 'sin_dinero' ? '—' : formatMoney(money.gananciaNeta)],
              ['Margen', money.basis === 'sin_dinero' ? '—' : formatPct(money.margen)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-950/80 border border-white/5 p-3">
                <p className="text-[11px] text-slate-500">{k}</p>
                <p className="text-lg text-white mt-1">{v}</p>
              </div>
            ))}
          </div>

          {/* Reemplazo de tabla pesada por el botón que abre el Modal diferido */}
          <div className="mt-4 flex justify-between items-center bg-slate-950/60 p-4 rounded-xl border border-white/5">
            <div className="text-xs text-slate-400">
              Registros procesados: <b className="text-slate-200">{active.rows.length} filas</b>.
            </div>
            <button
              type="button"
              onClick={() => setSelectedDatasetForModal(active)}
              className="nx-btn text-xs px-4 py-2 flex items-center gap-2"
            >
              <span>🔍</span> Inspeccionar Dataset (Tabla y Gráficos)
            </button>
          </div>
        </div>
      )}

      {/* Modal diferido bajo demanda */}
      <DatasetModal
        dataset={selectedDatasetForModal}
        isOpen={!!selectedDatasetForModal}
        onClose={() => setSelectedDatasetForModal(null)}
      />
    </div>
  );
};