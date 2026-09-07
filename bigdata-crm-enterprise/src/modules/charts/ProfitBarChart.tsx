import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';
import { formatMoney } from '../../lib/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function MetricBarChart({
  labels,
  values,
  label,
  kind = 'number',
}: {
  labels: string[];
  values: number[];
  label: string;
  kind?: 'money' | 'number';
}) {
  const { theme } = useTheme();
  const ink = theme === 'light' ? '#334155' : '#94a3b8';
  const grid = theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.12)';
  const tipBg = theme === 'light' ? '#ffffff' : '#0f172a';
  const tipTitle = theme === 'light' ? '#0f172a' : '#e2e8f0';
  const fmt = (n: number) => (kind === 'money' ? formatMoney(n) : String(n));
  return (
    <div className="h-64">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label,
              data: values,
              backgroundColor: labels.map((_, i) => (i === 0 ? '#3b82f6' : '#1d4ed8')),
              borderRadius: 8,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tipBg,
              titleColor: tipTitle,
              bodyColor: '#2563eb',
              borderColor: theme === 'light' ? '#e2e8f0' : '#1e293b',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => fmt(Number(ctx.parsed.y ?? 0)),
              },
            },
          },
          scales: {
            x: { ticks: { color: ink }, grid: { display: false } },
            y: {
              ticks: { color: ink, callback: (value) => fmt(Number(value)) },
              grid: { color: grid },
            },
          },
        }}
      />
    </div>
  );
}

export function ProfitBarChart(props: { labels: string[]; values: number[]; label: string }) {
  return <MetricBarChart {...props} kind="money" />;
}
