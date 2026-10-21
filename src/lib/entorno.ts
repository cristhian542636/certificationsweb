// Lectura centralizada de variables de entorno.

// Acepta también la "RESTful endpoint" que muestra Supabase (…/rest/v1/) y la normaliza a la Project URL.
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/, "");
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
// Ambientes: main → producción, qa → QA, dev → desarrollo (los dos últimos son "Preview" en Vercel).
// Vercel expone estas variables de sistema con prefijo NEXT_PUBLIC_ en el build de Next.js.
export type Ambiente = "produccion" | "qa" | "dev" | "preview" | "local";

export function detectarAmbiente(vercelEnv?: string, rama?: string): Ambiente {
  if (vercelEnv === "production") return "produccion";
  if (vercelEnv === "preview") return rama === "qa" ? "qa" : rama === "dev" ? "dev" : "preview";
  return "local";
}

/** En dev/qa usa la URL de la rama (así no hay que configurarla); en producción, NEXT_PUBLIC_SITE_URL. */
export function urlDelSitio(opciones: { explicita?: string; vercelEnv?: string; urlRama?: string; urlProduccion?: string }) {
  const { explicita, vercelEnv, urlRama, urlProduccion } = opciones;
  const url =
    vercelEnv === "preview" && urlRama
      ? `https://${urlRama}`
      : explicita || (vercelEnv === "production" && urlProduccion ? `https://${urlProduccion}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

export const RAMA = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ?? "";
export const AMBIENTE = detectarAmbiente(process.env.NEXT_PUBLIC_VERCEL_ENV, RAMA);
export const SITE_URL = urlDelSitio({
  explicita: process.env.NEXT_PUBLIC_SITE_URL,
  vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
  urlRama: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
  urlProduccion: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
});
export const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

export function supabaseConfigurado() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export function esAdmin(email: string | undefined | null) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
