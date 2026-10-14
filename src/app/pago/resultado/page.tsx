import type { Metadata } from "next";
import Link from "next/link";
import { leerReferencia, obtenerPago, procesarPago } from "@/lib/mercadopago";
import { obtenerSesion } from "@/lib/sesion";
import BienvenidaPremium from "@/components/BienvenidaPremium";

export const metadata: Metadata = { title: "Resultado del pago" };

// Página de retorno de Checkout Pro. Además de mostrar el resultado, registra el pago
// por si el webhook aún no llegó (procesarPago es idempotente).
export default async function ResultadoPago({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const paymentId = params.payment_id ?? params.collection_id;
  let estado = params.status ?? params.collection_status ?? "desconocido";

  if (paymentId && paymentId !== "null") {
    try {
      const pago = await obtenerPago(paymentId);
      const sesion = await obtenerSesion();
      if (sesion && leerReferencia(pago.external_reference).usuarioId === sesion.usuario.id) {
        await procesarPago(pago);
        estado = pago.status;
      }
    } catch (e) {
      console.error("Retorno Checkout Pro:", e);
    }
  }

  const vistas: Record<string, { icono: string; titulo: string; texto: string; color: string }> = {
    approved: {
      icono: "✓",
      titulo: "¡Pago aprobado!",
      texto: "Tu cuenta ya es Premium. Ya puedes hacer simulacros completos.",
      color: "bg-emerald-500/15 text-emerald-400",
    },
    pending: {
      icono: "…",
      titulo: "Pago pendiente",
      texto: "Tu pago está en proceso. Apenas Mercado Pago lo confirme, tu acceso se activará automáticamente.",
      color: "bg-amber-500/15 text-amber-400",
    },
    in_process: {
      icono: "…",
      titulo: "Pago en revisión",
      texto: "Mercado Pago está revisando el pago. Tu acceso se activará automáticamente al aprobarse.",
      color: "bg-amber-500/15 text-amber-400",
    },
  };
  const vista = vistas[estado] ?? {
    icono: "✗",
    titulo: "El pago no se completó",
    texto: "No se realizó ningún cobro. Puedes intentarlo otra vez con Yape u otra tarjeta.",
    color: "bg-red-500/15 text-red-400",
  };

  if (estado === "approved") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <BienvenidaPremium detalle="Pago aprobado: tu cuenta ya es Premium." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${vista.color}`}>{vista.icono}</span>
      <h1 className="mt-5 text-3xl font-semibold">{vista.titulo}</h1>
      <p className="mt-3 text-tenue">{vista.texto}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/panel" className="btn-secundario px-6 py-3">Mi panel</Link>
        {!vistas[estado] && <Link href="/comprar" className="btn-primario px-6 py-3">Intentar otra vez</Link>}
      </div>
    </div>
  );
}
