import { financials } from './analyze';
import { normalizeRubro } from './catalog';
import { supabase } from './supabaseClient';
import type { Dataset } from '../types/dataset';

export const DATASET_CACHE_KEY = 'nexus_bi_datasets_v1';

export type TableStatus = 'live' | 'missing' | 'forbidden' | 'offline';

let isolationMode = false;

export function setIsolationMode(value: boolean) {
  isolationMode = value;
}

export function getIsolationMode() {
  return isolationMode;
}

export function readCache(): Dataset[] {
  try {
    const raw = localStorage.getItem(DATASET_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Dataset[]) : [];
  } catch {
    return [];
  }
}

export function writeCache(items: Dataset[]) {
  try {
    const lightItems = items.map((item) => ({
      ...item,
      rows: Array.isArray(item.rows) ? item.rows.slice(0, 50) : [],
    }));
    localStorage.setItem(DATASET_CACHE_KEY, JSON.stringify(lightItems));
  } catch (e) {
    console.warn('No se pudo guardar el caché local:', e);
  }
}

function fromRow(row: Record<string, unknown>): Dataset {
  return {
    id: String(row.id),
    name: String(row.empresa ?? ''),
    rubro: normalizeRubro(String(row.rubro ?? '')),
    metodologia: String(row.metodologia ?? 'sin etiquetar'),
    isMine: Boolean(row.es_mio),
    filename: String(row.source_filename ?? ''),
    headers: Array.isArray(row.headers) ? (row.headers as string[]) : [],
    rows: Array.isArray(row.filas) ? (row.filas as Record<string, string>[]) : [],
    createdAt: String(row.created_at ?? new Date().toISOString()),
    ingresos: typeof row.ingresos === 'number' ? row.ingresos : Number(row.ingresos ?? 0),
    costos: typeof row.costos === 'number' ? row.costos : Number(row.costos ?? 0),
  };
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === 'PGRST205' || msg.includes('could not find the table') || msg.includes('schema cache');
}

export async function pingWithLatency(): Promise<{ status: TableStatus; message: string; ms: number }> {
  const t0 = performance.now();
  const result = await probeDatasetsTable();
  return { ...result, ms: Math.round(performance.now() - t0) };
}

export async function probeDatasetsTable(): Promise<{ status: TableStatus; message: string }> {
  if (isolationMode) {
    return { status: 'offline', message: 'Modo resiliencia: la app no está llamando a la nube.' };
  }
  const { error } = await supabase.from('datasets').select('id').limit(1);
  if (!error) return { status: 'live', message: 'Nube conectada.' };
  if (isMissingTable(error)) {
    return { status: 'missing', message: 'Falta la tabla datasets en la nube.' };
  }
  if (error.code === '42501' || /permission|rls|policy/i.test(error.message)) {
    return { status: 'forbidden', message: error.message };
  }
  return { status: 'offline', message: error.message };
}

export async function fetchDatasets(): Promise<{
  data: Dataset[];
  source: 'supabase' | 'cache';
  status: TableStatus;
  message: string;
}> {
  const probe = await probeDatasetsTable();
  if (probe.status === 'live') {
    const { data, error } = await supabase.from('datasets').select('*').order('created_at', { ascending: true });
    if (error) {
      return { data: readCache(), source: 'cache', status: 'offline', message: error.message };
    }
    const mapped = (data ?? []).map((row) => fromRow(row as Record<string, unknown>));
    if (mapped.length === 0) {
      const local = readCache();
      if (local.length > 0) {
        for (const item of local) {
          try {
            await insertDataset(item);
          } catch {
            break;
          }
        }
        const again = await supabase.from('datasets').select('*').order('created_at', { ascending: true });
        if (!again.error && again.data) {
          const synced = again.data.map((row) => fromRow(row as Record<string, unknown>));
          writeCache(synced);
          return { data: synced, source: 'supabase', status: 'live', message: probe.message };
        }
      }
    }
    writeCache(mapped);
    return { data: mapped, source: 'supabase', status: 'live', message: probe.message };
  }
  return { data: readCache(), source: 'cache', status: probe.status, message: probe.message };
}

export async function insertDataset(item: Dataset): Promise<{ id: string; source: 'supabase' | 'cache' }> {
  const probe = await probeDatasetsTable();
  const money = financials(item);
  const { data: sessionData } = await supabase.auth.getUser();

  if (probe.status === 'live') {
    if (item.isMine) {
      await supabase.from('datasets').update({ es_mio: false }).neq('id', item.id);
    }

    // Muestra ligera de 100 filas para previsualizar en la tabla sin saturar Supabase
    const sampleRows = Array.isArray(item.rows) ? item.rows.slice(0, 100) : [];

    const { data, error } = await supabase
      .from('datasets')
      .insert({
        empresa: item.name,
        rubro: normalizeRubro(item.rubro),
        metodologia: item.metodologia,
        ingresos: money.ingresos,
        costos: money.costos,
        es_mio: item.isMine,
        headers: item.headers,
        filas: sampleRows,
        source_filename: item.filename,
        created_by: sessionData.user?.id ?? null,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      throw new Error(error?.message ?? 'No se pudo guardar en Supabase.');
    }
    return { id: String(data.id), source: 'supabase' };
  }

  const cache = readCache().map((d) => (item.isMine ? { ...d, isMine: false } : d));
  writeCache([...cache, item]);
  return { id: item.id, source: 'cache' };
}

export async function deleteDatasetRemote(id: string): Promise<void> {
  const probe = await probeDatasetsTable();
  if (probe.status === 'live') {
    const { error } = await supabase.from('datasets').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
  writeCache(readCache().filter((d) => d.id !== id));
}

export async function clearDatasetsRemote(): Promise<void> {
  const probe = await probeDatasetsTable();
  if (probe.status === 'live') {
    const { error } = await supabase.from('datasets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(error.message);
  }
  localStorage.removeItem(DATASET_CACHE_KEY);
}

export async function markMineRemote(id: string): Promise<void> {
  const probe = await probeDatasetsTable();
  if (probe.status === 'live') {
    const { error: a } = await supabase.from('datasets').update({ es_mio: false }).neq('id', id);
    if (a) throw new Error(a.message);
    const { error: b } = await supabase.from('datasets').update({ es_mio: true }).eq('id', id);
    if (b) throw new Error(b.message);
    return;
  }
  writeCache(readCache().map((d) => ({ ...d, isMine: d.id === id })));
}

export const DATASETS_SQL_EDITOR =
  'https://supabase.com/dashboard/project/oockgxorqwujwiuywfdf/sql/new';