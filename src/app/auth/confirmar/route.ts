import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { clienteServidor } from "@/lib/supabase/servidor";

// Destino de los enlaces que envía Supabase por correo (confirmar cuenta, recuperar contraseña).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const siguiente = searchParams.get("next") ?? "/cuenta";
  const destino = siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/cuenta";

  const supabase = await clienteServidor();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && tipo
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      : { error: new Error("enlace incompleto") };

  if (error) return NextResponse.redirect(`${origin}/ingresar?error=enlace`);
  return NextResponse.redirect(`${origin}${destino}`);
}
