import { NextResponse } from "next/server";
import { CERT_ACTUAL } from "@/config/certificaciones";
import { obtenerPase, pasesPara } from "@/config/sitio";
import { crearPreferencia } from "@/lib/mercadopago";
import { precioParaUsuario } from "@/lib/precios";
import { obtenerSesion } from "@/lib/sesion";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "Inicia sesión para comprar." }, { status: 401 });

  const { pase: paseId } = (await req.json().catch(() => ({}))) as { pase?: string };
  const pase = obtenerPase(paseId);
  if (!pase || !pasesPara(CERT_ACTUAL).includes(pase)) {
    return NextResponse.json({ ok: false, error: "Elige un pase válido." }, { status: 400 });
  }

  try {
    const { id: usuarioId, email } = sesion.usuario;
    const monto = await precioParaUsuario(usuarioId, pase);
    const url = await crearPreferencia({ pase, cert: CERT_ACTUAL, usuarioId, email, monto });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("Preferencia Checkout Pro:", e);
    return NextResponse.json({ ok: false, error: "No pudimos iniciar el pago. Inténtalo otra vez." }, { status: 502 });
  }
}
