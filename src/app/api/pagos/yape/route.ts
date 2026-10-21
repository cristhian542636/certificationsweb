import { NextResponse } from "next/server";
import { CERT_ACTUAL } from "@/config/certificaciones";
import { obtenerPase, pasesPara } from "@/config/sitio";
import { crearPagoYape, mensajeRechazo, procesarPago } from "@/lib/mercadopago";
import { precioParaUsuario } from "@/lib/precios";
import { obtenerSesion } from "@/lib/sesion";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "Inicia sesión para comprar." }, { status: 401 });

  const { token, pase: paseId } = (await req.json().catch(() => ({}))) as { token?: string; pase?: string };
  const pase = obtenerPase(paseId);
  if (!pase || !pasesPara(CERT_ACTUAL).includes(pase)) {
    return NextResponse.json({ ok: false, error: "Elige un pase válido." }, { status: 400 });
  }
  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, error: "No se pudo validar tu Yape. Inténtalo otra vez." }, { status: 400 });
  }

  try {
    const { id: usuarioId, email } = sesion.usuario;
    const monto = await precioParaUsuario(usuarioId, pase);
    const pago = await crearPagoYape({ token, pase, cert: CERT_ACTUAL, usuarioId, email, monto });
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
