import { NextResponse } from "next/server";
import { COOKIE_ACCESO, verificarCodigo } from "@/lib/acceso";
import { sitio } from "@/config/sitio";

export async function POST(req: Request) {
  const { codigo } = (await req.json().catch(() => ({}))) as { codigo?: string };
  if (!codigo || typeof codigo !== "string") {
    return NextResponse.json({ ok: false, error: "Ingresa tu código de acceso." }, { status: 400 });
  }

  let datos;
  try {
    datos = verificarCodigo(codigo, sitio.producto.id);
  } catch {
    return NextResponse.json(
      { ok: false, error: "El sitio aún no está configurado para activar códigos." },
      { status: 500 },
    );
  }
  if (!datos) {
    return NextResponse.json(
      { ok: false, error: "Código inválido o vencido. Revisa que lo copiaste completo." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true, email: datos.e });
  res.cookies.set(COOKIE_ACCESO, codigo.trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(datos.x * 1000),
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_ACCESO);
  return res;
}
