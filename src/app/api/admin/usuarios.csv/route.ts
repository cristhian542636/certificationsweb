import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/entorno";
import { obtenerSesion } from "@/lib/sesion";
import { clienteAdmin } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

const celda = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Evita inyección de fórmulas al abrir el CSV en Excel.
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.usuario.email)) return new NextResponse("No encontrado", { status: 404 });

  const db = clienteAdmin();
  const [{ data, error }, { data: accesos }] = await Promise.all([
    db.from("perfiles").select("id, email, nombre, origen, nivel, fecha_examen, resultado_examen, creado_en").order("creado_en", { ascending: true }),
    db.from("accesos").select("usuario_id, certificacion, vence_en"),
  ]);
  if (error) return new NextResponse("Error", { status: 500 });

  const accesoDe = new Map<string, string>();
  for (const a of accesos ?? []) {
    const previo = accesoDe.get(a.usuario_id);
    if (!previo || a.vence_en > previo) accesoDe.set(a.usuario_id, a.vence_en);
  }

  const filas = [["email", "nombre", "acceso_hasta", "origen", "nivel", "fecha_examen", "resultado_examen", "creado_en"]];
  for (const u of data ?? []) {
    filas.push([u.email, u.nombre, accesoDe.get(u.id) ?? "", u.origen, u.nivel, u.fecha_examen, u.resultado_examen, u.creado_en]);
  }
  const csv = filas.map((f) => f.map(celda).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="usuarios-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
