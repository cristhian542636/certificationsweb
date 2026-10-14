import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sitio, obtenerPlan, PLAN_DESTACADO } from "@/config/sitio";
import { obtenerSesion } from "@/lib/sesion";
import { MP_PUBLIC_KEY } from "@/lib/entorno";
import Checkout from "./Checkout";

export const metadata: Metadata = { title: "Comprar Premium" };
export const dynamic = "force-dynamic";

export default async function Comprar({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const sesion = await obtenerSesion();
  const { plan } = await searchParams;
  if (!sesion) redirect(`/ingresar?next=${encodeURIComponent(`/comprar${plan ? `?plan=${plan}` : ""}`)}`);

  const planInicial = obtenerPlan(plan)?.id ?? PLAN_DESTACADO.id;
  const venceEl =
    sesion.premium && sesion.perfil?.premium_hasta
      ? new Date(sesion.perfil.premium_hasta).toLocaleDateString("es-PE", { dateStyle: "long" })
      : null;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.1fr] [&>*]:min-w-0">
      <div>
        <p className="etiqueta">Checkout</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {venceEl ? "Extiende tu acceso Premium" : "Desbloquea el simulador completo"}
        </h1>
        {venceEl && (
          <p className="mt-3 rounded-lg border border-acento/40 bg-acento/10 px-4 py-3 text-sm">
            Tu acceso actual vence el <strong>{venceEl}</strong>. El tiempo que compres se suma a partir de esa fecha.
          </p>
        )}
        <div className="tarjeta mt-8 p-6">
          <p className="font-semibold">Todo lo que incluye Premium</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              "Banco completo de preguntas con explicaciones",
              `Simulacros de ${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos`,
              "Historial de intentos y progreso por dominio",
              "Preguntas nuevas mientras tu pase esté activo",
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

      <Checkout email={sesion.usuario.email} publicKey={MP_PUBLIC_KEY} planInicial={planInicial} />
    </div>
  );
}
