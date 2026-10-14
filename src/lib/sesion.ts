import "server-only";
import { cache } from "react";
import { supabaseConfigurado } from "@/lib/entorno";
import { clienteServidor } from "@/lib/supabase/servidor";

export interface Perfil {
  id: string;
  email: string;
  nombre: string | null;
  premium_hasta: string | null;
  creado_en: string;
}

export interface Sesion {
  usuario: { id: string; email: string };
  perfil: Perfil | null;
  premium: boolean;
}

export function esPremium(perfil: Pick<Perfil, "premium_hasta"> | null) {
  return Boolean(perfil?.premium_hasta && new Date(perfil.premium_hasta).getTime() > Date.now());
}

/** Usuario actual con su perfil, o null si no inició sesión. Se cachea por request. */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  if (!supabaseConfigurado()) return null;
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, email, nombre, premium_hasta, creado_en")
    .eq("id", user.id)
    .maybeSingle<Perfil>();

  return { usuario: { id: user.id, email: user.email ?? "" }, perfil, premium: esPremium(perfil) };
});
