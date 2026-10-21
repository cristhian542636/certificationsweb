import { RANGOS, type EstadoRango, type Rango } from "@/lib/progreso";

// Insignia del alumno dibujada en SVG: medalla con cinta, del color de su rango.
const COLOR: Record<Rango, string> = {
  ninguno: "var(--color-borde-fuerte)",
  bronce: "var(--color-bronce)",
  plata: "var(--color-plata)",
  oro: "var(--color-oro)",
};

export function Insignia({ rango, tamano = 72, bloqueada = false }: { rango: Rango; tamano?: number; bloqueada?: boolean }) {
  const color = bloqueada ? COLOR.ninguno : COLOR[rango];
  const nombre = rango === "ninguno" ? "Sin insignia" : `Insignia ${RANGOS[rango].nombre}`;
  return (
    <svg width={tamano} height={tamano * 1.25} viewBox="0 0 80 100" role="img" aria-label={bloqueada ? `${nombre} (por ganar)` : nombre} className="shrink-0">
      {/* Cinta */}
      <path d="M22 4h14l8 30H30z" fill={color} opacity={bloqueada ? 0.35 : 0.55} />
      <path d="M58 4H44l-8 30h14z" fill={color} opacity={bloqueada ? 0.35 : 0.8} />
      {/* Medalla */}
      <circle cx="40" cy="62" r="30" fill="var(--color-panel-2)" stroke={color} strokeWidth="4" />
      <circle cx="40" cy="62" r="22" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
      {/* Estrella */}
      <path
        d="M40 47l4.4 9 9.9 1.4-7.2 7 1.7 9.8L40 69.6l-8.8 4.6 1.7-9.8-7.2-7 9.9-1.4z"
        fill={bloqueada ? "none" : color}
        stroke={color}
        strokeWidth={bloqueada ? 1.5 : 0}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tarjeta de la insignia: la actual y las metas que faltan para la siguiente. */
export function TarjetaInsignia({ estado, premium }: { estado: EstadoRango; premium: boolean }) {
  const { actual, siguiente, metas } = estado;
  return (
    <div className="tarjeta p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-tenue">Tu insignia</p>
      <div className="mt-4 flex items-center gap-4">
        <Insignia rango={actual === "ninguno" ? "bronce" : actual} bloqueada={actual === "ninguno"} tamano={64} />
        <div className="min-w-0">
          <p className="text-lg font-semibold">{actual === "ninguno" ? "Aún sin insignia" : `Insignia ${RANGOS[actual].nombre}`}</p>
          <p className="text-xs text-tenue">
            {siguiente ? `Próxima: ${RANGOS[siguiente].nombre}` : "Alcanzaste la insignia más alta. ¡Mantén tu ritmo hasta el examen!"}
          </p>
        </div>
      </div>
      {siguiente && (
        <ul className="mt-5 space-y-2 text-sm">
          {metas.map((m) => (
            <li key={m.texto} className="flex gap-2.5">
              <span className={m.cumplida ? "text-emerald-400" : "text-tenue"} aria-hidden>
                {m.cumplida ? "✓" : "○"}
              </span>
              <span className={m.cumplida ? "text-tenue line-through" : ""}>
                {m.texto}
                {m.premium && !premium && <span className="ml-1 text-xs text-oro">(Premium)</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
