import { NextResponse } from "next/server";
import { sitio } from "@/config/sitio";
import { esAdmin } from "@/lib/entorno";
import { obtenerSesion } from "@/lib/sesion";
import { clienteAdmin } from "@/lib/supabase/servidor";

// El administrador aprueba (se extiende el acceso) o rechaza una solicitud de garantía.
export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.usuario.email)) return NextResponse.json({ ok: false }, { status: 404 });

  const { id, aprobar } = (await req.json().catch(() => ({}))) as { id?: number; aprobar?: boolean };
  if (!Number.isInteger(id) || typeof aprobar !== "boolean") return NextResponse.json({ ok: false }, { status: 400 });

  const { data, error } = await clienteAdmin().rpc("resolver_garantia", {
    p_id: id,
    p_aprobar: aprobar,
    p_dias: sitio.garantia.dias,
    p_nota: `resuelta por ${sesion.usuario.email}`,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: data !== "no_pendiente", estado: data });
}
