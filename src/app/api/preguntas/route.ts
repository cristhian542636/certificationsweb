import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { preguntasGratis } from "@/lib/preguntas";
import { obtenerResumen, preguntasAccesibles } from "@/lib/progreso-servidor";
import { seleccionarPreguntas, type Historial } from "@/lib/seleccion";
import { DOMINIOS, esModo, type Dominio, type RespuestaPreguntas } from "@/lib/tipos";

export const dynamic = "force-dynamic";

// Devuelve las preguntas de la sesión según el modo (la selección se hace en el servidor):
// - diagnostico: el set gratuito de 15 preguntas, igual para todos.
// - dominio: preguntas del dominio pedido.
// - repaso: las que el alumno respondió mal la última vez.
// - practica / examen: todo lo que su plan permite, con cuotas por dominio según el examen real.
// En todos los casos se priorizan las preguntas que el alumno nunca ha visto.
export async function GET(req: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "Inicia sesión para usar el simulador." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const modo = esModo(params.get("modo")) ? (params.get("modo") as RespuestaPreguntas["modo"]) : "practica";
  const dominioParam = params.get("dominio");
  const dominio = dominioParam && dominioParam in DOMINIOS ? (dominioParam as Dominio) : undefined;
  if (modo === "dominio" && !dominio) return NextResponse.json({ error: "dominio inválido" }, { status: 400 });

  const [accesibles, resumen] = await Promise.all([preguntasAccesibles(sesion), obtenerResumen()]);
  const historial = new Map<string, Historial>(resumen.ultimas.map((r) => [r.pregunta_id, { correcta: r.correcta, veces: r.veces }]));

  let banco = accesibles;
  if (modo === "diagnostico") banco = await preguntasGratis();
  else if (modo === "dominio") banco = accesibles.filter((p) => p.dominio === dominio);
  else if (modo === "repaso") banco = accesibles.filter((p) => historial.get(p.id)?.correcta === false);

  const { preguntas, nuevas } = seleccionarPreguntas(banco, historial, modo);
  const cuerpo: RespuestaPreguntas = { premium: sesion.premium, preguntas, modo, dominio, nuevas, accesibles: accesibles.length };
  return NextResponse.json(cuerpo, { headers: { "Cache-Control": "private, no-store" } });
}
