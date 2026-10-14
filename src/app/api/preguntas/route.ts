import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { preguntasGratis, todasLasPreguntas } from "@/lib/preguntas";
import { obtenerResumen } from "@/lib/progreso-servidor";
import { DOMINIOS, esModo, type Dominio, type RespuestaPreguntas } from "@/lib/tipos";

export const dynamic = "force-dynamic";

// Devuelve las preguntas según el modo:
// - diagnostico: el set gratuito (2 por dominio), igual para todos.
// - dominio: solo las del dominio pedido.
// - repaso: las que el alumno respondió mal la última vez.
// - practica / examen: todo lo que su plan le permite.
export async function GET(req: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "Inicia sesión para usar el simulador." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const modo = esModo(params.get("modo")) ? (params.get("modo") as RespuestaPreguntas["modo"]) : "practica";
  const dominioParam = params.get("dominio");
  const dominio = dominioParam && dominioParam in DOMINIOS ? (dominioParam as Dominio) : undefined;

  const accesibles = sesion.premium ? await todasLasPreguntas() : await preguntasGratis();
  let preguntas = accesibles;

  if (modo === "diagnostico") {
    preguntas = await preguntasGratis();
  } else if (modo === "dominio") {
    if (!dominio) return NextResponse.json({ error: "dominio inválido" }, { status: 400 });
    preguntas = accesibles.filter((p) => p.dominio === dominio);
  } else if (modo === "repaso") {
    const resumen = await obtenerResumen();
    const errores = new Set(resumen.ultimas.filter((r) => !r.correcta).map((r) => r.pregunta_id));
    preguntas = accesibles.filter((p) => errores.has(p.id));
  }

  const cuerpo: RespuestaPreguntas = { premium: sesion.premium, preguntas, modo, dominio };
  return NextResponse.json(cuerpo, { headers: { "Cache-Control": "private, no-store" } });
}
