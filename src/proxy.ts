import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sitio } from "@/config/sitio";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/entorno";

const RUTAS_PRIVADAS = ["/panel", "/bienvenida", "/simulador", "/cuenta", "/comprar", "/admin"];

// Cookies propias: identificador del navegador, última verificación del dispositivo y código de invitación.
const COOKIE_DISPOSITIVO = "dc_disp";
const COOKIE_VERIFICADO = "dc_ok";
const COOKIE_REFERIDO = "ref";
const VERIFICAR_CADA_SEGUNDOS = 600;
const CODIGO_REFERIDO = /^[a-z0-9]{6,12}$/;

const UN_ANIO = 60 * 60 * 24 * 365;
const opcionesCookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

// Refresca la sesión de Supabase en cada request, protege las rutas privadas, aplica el código de invitación
// y limita la cantidad de dispositivos activos por cuenta.
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  if (!supabaseConfigurado()) return respuesta;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (porGuardar, cabeceras) => {
        porGuardar.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        porGuardar.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        Object.entries(cabeceras ?? {}).forEach(([k, v]) => respuesta.headers.set(k, v));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  if (!user && RUTAS_PRIVADAS.some((r) => ruta === r || ruta.startsWith(`${r}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = ruta.startsWith("/comprar") ? "/registro" : "/ingresar";
    url.search = `?next=${encodeURIComponent(ruta + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // Cada navegador recibe un identificador estable (no contiene datos personales).
  let dispositivo = request.cookies.get(COOKIE_DISPOSITIVO)?.value;
  if (!dispositivo) {
    dispositivo = crypto.randomUUID();
    respuesta.cookies.set(COOKIE_DISPOSITIVO, dispositivo, { ...opcionesCookie, maxAge: 2 * UN_ANIO });
  }

  // Código de invitación: se guarda al llegar con ?ref= y se aplica cuando la persona ya tiene cuenta.
  const refUrl = request.nextUrl.searchParams.get("ref")?.toLowerCase();
  const codigo = refUrl && CODIGO_REFERIDO.test(refUrl) ? refUrl : request.cookies.get(COOKIE_REFERIDO)?.value;
  if (codigo && user) {
    const { error } = await supabase.rpc("aplicar_referido", { p_codigo: codigo });
    if (error) console.error("aplicar_referido:", error.message);
    respuesta.cookies.delete(COOKIE_REFERIDO);
  } else if (refUrl && codigo === refUrl) {
    respuesta.cookies.set(COOKIE_REFERIDO, refUrl, { ...opcionesCookie, maxAge: 60 * 60 * 24 * 30 });
  }

  // Dispositivos activos: se verifica cada pocos minutos por usuario.
  if (user && request.cookies.get(COOKIE_VERIFICADO)?.value !== user.id) {
    const ciudad = request.headers.get("x-vercel-ip-city");
    const { data: estado, error } = await supabase.rpc("registrar_dispositivo", {
      p_dispositivo: dispositivo,
      p_agente: request.headers.get("user-agent") ?? "",
      p_ciudad: ciudad ? decodeURIComponent(ciudad) : null,
      p_pais: request.headers.get("x-vercel-ip-country"),
      p_maximo: sitio.seguridad.maxDispositivos,
    });

    if (!error && estado === "revocado") {
      // Esta cuenta se abrió en otros dispositivos más recientes: se cierra la sesión solo aquí.
      await supabase.auth.signOut({ scope: "local" });
      const salida = ruta.startsWith("/api/")
        ? NextResponse.json({ error: "Tu sesión se cerró porque tu cuenta se abrió en otro dispositivo." }, { status: 401 })
        : NextResponse.redirect(new URL("/ingresar?motivo=dispositivo", request.url));
      respuesta.cookies.getAll().forEach((c) => salida.cookies.set(c));
      salida.cookies.delete(COOKIE_VERIFICADO);
      return salida;
    }
    if (error) console.error("registrar_dispositivo:", error.message);
    respuesta.cookies.set(COOKIE_VERIFICADO, user.id, { ...opcionesCookie, maxAge: VERIFICAR_CADA_SEGUNDOS });
  }

  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
