import type { Dataset } from '../types/dataset';
import { delayReviewInsight, financials, suggestMoneyMap } from './analyze';
import { parseCsv } from './parseCsv';

export function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    name.endsWith('.csv') ||
    type === 'text/csv' ||
    type === 'application/csv' ||
    type === 'text/plain' ||
    type === 'application/vnd.ms-excel'
  );
}

export function csvKindLabel(dataset: Pick<Dataset, 'headers' | 'rows'>): string {
  const probe = dataset as Dataset;
  const money = financials(probe);
  const extra = delayReviewInsight(probe);
  if (money.basis === 'ingresos_costos' || money.basis === 'monto_y_costos') {
    return extra
      ? 'CSV de ventas: monto/ingresos, costos, demora y reseñas'
      : 'CSV de ventas: tiene dinero (ingresos/monto y costos)';
  }
  if (money.basis === 'solo_ingresos') {
    return 'CSV con ingresos, sin columna de costos reconocida';
  }
  return 'CSV leído, pero no encontré columnas de dinero (monto, ingresos, costos…)';
}

export function readCsvFile(file: File): Promise<{
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
  kindLabel: string;
  suggested: { ingresos: string; costos: string; numeric: string[] };
}> {
  return new Promise((resolve, reject) => {
    if (!isCsvFile(file)) {
      reject(new Error('Solo se aceptan archivos CSV.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ''));
      if (!parsed.headers.length || !parsed.rows.length) {
        reject(new Error('El CSV no tiene encabezados y filas.'));
        return;
      }
      const suggested = suggestMoneyMap(parsed.headers, parsed.rows);
      resolve({
        filename: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        kindLabel: csvKindLabel(parsed),
        suggested,
      });
    };
    reader.readAsText(file);
  });
}
