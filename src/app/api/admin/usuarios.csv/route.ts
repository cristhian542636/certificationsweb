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

  const { data, error } = await clienteAdmin()
    .from("perfiles")
    .select("email, nombre, premium_hasta, origen, creado_en")
    .order("creado_en", { ascending: true });
  if (error) return new NextResponse("Error", { status: 500 });

  const filas = [["email", "nombre", "premium_hasta", "origen", "creado_en"]];
  for (const u of data ?? []) filas.push([u.email, u.nombre, u.premium_hasta, u.origen, u.creado_en]);
  const csv = filas.map((f) => f.map(celda).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="usuarios-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
