import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { preguntasGratis, todasLasPreguntas } from "@/lib/preguntas";
import type { RespuestaPreguntas } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "Inicia sesión para usar el simulador." }, { status: 401 });

  const preguntas = sesion.premium ? await todasLasPreguntas() : await preguntasGratis();
  const cuerpo: RespuestaPreguntas = { premium: sesion.premium, preguntas };
  return NextResponse.json(cuerpo, { headers: { "Cache-Control": "private, no-store" } });
}
