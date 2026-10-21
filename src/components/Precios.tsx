import Link from "next/link";
import type { Certificacion } from "@/config/certificaciones";
import { sitio, formatoSoles, duracion, pasesPara, precioAnterior, precioVigente, esDestacado } from "@/config/sitio";

// Tarjetas de precio de una certificación: plan gratis + sus pases.
export default function Precios({ cert, totalPreguntas, gratis }: { cert: Certificacion; totalPreguntas: number; gratis: number }) {
  const pases = pasesPara(cert);
  return (
    <>
      <div className={`mx-auto mt-12 grid max-w-5xl gap-6 ${pases.length >= 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <TarjetaPrecio
          nombre="Gratis"
          precio="S/ 0"
          nota="para siempre"
          cta="Haz tu diagnóstico gratis"
          href="/registro"
          items={[`Diagnóstico de ${gratis} preguntas con explicaciones`, "Tu resultado por sección del examen"]}
        />
        {pases.map((pase) => {
          const destacado = esDestacado(pase);
          const anterior = precioAnterior(pase);
          return (
            <TarjetaPrecio
              key={pase.id}
              destacado={destacado}
              insignia={destacado ? "más elegido" : undefined}
              nombre={pase.nombre}
              precio={formatoSoles(precioVigente(pase))}
              anterior={anterior ? formatoSoles(anterior) : undefined}
              nota={`pago único · ${pase.nota}`}
              cta={`Elegir ${duracion(pase)}`}
              href={`/comprar?pase=${pase.id}`}
              items={[
                `Banco completo de ${totalPreguntas} preguntas`,
                `Simulacros de ${cert.examen.preguntas} preguntas como el examen`,
                ...(sitio.acompanamiento.dudasPorWhatsapp ? ["Dudas con el instructor por WhatsApp"] : []),
                `Si no apruebas, +${sitio.garantia.dias} días sin costo`,
              ]}
            />
          );
        })}
      </div>
      {sitio.lanzamiento && (
        <p className="mt-6 text-center font-mono text-xs text-tenue">Precio de lanzamiento por tiempo limitado.</p>
      )}
      <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-tenue">
        <span>Paga con</span>
        {["Yape", "Visa", "Mastercard", "Amex"].map((m) => (
          <span key={m} className="rounded-md border border-borde bg-panel px-2.5 py-1 font-mono text-xs text-texto">
            {m}
          </span>
        ))}
        <span>· Procesado de forma segura por Mercado Pago</span>
      </p>
    </>
  );
}

function TarjetaPrecio(props: {
  nombre: string;
  precio: string;
  anterior?: string;
  nota: string;
  cta: string;
  href: string;
  items: string[];
  destacado?: boolean;
  insignia?: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 ${
        props.destacado ? "border-acento/60 bg-panel shadow-2xl shadow-acento/10" : "border-borde bg-panel/60"
      }`}
    >
      {props.insignia && (
        <span className="absolute -top-3 left-8 rounded-full bg-acento px-3 py-0.5 font-mono text-xs font-semibold text-fondo">
          {props.insignia}
        </span>
      )}
      <p className="font-mono text-sm text-tenue">{props.nombre}</p>
      <p className="mt-3 flex items-baseline gap-3">
        <span className="text-4xl font-semibold tracking-tight">{props.precio}</span>
        {props.anterior && <span className="font-mono text-base text-tenue line-through">{props.anterior}</span>}
      </p>
      <p className="mt-1 text-sm text-tenue">{props.nota}</p>
      <ul className="mt-8 flex-1 space-y-3 text-sm">
        {props.items.map((it) => (
          <li key={it} className="flex gap-3">
            <span className="text-acento">✓</span>
            {it}
          </li>
        ))}
      </ul>
      <Link href={props.href} className={`${props.destacado ? "btn-primario" : "btn-secundario"} mt-8 w-full py-3`}>
        {props.cta}
      </Link>
    </div>
  );
}
