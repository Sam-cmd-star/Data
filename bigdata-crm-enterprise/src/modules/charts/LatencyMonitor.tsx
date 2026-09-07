import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Line } from 'react-chartjs-2';
import { pingWithLatency, type TableStatus } from '../../lib/datasetStore';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

type Band = 'ok' | 'slow' | 'down';

interface Sample {
  label: string;
  ms: number;
  status: TableStatus;
}

function bandOf(ms: number, status: TableStatus): Band {
  if (status === 'offline' || status === 'missing') return 'down';
  if (status === 'forbidden') return 'slow';
  if (ms < 250) return 'ok';
  if (ms < 800) return 'slow';
  return 'down';
}

const COLORS: Record<Band, string> = {
  ok: '#34d399',
  slow: '#fbbf24',
  down: '#f87171',
};

function clock() {
  return new Date().toLocaleTimeString('es-AR', { hour12: false });
}

const MAX = 24;

export function LatencyMonitor({ actions }: { actions?: ReactNode }) {
  const { theme } = useTheme();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [running, setRunning] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const tick = async () => {
      const r = await pingWithLatency();
      if (!alive.current) return;
      setSamples((prev) => {
        const next = [...prev, { label: clock(), ms: r.ms, status: r.status }];
        return next.slice(-MAX);
      });
    };
    void tick();
    const id = window.setInterval(() => {
      if (running) void tick();
    }, 2500);
    return () => {
      alive.current = false;
      window.clearInterval(id);
    };
  }, [running]);

  const last = samples.at(-1);
  const band = last ? bandOf(last.ms, last.status) : 'slow';
  const color = COLORS[band];
  const title = band === 'ok' ? 'Operativo' : band === 'slow' ? 'Degradado' : 'No disponible';

  return (
    <div className="nx-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-5">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-slate-500">Operaciones</p>
          <p className="font-display text-2xl text-white mt-1">Salud del servicio</p>
          <p className="text-sm text-slate-500 mt-1">Tiempo de respuesta del servidor</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-4xl font-semibold tabular-nums" style={{ color }}>
            {last ? last.ms : '—'}
            <span className="text-base text-slate-500 ml-1">ms</span>
          </p>
          <p className="text-sm mt-2 font-medium" style={{ color }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle animate-pulse" style={{ background: color }} />
            {title}
          </p>
        </div>
      </div>
      <div className="h-64 px-4 pb-2">
        {samples.length < 2 ? (
          <p className="text-xs text-slate-500 px-2 pt-10">Tomando lecturas… el pulso aparece en unos segundos.</p>
        ) : (
          <Line
            data={{
              labels: samples.map((s) => s.label),
              datasets: [
                {
                  label: 'Tiempo de respuesta',
                  data: samples.map((s) => s.ms),
                  borderColor: color,
                  backgroundColor: `${color}22`,
                  fill: true,
                  tension: 0.35,
                  pointRadius: 3,
                  pointBackgroundColor: samples.map((s) => COLORS[bandOf(s.ms, s.status)]),
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 450 },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#020617',
                  titleColor: '#e2e8f0',
                  bodyColor: color,
                  callbacks: { label: (ctx) => `${ctx.parsed.y} ms` },
                },
              },
              scales: {
                x: {
                  ticks: { color: theme === 'light' ? '#334155' : '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 6, font: { size: 10 } },
                  grid: { color: theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(52, 211, 153, 0.06)' },
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: theme === 'light' ? '#334155' : '#64748b', callback: (v) => `${v} ms` },
                  grid: { color: theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(148, 163, 184, 0.08)' },
                },
              },
            }}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-white/5 text-xs text-slate-500">
        <p>
          <span className="text-emerald-400">Operativo</span> &lt; 250 ms · <span className="text-amber-300">Degradado</span> ·{' '}
          <span className="text-rose-400">No disponible</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button type="button" className="text-slate-400 hover:text-white px-2" onClick={() => setRunning((v) => !v)}>
            {running ? 'Pausar' : 'Reanudar'}
          </button>
        </div>
      </div>
    </div>
  );
}
