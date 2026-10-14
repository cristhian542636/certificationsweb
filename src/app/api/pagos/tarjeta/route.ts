import { NextResponse } from "next/server";
import { obtenerPlan } from "@/config/sitio";
import { crearPreferencia } from "@/lib/mercadopago";
import { obtenerSesion } from "@/lib/sesion";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "Inicia sesión para comprar." }, { status: 401 });

  const { plan: planId } = (await req.json().catch(() => ({}))) as { plan?: string };
  const plan = obtenerPlan(planId);
  if (!plan) return NextResponse.json({ ok: false, error: "Elige un pase válido." }, { status: 400 });

  try {
    const url = await crearPreferencia({ plan, usuarioId: sesion.usuario.id, email: sesion.usuario.email });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("Preferencia Checkout Pro:", e);
    return NextResponse.json({ ok: false, error: "No pudimos iniciar el pago. Inténtalo otra vez." }, { status: 502 });
  }
}
