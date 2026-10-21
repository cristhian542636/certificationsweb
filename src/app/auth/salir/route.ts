import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function POST(request: NextRequest) {
  const supabase = await clienteServidor();
  // Solo en este dispositivo: las demás sesiones de la cuenta siguen abiertas.
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
