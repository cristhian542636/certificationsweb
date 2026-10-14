import { NextResponse } from "next/server";
import { obtenerPlan } from "@/config/sitio";
import { crearPagoYape, mensajeRechazo, procesarPago } from "@/lib/mercadopago";
import { obtenerSesion } from "@/lib/sesion";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "Inicia sesión para comprar." }, { status: 401 });

  const { token, plan: planId } = (await req.json().catch(() => ({}))) as { token?: string; plan?: string };
  const plan = obtenerPlan(planId);
  if (!plan) return NextResponse.json({ ok: false, error: "Elige un pase válido." }, { status: 400 });
  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, error: "No se pudo validar tu Yape. Inténtalo otra vez." }, { status: 400 });
  }

  try {
    const pago = await crearPagoYape({ token, plan, usuarioId: sesion.usuario.id, email: sesion.usuario.email });
    // Registrar de inmediato; el webhook confirmará el mismo pago después (es idempotente).
    await procesarPago(pago);

    if (pago.status === "approved") return NextResponse.json({ ok: true, estado: "aprobado" });
    if (pago.status === "in_process" || pago.status === "pending") {
      return NextResponse.json({ ok: true, estado: "pendiente" });
    }
    return NextResponse.json({ ok: false, error: mensajeRechazo(pago.status_detail) }, { status: 402 });
  } catch (e) {
    console.error("Pago Yape:", e);
    return NextResponse.json(
      { ok: false, error: "No pudimos procesar el pago. No se realizó ningún cobro; inténtalo otra vez." },
      { status: 502 },
    );
  }
}
