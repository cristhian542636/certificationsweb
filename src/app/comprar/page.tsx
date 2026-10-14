import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sitio, formatoSoles } from "@/config/sitio";
import { obtenerSesion } from "@/lib/sesion";
import { MP_PUBLIC_KEY } from "@/lib/entorno";
import Checkout from "./Checkout";

export const metadata: Metadata = { title: "Comprar Premium" };
export const dynamic = "force-dynamic";

export default async function Comprar() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?next=/comprar");

  if (sesion.premium) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="etiqueta">Premium activo</p>
        <h1 className="mt-3 text-3xl font-semibold">Ya tienes acceso completo 🎉</h1>
        <p className="mt-3 text-tenue">
          Tu acceso vence el {new Date(sesion.perfil!.premium_hasta!).toLocaleDateString("es-PE", { dateStyle: "long" })}.
        </p>
        <Link href="/simulador" className="btn-primario mt-8">Ir al simulador →</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="etiqueta">Checkout</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Desbloquea el simulador completo</h1>
        <div className="tarjeta mt-8 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{sitio.producto.nombre}</p>
              <p className="mt-1 text-sm text-tenue">Pago único · {sitio.producto.mesesAcceso} meses de acceso</p>
            </div>
            <div className="text-right">
              <p className="whitespace-nowrap font-mono text-2xl font-semibold">{formatoSoles(sitio.producto.precio)}</p>
              <p className="whitespace-nowrap font-mono text-xs text-tenue line-through">{formatoSoles(sitio.producto.precioAnterior)}</p>
            </div>
          </div>
          <ul className="mt-6 space-y-2.5 border-t border-borde pt-6 text-sm">
            {[
              "Banco completo de preguntas con explicaciones",
              `Simulacros de ${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos`,
              "Historial de intentos y progreso por dominio",
              "Activación inmediata y automática",
              "Sin renovaciones ni cobros recurrentes",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="text-acento">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 flex items-center gap-2 text-xs text-tenue">
          <span aria-hidden>🔒</span> Pagos procesados por Mercado Pago. Nunca vemos ni guardamos los datos de tu tarjeta.
        </p>
      </div>

      <Checkout email={sesion.usuario.email} publicKey={MP_PUBLIC_KEY} />
    </div>
  );
}
