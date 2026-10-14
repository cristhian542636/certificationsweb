import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { clienteAdmin, clienteServidor } from "@/lib/supabase/servidor";

// Destino de los enlaces de Supabase: confirmar cuenta, recuperar contraseña y retorno del login con Google.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const siguiente = searchParams.get("next") ?? "/panel";
  const destino = siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/panel";

  const supabase = await clienteServidor();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && tipo
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      : { data: null, error: new Error("enlace incompleto") };

  if (error) return NextResponse.redirect(`${origin}/ingresar?error=enlace`);

  const respuesta = NextResponse.redirect(`${origin}${destino}`);

  // Registro con Google: guarda el canal de captación (utm_source) si el perfil aún no tiene uno.
  const origenCookie = request.cookies.get("origen")?.value;
  const usuarioId = data?.user?.id;
  if (origenCookie && usuarioId) {
    respuesta.cookies.delete("origen");
    try {
      await clienteAdmin()
        .from("perfiles")
        .update({ origen: decodeURIComponent(origenCookie).slice(0, 100) })
        .eq("id", usuarioId)
        .is("origen", null);
    } catch (e) {
      console.error("No se pudo guardar el origen:", e);
    }
  }

  return respuesta;
}
