import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";
import { DOMINIOS } from "@/lib/tipos";

interface Cuerpo {
  modo?: string;
  total?: number;
  correctas?: number;
  segundos?: number;
  porDominio?: Record<string, { total: number; ok: number }>;
}

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const c = (await req.json().catch(() => ({}))) as Cuerpo;
  const total = Number(c.total);
  const correctas = Number(c.correctas);
  if (
    (c.modo !== "practica" && c.modo !== "examen") ||
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

  const supabase = await clienteServidor();
  const { error } = await supabase.from("intentos").insert({
    usuario_id: sesion.usuario.id,
    modo: c.modo,
    total,
    correctas,
    segundos: Number.isFinite(c.segundos) ? Math.round(Number(c.segundos)) : null,
    por_dominio: porDominio,
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
