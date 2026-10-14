import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await obtenerSesion();
  return NextResponse.json(
    { autenticado: Boolean(sesion), premium: sesion?.premium ?? false, premiumHasta: sesion?.perfil?.premium_hasta ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
