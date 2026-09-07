import React, { useState } from 'react';
import type { Dataset } from '../types/dataset';
import { financials, columnStats, numericHeadersOf } from '../lib/analyze';

interface DatasetModalProps {
  dataset: Dataset | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DatasetModal: React.FC<DatasetModalProps> = ({ dataset, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tabla' | 'graficos'>('tabla');

  if (!isOpen || !dataset) return null;

  const fin = financials(dataset);
  const numHeaders = numericHeadersOf(dataset.headers, dataset.rows);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">{dataset.name}</h3>
            <p className="text-xs text-slate-400">
              Rubro: <span className="capitalize text-slate-300">{dataset.rubro}</span> | Metodología: {dataset.metodologia}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS (TABS) */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('tabla')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tabla'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📄 Datos (Tabla)
          </button>
          <button
            onClick={() => setActiveTab('graficos')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'graficos'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Insights & Gráficos
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'tabla' ? (
            /* Pestaña 1: Tabla de filas */
            <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-[50vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 uppercase tracking-wider">
                  <tr>
                    {dataset.headers.map((h) => (
                      <th key={h} className="p-3 border-b border-slate-800 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dataset.rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      {dataset.headers.map((h) => (
                        <td key={h} className="p-3 whitespace-nowrap text-slate-300">{r[h] ?? '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Pestaña 2: Gráficos e Insights */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visualización Financiera del Dataset */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-300">Balance del Dataset</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-emerald-400">Ingresos</span>
                        <span>${fin.ingresos.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-rose-400">Costos</span>
                        <span>${fin.costos.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full" 
                          style={{ width: `${fin.ingresos > 0 ? Math.min(100, (fin.costos / fin.ingresos) * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen de Métricas de Columnas */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-300">Columnas Numéricas Identificadas</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {numHeaders.map((col) => {
                      const stats = columnStats(dataset, col);
                      return (
                        <div key={col} className="flex justify-between items-center text-xs p-2 bg-slate-900 rounded border border-slate-800/80">
                          <span className="font-mono text-blue-400">{col}</span>
                          <span className="text-slate-400">Prom: <b className="text-slate-200">{stats.avg ?? 0}</b></span>
                          <span className="text-slate-400">Suma: <b className="text-slate-200">{stats.sum ?? 0}</b></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="border-t border-slate-800 px-6 py-3 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};