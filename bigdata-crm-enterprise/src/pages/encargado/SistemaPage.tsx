import { useState } from 'react';
import { useDatasets } from '../../context/DatasetContext';
import { pingWithLatency } from '../../lib/datasetStore';
import { LatencyMonitor } from '../../modules/charts/LatencyMonitor';

export const SistemaPage: React.FC = () => {
  const { datasets, isolation, setIsolation, refresh, tableStatus } = useDatasets();
  const [busy, setBusy] = useState(false);

  const medir = async () => {
    setBusy(true);
    await pingWithLatency();
    await refresh();
    setBusy(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Salud del servicio</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Tiempo de respuesta del servidor. Si no está disponible, la operación sigue con la copia de este equipo (
          {datasets.length} datasets).
        </p>
      </div>

      <LatencyMonitor
        actions={
          <>
            <button type="button" className="nx-btn-ghost text-xs py-2 px-3" disabled={busy} onClick={() => void medir()}>
              {busy ? 'Midiendo…' : 'Medir ahora'}
            </button>
            <button type="button" className="nx-btn text-xs py-2 px-3" onClick={() => void setIsolation(!isolation)}>
              {isolation ? 'Salir de respaldo' : 'Modo respaldo'}
            </button>
          </>
        }
      />

      {isolation || tableStatus !== 'live' ? (
        <p className="text-sm text-amber-200/90">
          {isolation
            ? 'Modo respaldo activo: no se llama al servidor. Los datos que ves son locales.'
            : 'El servidor no responde. Se está usando la copia local.'}
        </p>
      ) : null}
    </div>
  );
};
