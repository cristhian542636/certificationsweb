import { NextResponse } from "next/server";
import { crearPreferencia } from "@/lib/mercadopago";
import { obtenerSesion } from "@/lib/sesion";

export async function POST() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "Inicia sesión para comprar." }, { status: 401 });

  try {
    const url = await crearPreferencia({ usuarioId: sesion.usuario.id, email: sesion.usuario.email });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("Preferencia Checkout Pro:", e);
    return NextResponse.json({ ok: false, error: "No pudimos iniciar el pago. Inténtalo otra vez." }, { status: 502 });
  }
}
