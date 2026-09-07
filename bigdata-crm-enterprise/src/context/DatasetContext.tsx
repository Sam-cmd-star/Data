import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearDatasetsRemote,
  deleteDatasetRemote,
  fetchDatasets,
  getIsolationMode,
  insertDataset,
  markMineRemote,
  readCache,
  setIsolationMode,
  type TableStatus,
} from '../lib/datasetStore';
import type { Dataset } from '../types/dataset';

interface DatasetContextType {
  datasets: Dataset[];
  source: 'supabase' | 'cache';
  tableStatus: TableStatus;
  tableMessage: string;
  addDataset: (item: Omit<Dataset, 'id' | 'createdAt'>) => Promise<string>;
  removeDataset: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  markMine: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  isolation: boolean;
  setIsolation: (value: boolean) => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType | null>(null);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>(() => readCache());
  const [source, setSource] = useState<'supabase' | 'cache'>('cache');
  const [tableStatus, setTableStatus] = useState<TableStatus>('offline');
  const [tableMessage, setTableMessage] = useState('Comprobando…');
  const [isolation, setIsolationState] = useState(getIsolationMode());

  const refresh = async () => {
    const result = await fetchDatasets();
    setDatasets(result.data);
    setSource(result.source);
    setTableStatus(result.status);
    setTableMessage(result.message);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<DatasetContextType>(
    () => ({
      datasets,
      source,
      tableStatus,
      tableMessage,
      isolation,
      refresh,
      async setIsolation(value: boolean) {
        setIsolationMode(value);
        setIsolationState(value);
        await refresh();
      },
      async addDataset(item) {
        const ready: Dataset = {
          ...item,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const inserted = await insertDataset(ready);
        await refresh();
        return inserted.id;
      },
      async removeDataset(id) {
        await deleteDatasetRemote(id);
        await refresh();
      },
      async clearAll() {
        await clearDatasetsRemote();
        await refresh();
      },
      async markMine(id) {
        await markMineRemote(id);
        await refresh();
      },
    }),
    [datasets, source, tableStatus, tableMessage, isolation],
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
};

export function useDatasets() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDatasets debe usarse dentro de DatasetProvider');
  return ctx;
}
