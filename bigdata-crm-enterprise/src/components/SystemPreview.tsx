/** Vista previa del producto. No usa CSV ni números reales. */
export function SystemPreview() {
  return (
    <div className="nx-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-white/10 bg-white/[0.03]">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        <p className="ml-1.5 text-[11px] text-slate-500 truncate">Comparación · mismo rubro</p>
        <span className="ml-auto text-[10px] text-slate-600">ilustración</span>
      </div>
      <div className="px-4 pt-3 pb-3">
        <p className="text-xs text-slate-400 mb-2">Ganancia neta</p>
        <div className="flex items-end gap-3 h-24">
          <Bar h="92%" tone="bg-blue-600 shadow-[0_0_18px_rgba(37,99,235,0.4)]" caption="Mejor método" mark />
          <Bar h="58%" tone="bg-sky-400/90" caption="Tu empresa" />
          <Bar h="40%" tone="bg-slate-600" caption="Par del rubro" />
        </div>
      </div>
    </div>
  );
}

function Bar({
  h,
  tone,
  caption,
  mark,
}: {
  h: string;
  tone: string;
  caption: string;
  mark?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
      {mark ? (
        <span className="text-[9px] font-semibold tracking-wide text-blue-600">GANA</span>
      ) : (
        <span className="h-3" />
      )}
      <div className={`w-full rounded-t-lg ${tone}`} style={{ height: h }} />
      <span className="text-[10px] text-slate-400 text-center leading-tight">{caption}</span>
    </div>
  );
}
