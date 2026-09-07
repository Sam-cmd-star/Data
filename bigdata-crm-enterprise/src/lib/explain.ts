import { delayReviewInsight } from './analyze';
import { formatMoney, formatPct } from './format';
import { profileDataset } from './profile';
import type { RankedRow } from './recommend';

export interface WhyReport {
  headline: string;
  why: string[];
  how: string[];
  task: string;
}

function round1(n: number) {
  return Number(n.toFixed(1));
}

/** Por qué gana y qué copiar: solo con números del CSV, no inventa. */
export function explainWinner(ranked: RankedRow[], rubroNombre: string): WhyReport | null {
  if (ranked.length < 2) return null;

  const rows = ranked.map((r) => ({
    ...r,
    profile: profileDataset(r.dataset),
    delayRev: delayReviewInsight(r.dataset),
  }));
  const winner = rows[0];
  const mine = rows.find((r) => r.dataset.isMine);
  const peer = mine && mine.dataset.id !== winner.dataset.id ? mine : rows[1];
  const vsMine = Boolean(mine && mine.dataset.id !== winner.dataset.id);

  const why: string[] = [];
  const how: string[] = [];

  const gap = winner.money.gananciaNeta - peer.money.gananciaNeta;
  why.push(
    `Ganó porque su ganancia neta es ${formatMoney(winner.money.gananciaNeta)} contra ${formatMoney(peer.money.gananciaNeta)} de ${peer.dataset.name} (diferencia ${formatMoney(gap)}).`,
  );

  if (winner.money.margen !== peer.money.margen) {
    if (winner.money.margen > peer.money.margen) {
      why.push(
        `El margen también es mejor: ${formatPct(winner.money.margen)} vs ${formatPct(peer.money.margen)}. O sea, de cada peso que entra le queda más.`,
      );
    } else {
      why.push(
        `Ojo: gana en plata total, pero el margen es menor (${formatPct(winner.money.margen)} vs ${formatPct(peer.money.margen)}). Puede ser por vender más, no por ser más eficiente.`,
      );
    }
  }

  if (winner.profile.delayAvg != null && peer.profile.delayAvg != null) {
    const w = winner.profile.delayAvg;
    const p = peer.profile.delayAvg;
    if (w + 0.3 < p) {
      why.push(
        `Entrega más rápido: ${round1(w)} días vs ${round1(p)} días. Eso encaja con la metodología «${winner.dataset.metodologia}».`,
      );
      how.push(`Bajar la demora hacia unos ${round1(w)} días (hoy ${peer.dataset.isMine ? 'lo nuestro' : peer.dataset.name} está en ${round1(p)}).`);
    } else if (w > p + 0.3) {
      why.push(
        `No gana por velocidad: tarda ${round1(w)} días, más que ${peer.dataset.name} (${round1(p)}). La plata viene por otro lado (margen o volumen).`,
      );
    }
  }

  if (winner.profile.reviewAvg != null && peer.profile.reviewAvg != null) {
    const w = winner.profile.reviewAvg;
    const p = peer.profile.reviewAvg;
    if (w > p + 0.15) {
      why.push(`Los clientes puntúan mejor: ${round1(w)} estrellas vs ${round1(p)}.`);
      how.push('Cuidar la experiencia (reseñas): el método ganador no solo vende, también deja mejor nota.');
    } else if (w + 0.15 < p) {
      why.push(
        `Gana en plata, pero las reseñas son peores (${round1(w)} vs ${round1(p)}). Copiar el método sin mirar calidad puede salir caro.`,
      );
    }
  }

  const dr = winner.delayRev;
  if (dr && !dr.sampleTooSmall && dr.pct1StarLate != null && dr.pct1StarOnTime != null && dr.pct1StarLate > dr.pct1StarOnTime + 8) {
    why.push(
      `En sus propios pedidos, cuando llega tarde (${dr.thresholdDays}+ días) hay más 1 estrella (${dr.pct1StarLate}%) que cuando llega a tiempo (${dr.pct1StarOnTime}%). La demora pega en la reseña.`,
    );
    how.push('Priorizar que no se pasen los días de entrega: los datos muestran que el atraso baja la nota.');
  }

  if (winner.profile.pedidos !== peer.profile.pedidos) {
    if (winner.profile.pedidos > peer.profile.pedidos) {
      why.push(`También mueve más operaciones: ${winner.profile.pedidos} pedidos vs ${peer.profile.pedidos}.`);
    }
  }

  how.unshift(
    `El método que conviene probar es «${winner.dataset.metodologia}», como ${winner.dataset.name}.`,
  );
  if (!how.some((h) => h.startsWith('Bajar la demora')) && winner.profile.delayAvg == null) {
    how.push('En el CSV no había columna de demora: el “cómo” se apoya en la etiqueta de metodología y en la plata.');
  }

  const headline = vsMine
    ? `En ${rubroNombre}, «${winner.dataset.metodologia}» le gana a lo nuestro.`
    : `En ${rubroNombre} gana «${winner.dataset.metodologia}» (${winner.dataset.name}).`;

  const task = [
    `Aplicar en ${mine?.dataset.name ?? 'lo nuestro'} (${rubroNombre}): metodología «${winner.dataset.metodologia}» como ${winner.dataset.name}.`,
    why[0],
    how[1] ?? how[0],
  ].join(' ');

  return { headline, why, how, task };
}
