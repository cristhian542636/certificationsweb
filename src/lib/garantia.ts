import "server-only";
import { cache } from "react";
import { CERT_ACTUAL } from "@/config/certificaciones";
import { sitio } from "@/config/sitio";
import { diasEntre, hoyLima, inicioExamen } from "@/lib/progreso";
import type { Sesion } from "@/lib/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoGarantia } from "@/components/progreso/Garantia";

export interface GarantiaAlumno {
  estado: EstadoGarantia;
  /** Puede solicitarla ahora (cumple plazo y simulacros) o ya la pidió y está pendiente: no se le ofrece renovar. */
  abierta: boolean;
}

/** Garantía de quien no aprobó y tuvo un pase (aunque ya haya vencido); null si no aplica. */
export const garantiaDelAlumno = cache(async (sesion: Sesion): Promise<GarantiaAlumno | null> => {
  const perfil = sesion.perfil;
  if (perfil?.resultado_examen !== "no_aprobado" || !sesion.accesoHasta) return null;

  const supabase = await clienteServidor();
  const fecha = perfil.fecha_examen;
  const [{ data }, { count }] = await Promise.all([
    supabase.from("garantias").select("estado").eq("usuario_id", sesion.usuario.id).eq("certificacion", CERT_ACTUAL.id).maybeSingle(),
    fecha
      ? supabase
          .from("intentos")
          .select("id", { count: "exact", head: true })
          .eq("usuario_id", sesion.usuario.id)
          .eq("certificacion", CERT_ACTUAL.id)
          .eq("modo", "examen")
          .gte("total", CERT_ACTUAL.examen.preguntas)
          .lt("creado_en", new Date(inicioExamen(fecha, perfil.hora_examen)).toISOString())
      : Promise.resolve({ count: 0 }),
  ]);
  const estado = ((data?.estado as EstadoGarantia) ?? null) as EstadoGarantia;
  const dias = fecha ? diasEntre(fecha, hoyLima()) : Infinity;
  const puedeSolicitar =
    estado === null && dias >= 0 && dias <= sitio.garantia.plazoDias && (count ?? 0) >= sitio.garantia.minimoSimulacros;
  return { estado, abierta: estado === "pendiente" || puedeSolicitar };
});
