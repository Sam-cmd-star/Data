import { useDatasets } from '../context/DatasetContext';

export const ConnectionBar: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { tableStatus, source, isolation } = useDatasets();

  if (isolation) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-2 text-xs text-sky-300">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          Respaldo
        </span>
      );
    }
    return (
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-100">
        Modo respaldo: copia local. El servidor no se está usando.
      </div>
    );
  }
  if (tableStatus === 'live' && source === 'supabase') {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-emerald-400/90">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        En línea
      </span>
    );
  }
  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Sin servidor
      </span>
    );
  }
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100">
      Sin servidor. Operación con copia de este equipo.
    </div>
  );
};
