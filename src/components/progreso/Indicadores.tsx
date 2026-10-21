import { NIVELES, type Nivel } from "@/lib/progreso";

/** Índice de preparación: cifra principal + medidor circular (pista del mismo tono, más tenue). */
export function AnilloPreparacion({ indice, etiqueta, tamano = 168 }: { indice: number; etiqueta: string; tamano?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const listo = indice >= 85;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: tamano, height: tamano }}>
        <svg viewBox="0 0 100 100" className="-rotate-90" width={tamano} height={tamano} role="img" aria-label={`Índice de preparación: ${indice}%`}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-acento/15" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.max(0, Math.min(100, indice)) / 100)}
            className={`transition-[stroke-dashoffset] duration-700 ${listo ? "text-emerald-400" : "text-acento"}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold tracking-tight">{indice}%</span>
        </div>
      </div>
      <p className={`mt-3 text-sm font-medium ${listo ? "text-emerald-400" : "text-texto"}`}>{etiqueta}</p>
    </div>
  );
}

/** Medalla de nivel por dominio: color + nombre (nunca solo color). */
export function Medalla({ nivel }: { nivel: Nivel }) {
  const n = NIVELES[nivel];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-fondo px-2.5 py-0.5 font-mono text-[11px] text-tenue">
      <span className="h-2 w-2 rounded-full" style={{ background: n.color }} aria-hidden />
      {n.nombre}
    </span>
  );
}

/** Medidor horizontal: relleno de acento sobre pista del mismo tono. */
export function Medidor({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, valor)) * 100);
  return (
    <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={etiqueta}>
      <div className="h-1.5 rounded-full bg-acento/15">
        <div className={`h-1.5 rounded-full ${pct >= 80 ? "bg-emerald-400" : "bg-acento"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Racha de práctica: días seguidos + los últimos 7 días marcados. */
export function Racha({ racha, diasActivos, hoy }: { racha: number; diasActivos: Set<string>; hoy: string }) {
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${hoy}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const letra = ["D", "L", "M", "M", "J", "V", "S"][d.getUTCDay()];
    return { iso, letra, activo: diasActivos.has(iso) };
  });
  return (
    <div>
      {racha === 0 ? (
        <p className="text-lg font-semibold">Empieza tu racha hoy</p>
      ) : (
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold">{racha}</span>
          <span className="text-sm text-tenue">{racha === 1 ? "día seguido" : "días seguidos"}</span>
          {racha >= 3 && <span aria-hidden>🔥</span>}
        </p>
      )}
      <div className="mt-4 flex gap-1.5">
        {dias.map((d) => (
          <div key={d.iso} className="flex flex-col items-center gap-1" title={`${d.iso}: ${d.activo ? "practicaste" : "sin práctica"}`}>
            <span
              className={`h-6 w-6 rounded-md border ${d.activo ? "border-acento bg-acento/80" : "border-borde bg-fondo"}`}
              aria-label={`${d.iso} ${d.activo ? "con práctica" : "sin práctica"}`}
            />
            <span className="font-mono text-[10px] text-tenue">{d.letra}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MODOS_TEXTO: Record<string, string> = {
  practica: "Práctica",
  examen: "Simulacro",
  diagnostico: "Diagnóstico",
  dominio: "Por dominio",
  repaso: "Repaso",
};

/** Tendencia de los últimos intentos: barras finas, la más reciente en acento; tooltip al pasar el mouse. */
export function TendenciaIntentos({
  intentos,
  meta,
}: {
  intentos: { modo: string; total: number; correctas: number; creado_en: string }[];
  meta: number;
}) {
  const alto = 120;
  return (
    <div>
      <div className="relative" style={{ height: alto }}>
        <div
          className="absolute inset-x-0 border-t border-dashed border-borde-fuerte"
          style={{ bottom: `${meta}%` }}
          aria-hidden
        />
        <span className="absolute right-0 -translate-y-full pb-0.5 font-mono text-[10px] text-tenue" style={{ bottom: `${meta}%` }}>
          meta {meta}%
        </span>
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {intentos.map((i, idx) => {
            const pct = Math.round((i.correctas / i.total) * 100);
            const ultimo = idx === intentos.length - 1;
            const fecha = new Date(i.creado_en).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
            return (
              <div key={i.creado_en} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0}>
                <div
                  className={`w-full max-w-7 rounded-t ${ultimo ? "bg-acento" : "bg-tenue/40 group-hover:bg-tenue/70"}`}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
                <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-md border border-borde-fuerte bg-panel-2 px-2.5 py-1.5 text-xs shadow-lg group-hover:block group-focus:block">
                  <p className="font-semibold">{pct}%</p>
                  <p className="text-tenue">
                    {MODOS_TEXTO[i.modo] ?? i.modo} · {i.correctas}/{i.total} · {fecha}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-tenue">Tus últimos {intentos.length} intentos · el más reciente resaltado</p>
    </div>
  );
}
