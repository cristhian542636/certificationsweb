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
  /** Hora de inicio del examen (HH:MM, Lima). */
  hora_examen: string | null;
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

  // "*": las columnas de migraciones aún no ejecutadas simplemente no vienen (y quedan en null).
  const { data } = await supabase.from("perfiles").select("*").eq("id", user.id).maybeSingle<Partial<Perfil>>();
  const perfil: Perfil | null = data
    ? {
        id: user.id,
        email: data.email ?? user.email ?? "",
        nombre: data.nombre ?? null,
        premium_hasta: data.premium_hasta ?? null,
        creado_en: data.creado_en ?? "",
        nivel: data.nivel ?? null,
        fecha_examen: data.fecha_examen ?? null,
        resultado_examen: data.resultado_examen ?? null,
        hora_examen: data.hora_examen ? data.hora_examen.slice(0, 5) : null,
      }
    : null;

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
