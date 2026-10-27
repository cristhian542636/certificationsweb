import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CERT_ACTUAL } from "@/config/certificaciones";
import { sitio, obtenerPase, PASE_DESTACADO, PASES_ACTUALES } from "@/config/sitio";
import { tieneDescuentoReferido } from "@/lib/precios";
import { estadisticasBanco } from "@/lib/preguntas";
import { obtenerSesion } from "@/lib/sesion";
import { MP_PUBLIC_KEY } from "@/lib/entorno";
import Checkout from "./Checkout";

export const metadata: Metadata = { title: "Comprar pase" };
export const dynamic = "force-dynamic";

export default async function Comprar({ searchParams }: { searchParams: Promise<{ pase?: string }> }) {
  const sesion = await obtenerSesion();
  const { pase } = await searchParams;
  if (!sesion) redirect(`/ingresar?next=${encodeURIComponent(`/comprar${pase ? `?pase=${pase}` : ""}`)}`);

  const elegido = obtenerPase(pase);
  const paseInicial = elegido && PASES_ACTUALES.includes(elegido) ? elegido.id : PASE_DESTACADO.id;
  const [descuento, { total }] = await Promise.all([
    tieneDescuentoReferido(sesion.usuario.id).catch(() => false),
    estadisticasBanco(),
  ]);
  const venceEl =
    sesion.premium && sesion.accesoHasta
      ? new Date(sesion.accesoHasta).toLocaleDateString("es-PE", { dateStyle: "long" })
      : null;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.1fr] [&>*]:min-w-0">
      <div>
        <p className="etiqueta">Checkout</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {venceEl ? "Extiende tu acceso Premium" : "Desbloquea el simulador completo"}
        </h1>
        <p className="mt-2 font-mono text-sm text-tenue">{CERT_ACTUAL.nombreOficial}</p>
        {venceEl && (
          <p className="mt-3 rounded-lg border border-acento/40 bg-acento/10 px-4 py-3 text-sm">
            Tu acceso actual vence el <strong>{venceEl}</strong>. El tiempo que compres se suma a partir de esa fecha.
          </p>
        )}
        <div className="tarjeta mt-8 p-6">
          <p className="font-semibold">Qué incluye Premium</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              `Banco completo de ${total} preguntas con explicaciones`,
              `Simulacros de ${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos, como el examen`,
              `Cada pregunta en español o en ${sitio.examen.idioma}, el idioma en que rendirás el examen`,
              "Activación inmediata, sin cobros recurrentes",
              `Si no apruebas, te extendemos el acceso ${sitio.garantia.dias} días sin costo`,
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="text-acento">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        {!venceEl && (
          <p className="mt-4 text-sm text-tenue">
            Si no apruebas el examen oficial, repetirlo cuesta USD {sitio.examen.costoUsd} y {sitio.examen.esperaReintentoDias} días
            de espera. Prepárate para aprobarlo a la primera.
          </p>
        )}
        <p className="mt-6 flex items-center gap-2 text-xs text-tenue">
          <span aria-hidden>🔒</span> Pagos procesados por Mercado Pago. Nunca vemos ni guardamos los datos de tu tarjeta.
        </p>
      </div>

      <Checkout email={sesion.usuario.email} publicKey={MP_PUBLIC_KEY} paseInicial={paseInicial} descuento={descuento} />
    </div>
  );
}
