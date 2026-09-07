import React, { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardList, RotateCcw, Database, CheckSquare } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { MisDatasets } from '../components/MisDatasets';

interface Tarea {
  id: number;
  cliente: string;
  prioridad: string;
  accion: string;
  completada: boolean;
  created_at?: string;
}

type Filtro = 'todas' | 'pendientes' | 'hechas';
type Tab = 'datasets' | 'tareas';

function tonoPrioridad(raw: string) {
  const p = raw.trim().toLowerCase();
  if (p.includes('alta') || p === 'high' || p === '1') {
    return { label: 'Alta', bar: 'bg-rose-500', pill: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
  }
  if (p.includes('baja') || p === 'low' || p === '3') {
    return { label: 'Baja', bar: 'bg-emerald-500', pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  }
  return { label: raw || 'Media', bar: 'bg-amber-400', pill: 'bg-amber-400/15 text-amber-200 border-amber-400/30' };
}

export const EmployeeDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('datasets');
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [nuevas, setNuevas] = useState<Set<number>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
      if (data) setTareas(data as Tarea[]);
      setLoading(false);
    };
    void load();
    const canal = supabase
      .channel('tareas-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tareas' }, (p) => {
        const row = p.new as Tarea;
        setTareas((prev) => [row, ...prev]);
        setNuevas((prev) => new Set(prev).add(row.id));
        window.setTimeout(() => {
          setNuevas((prev) => {
            const next = new Set(prev);
            next.delete(row.id);
            return next;
          });
        }, 8000);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const marcar = async (id: number, hecha: boolean) => {
    await supabase.from('tareas').update({ completada: !hecha }).eq('id', id);
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, completada: !hecha } : t)));
  };

  const pendientes = tareas.filter((t) => !t.completada).length;
  const hechas = tareas.filter((t) => t.completada).length;
  const visibles = useMemo(() => {
    if (filtro === 'pendientes') return tareas.filter((t) => !t.completada);
    if (filtro === 'hechas') return tareas.filter((t) => t.completada);
    return tareas;
  }, [tareas, filtro]);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Selector de Pestañas Principal */}
      <div className="flex border-b border-white/10 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('datasets')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'datasets'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Database size={18} />
          Mis Datasets
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tareas')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'tareas'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare size={18} />
          Tareas
        </button>
      </div>

      {/* RENDERIZADO CONDICIONAL DE SECCIONES */}
      {activeTab === 'datasets' ? (
        <MisDatasets />
      ) : (
        <>
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Tareas</h1>
            <p className="text-slate-400 mt-2 text-sm">Cola de trabajo. Lo envía el Administrador al aplicar una recomendación.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'Pendientes', v: String(pendientes), on: filtro === 'pendientes', f: 'pendientes' as Filtro },
              { k: 'Hechas', v: String(hechas), on: filtro === 'hechas', f: 'hechas' as Filtro },
              { k: 'Todas', v: String(tareas.length), on: filtro === 'todas', f: 'todas' as Filtro },
            ].map((x) => (
              <button
                key={x.k}
                type="button"
                onClick={() => setFiltro(x.f)}
                className={`nx-card p-4 text-left transition ${x.on ? 'border-blue-500 bg-blue-600/20' : 'hover:border-blue-500/40'}`}
              >
                <p className="text-xs text-slate-400">{x.k}</p>
                <p className="font-display text-3xl font-bold text-white mt-1">{x.v}</p>
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-slate-500">Cargando…</p>
          ) : visibles.length === 0 ? (
            <div className="nx-card p-12 text-center space-y-3">
              <ClipboardList className="mx-auto text-blue-400" size={40} />
              <p className="text-xl text-white font-medium">
                {tareas.length === 0 ? 'Cola vacía' : 'Nada en este filtro'}
              </p>
              <p className="text-slate-400 max-w-md mx-auto">
                {tareas.length === 0
                  ? 'La cola está vacía. Las recomendaciones aplicadas llegan aquí en tiempo real.'
                  : 'No hay ítems en este filtro.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibles.map((t) => {
                const prio = tonoPrioridad(t.prioridad);
                const esNueva = nuevas.has(t.id);
                return (
                  <div
                    key={t.id}
                    className={`nx-card overflow-hidden flex ${t.completada ? 'opacity-70' : ''} ${esNueva ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className={`w-2 shrink-0 ${prio.bar}`} />
                    <div className="flex-1 p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {esNueva && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-600 text-white px-2 py-0.5 rounded-md">
                              Nueva
                            </span>
                          )}
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${prio.pill}`}>
                            {prio.label}
                          </span>
                        </div>
                        <p className={`text-base md:text-lg font-medium leading-snug line-clamp-3 ${t.completada ? 'line-through text-slate-500' : 'text-white'}`}>
                          {t.accion}
                        </p>
                        <p className="text-sm text-slate-500 mt-2">{t.cliente}</p>
                      </div>
                      <button
                        type="button"
                        className={`shrink-0 rounded-xl px-5 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                          t.completada ? 'nx-btn-ghost' : 'nx-btn'
                        }`}
                        onClick={() => void marcar(t.id, t.completada)}
                      >
                        {t.completada ? (
                          <>
                            <RotateCcw size={16} />
                            Deshacer
                          </>
                        ) : (
                          <>
                            <Check size={18} />
                            Marcar como hecha
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};