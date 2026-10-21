import { NextResponse } from "next/server";
import { CERT_ACTUAL } from "@/config/certificaciones";
import { sitio } from "@/config/sitio";
import { obtenerSesion } from "@/lib/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";

const { dias, minimoSimulacros, plazoDias } = sitio.garantia;

const MENSAJES: Record<string, string> = {
  ok: `¡Listo! Recibimos tu solicitud. Envíanos por WhatsApp el reporte de tu resultado y activamos tus ${dias} días.`,
  sin_resultado: "Primero cuéntanos el resultado de tu examen en tu panel.",
  fuera_de_plazo: `La garantía se solicita dentro de los ${plazoDias} días posteriores a la fecha de tu examen.`,
  ya_solicitada: "Ya solicitaste la garantía para esta certificación.",
  sin_pase: "La garantía aplica a quienes tenían un pase pagado de esta certificación.",
  pocos_simulacros: `La garantía requiere al menos ${minimoSimulacros} simulacros completos antes de tu examen.`,
};

export async function POST() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, mensaje: "Inicia sesión." }, { status: 401 });

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("solicitar_garantia", {
    p_certificacion: CERT_ACTUAL.id,
    p_minimo_simulacros: minimoSimulacros,
    p_plazo_dias: plazoDias,
  });
  if (error) {
    console.error("solicitar_garantia:", error.message);
    return NextResponse.json({ ok: false, mensaje: "No pudimos registrar tu solicitud. Inténtalo otra vez." }, { status: 500 });
  }
  const codigo = String(data);
  return NextResponse.json({ ok: codigo === "ok", codigo, mensaje: MENSAJES[codigo] ?? MENSAJES.sin_resultado });
}
