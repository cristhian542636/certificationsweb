import { DOMINIOS, PESOS, TEMAS, type Dominio } from "@/lib/tipos";

// Secciones del examen con su peso y la cantidad de preguntas del banco en cada una.
export default function Temario({ porDominio }: { porDominio: Partial<Record<Dominio, number>> }) {
  const maximo = Math.max(...Object.values(PESOS));
  return (
    <div className="mt-12 space-y-3">
      {(Object.keys(DOMINIOS) as Dominio[]).map((d, i) => (
        <div key={d} className="tarjeta grid gap-4 p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8">
          <span className="font-mono text-sm text-tenue">0{i + 1}</span>
          <div>
            <h3 className="font-semibold">{DOMINIOS[d]}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {TEMAS[d].map((t) => (
                <span key={t} className="rounded-md border border-borde bg-fondo px-2.5 py-1 font-mono text-xs text-tenue">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="md:w-40 md:text-right">
            <p className="font-mono text-sm text-acento">{PESOS[d]}% del examen</p>
            <div className="mt-2 h-1.5 rounded-full bg-acento/15" aria-hidden>
              <div className="h-1.5 rounded-full bg-acento" style={{ width: `${(PESOS[d] / maximo) * 100}%` }} />
            </div>
            <p className="mt-2 font-mono text-xs text-tenue">{porDominio[d] ?? 0} preguntas</p>
          </div>
        </div>
      ))}
    </div>
  );
}
