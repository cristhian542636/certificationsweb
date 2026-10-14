import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerProgreso } from "@/lib/progreso-servidor";

export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  const p = await obtenerProgreso(sesion);
  return NextResponse.json(
    {
      indice: p.indice,
      etiqueta: p.etiqueta,
      racha: p.racha,
      respondidas: p.respondidas,
      errores: p.errores.length,
      nuevas: p.nuevas,
      totalBanco: p.dominios.reduce((s, d) => s + d.totalBanco, 0),
      premium: sesion.premium,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
