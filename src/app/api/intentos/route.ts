import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";
import { todasLasPreguntas } from "@/lib/preguntas";
import { DOMINIOS, esModo } from "@/lib/tipos";

interface Cuerpo {
  modo?: string;
  total?: number;
  correctas?: number;
  segundos?: number;
  porDominio?: Record<string, { total: number; ok: number }>;
  respuestas?: { pregunta_id?: string; correcta?: boolean }[];
}

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const c = (await req.json().catch(() => ({}))) as Cuerpo;
  const total = Number(c.total);
  const correctas = Number(c.correctas);
  if (
    !esModo(c.modo) ||
    !Number.isInteger(total) ||
    !Number.isInteger(correctas) ||
    total <= 0 ||
    total > 200 ||
    correctas < 0 ||
    correctas > total
  ) {
    return NextResponse.json({ ok: false, error: "datos inválidos" }, { status: 400 });
  }

  const porDominio = Object.fromEntries(
    Object.entries(c.porDominio ?? {})
      .filter(([d]) => d in DOMINIOS)
      .map(([d, v]) => [d, { total: Number(v.total) || 0, ok: Number(v.ok) || 0 }]),
  );

  // Solo se guardan respuestas de preguntas que existen; el dominio lo define el banco, no el cliente.
  const banco = new Map((await todasLasPreguntas()).map((p) => [p.id, p.dominio]));
  const vistas = new Set<string>();
  const respuestas = (Array.isArray(c.respuestas) ? c.respuestas : [])
    .filter((r) => typeof r?.pregunta_id === "string" && banco.has(r.pregunta_id) && typeof r.correcta === "boolean")
    .filter((r) => !vistas.has(r.pregunta_id!) && vistas.add(r.pregunta_id!))
    .slice(0, 200)
    .map((r) => ({ pregunta_id: r.pregunta_id!, dominio: banco.get(r.pregunta_id!)!, correcta: r.correcta! }));

  const segundos = Number.isFinite(c.segundos) ? Math.round(Number(c.segundos)) : null;
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("registrar_intento", {
    p_modo: c.modo,
    p_total: total,
    p_correctas: correctas,
    p_segundos: segundos,
    p_por_dominio: porDominio,
    p_respuestas: respuestas,
  });

  if (error) {
    // Respaldo si la migración 0003 aún no se aplicó: guarda solo el resumen del intento.
    const { error: e2 } = await supabase.from("intentos").insert({
      usuario_id: sesion.usuario.id,
      modo: c.modo === "examen" ? "examen" : "practica",
      total,
      correctas,
      segundos,
      por_dominio: porDominio,
    });
    if (e2) return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
