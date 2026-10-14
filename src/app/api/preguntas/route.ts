import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_ACCESO, verificarCodigo } from "@/lib/acceso";
import { preguntasGratis, todasLasPreguntas } from "@/lib/preguntas";
import type { RespuestaPreguntas } from "@/lib/tipos";
import { sitio } from "@/config/sitio";

export const dynamic = "force-dynamic";

export async function GET() {
  const codigo = (await cookies()).get(COOKIE_ACCESO)?.value;
  let premium = false;
  if (codigo) {
    try {
      premium = verificarCodigo(codigo, sitio.producto.id) !== null;
    } catch {
      premium = false;
    }
  }

  const preguntas = premium ? await todasLasPreguntas() : await preguntasGratis();
  const cuerpo: RespuestaPreguntas = { premium, preguntas };
  return NextResponse.json(cuerpo, { headers: { "Cache-Control": "private, no-store" } });
}
