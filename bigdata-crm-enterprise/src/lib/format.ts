const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatMoney(value: number): string {
  return money.format(value);
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}
