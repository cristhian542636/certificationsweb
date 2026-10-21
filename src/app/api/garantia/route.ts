import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { CERT_ACTUAL } from "@/config/certificaciones";
import { sitio } from "@/config/sitio";
import { obtenerSesion } from "@/lib/sesion";
import { clienteAdmin, clienteServidor } from "@/lib/supabase/servidor";

const { dias, minimoSimulacros, plazoDias } = sitio.garantia;
// Vercel acepta hasta 4.5 MB por solicitud: 4 MB deja margen para el resto del formulario.
const MAXIMO_BYTES = 4 * 1024 * 1024;

const MENSAJES: Record<string, string> = {
  ok: `¡Listo! Recibimos tu solicitud y tu reporte. Lo revisamos ${sitio.acompanamiento.tiempoRespuesta} y activamos tus ${dias} días.`,
  sin_resultado: "Primero cuéntanos el resultado de tu examen en tu panel.",
  fuera_de_plazo: `La garantía se solicita dentro de los ${plazoDias} días posteriores a la fecha de tu examen.`,
  ya_solicitada: "Ya solicitaste la garantía para esta certificación.",
  sin_pase: "La garantía aplica a quienes tenían un pase pagado de esta certificación.",
  pocos_simulacros: `La garantía requiere al menos ${minimoSimulacros} simulacros completos antes de tu examen.`,
};

/** Tipo real del archivo según sus primeros bytes (no se confía en el nombre ni en el tipo declarado). */
function tipoArchivo(b: Uint8Array): { tipo: string; extension: string } | null {
  const empieza = (...bytes: number[]) => bytes.every((x, i) => b[i] === x);
  if (empieza(0x25, 0x50, 0x44, 0x46)) return { tipo: "application/pdf", extension: "pdf" };
  if (empieza(0x89, 0x50, 0x4e, 0x47)) return { tipo: "image/png", extension: "png" };
  if (empieza(0xff, 0xd8, 0xff)) return { tipo: "image/jpeg", extension: "jpg" };
  if (empieza(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return { tipo: "image/webp", extension: "webp" };
  }
  return null;
}

// Solicitud de garantía con el reporte del examen adjunto (PDF o imagen). El archivo se guarda en un bucket privado.
export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, mensaje: "Inicia sesión." }, { status: 401 });

  const datos = await req.formData().catch(() => null);
  const archivo = datos?.get("reporte");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ ok: false, mensaje: "Adjunta el reporte de resultado de tu examen (PDF o imagen)." }, { status: 400 });
  }
  if (archivo.size > MAXIMO_BYTES) {
    return NextResponse.json({ ok: false, mensaje: "El archivo pesa más de 4 MB. Sube una captura o un PDF más liviano." }, { status: 400 });
  }
  const contenido = new Uint8Array(await archivo.arrayBuffer());
  const tipo = tipoArchivo(contenido);
  if (!tipo) return NextResponse.json({ ok: false, mensaje: "Sube un PDF o una imagen (PNG, JPG o WEBP)." }, { status: 400 });

  const ruta = `${sesion.usuario.id}/${randomUUID()}.${tipo.extension}`;
  const almacen = clienteAdmin().storage.from("reportes");
  const { error: errorSubida } = await almacen.upload(ruta, contenido, { contentType: tipo.tipo });
  if (errorSubida) {
    console.error("Subida de reporte:", errorSubida.message);
    return NextResponse.json({ ok: false, mensaje: "No pudimos subir tu archivo. Inténtalo otra vez." }, { status: 500 });
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("solicitar_garantia", {
    p_certificacion: CERT_ACTUAL.id,
    p_reporte: ruta,
    p_minimo_simulacros: minimoSimulacros,
    p_plazo_dias: plazoDias,
  });
  const codigo = error ? "error" : String(data);
  // Si la solicitud no procede, el archivo no se conserva.
  if (codigo !== "ok") await almacen.remove([ruta]);
  if (error) {
    console.error("solicitar_garantia:", error.message);
    return NextResponse.json({ ok: false, mensaje: "No pudimos registrar tu solicitud. Inténtalo otra vez." }, { status: 500 });
  }
  return NextResponse.json({ ok: codigo === "ok", codigo, mensaje: MENSAJES[codigo] ?? MENSAJES.sin_resultado });
}
