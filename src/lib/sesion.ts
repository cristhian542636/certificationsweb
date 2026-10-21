import "server-only";
import { cache } from "react";
import { CERT_ACTUAL } from "@/config/certificaciones";
import { supabaseConfigurado } from "@/lib/entorno";
import { clienteServidor } from "@/lib/supabase/servidor";

export interface Perfil {
  id: string;
  email: string;
  nombre: string | null;
  premium_hasta: string | null;
  creado_en: string;
  nivel: string | null;
  fecha_examen: string | null;
  resultado_examen: "aprobado" | "no_aprobado" | null;
}

export interface Sesion {
  usuario: { id: string; email: string };
  perfil: Perfil | null;
  /** Vencimiento del acceso a la certificación actual (o a todas), aunque ya haya vencido. */
  accesoHasta: string | null;
  premium: boolean;
}

export function vigente(fecha: string | null | undefined) {
  return Boolean(fecha && new Date(fecha).getTime() > Date.now());
}

/** Usuario actual con su perfil, o null si no inició sesión. Se cachea por request. */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  if (!supabaseConfigurado()) return null;
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: perfil, error } = await supabase
    .from("perfiles")
    .select("id, email, nombre, premium_hasta, creado_en, nivel, fecha_examen, resultado_examen")
    .eq("id", user.id)
    .maybeSingle<Perfil>();

  // Si la migración 0003 aún no se ejecutó, esas columnas no existen: lee lo básico para no perder el premium.
  if (error) {
    ({ data: perfil } = await supabase
      .from("perfiles")
      .select("id, email, nombre, premium_hasta, creado_en")
      .eq("id", user.id)
      .maybeSingle<Perfil>());
    if (perfil) perfil = { ...perfil, nivel: null, fecha_examen: null, resultado_examen: null };
  }

  // Acceso a la certificación actual: el pase de esa certificación o uno que cubra todas ("*").
  const { data: accesos, error: errorAccesos } = await supabase
    .from("accesos")
    .select("vence_en")
    .eq("usuario_id", user.id)
    .in("certificacion", [CERT_ACTUAL.id, "*"]);
  // Sin la migración 0004 todavía, se usa el campo anterior.
  const fechas = errorAccesos ? [perfil?.premium_hasta] : (accesos ?? []).map((a) => a.vence_en as string);
  const accesoHasta = fechas.filter(Boolean).sort().at(-1) ?? null;

  return { usuario: { id: user.id, email: user.email ?? "" }, perfil, accesoHasta, premium: vigente(accesoHasta) };
});
