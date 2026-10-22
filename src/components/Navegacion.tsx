import Link from "next/link";
import Logo from "./Logo";
import MenuUsuario from "./MenuUsuario";
import { esAdmin } from "@/lib/entorno";
import { obtenerSesion } from "@/lib/sesion";
import { garantiaDelAlumno } from "@/lib/garantia";
import { clienteServidor } from "@/lib/supabase/servidor";

export default async function Navegacion() {
  const sesion = await obtenerSesion();
  // Alumno gratis que ya practicó: su único siguiente paso es Premium, así que ese es el botón principal.
  // Mientras pueda solicitar su garantía (o la tenga pendiente) no se le vende: le corresponden días gratis.
  let mostrarPremium = false;
  let venta = !sesion?.premium;
  if (sesion && !sesion.premium) {
    const supabase = await clienteServidor();
    const [{ count }, garantia] = await Promise.all([
      supabase.from("respuestas").select("id", { count: "exact", head: true }).eq("usuario_id", sesion.usuario.id),
      garantiaDelAlumno(sesion),
    ]);
    venta = !garantia?.abierta;
    mostrarPremium = venta && (count ?? 0) > 0;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-borde/70 bg-fondo/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <div className="hidden items-center gap-7 text-sm text-tenue md:flex">
          <Link href="/#certificaciones" className="hover:text-texto">
            {sesion?.premium ? "Mis certificaciones" : "Certificaciones"}
          </Link>
          {!sesion?.premium && <Link href="/#precio" className="hover:text-texto">Precio</Link>}
          <Link href="/#faq" className="hover:text-texto">FAQ</Link>
        </div>
        <div className="flex items-center gap-2">
          {sesion ? (
            <>
              {mostrarPremium ? (
                <Link href="/comprar" className="btn whitespace-nowrap bg-oro font-semibold text-fondo hover:bg-oro/90">
                  Pasar a Premium
                </Link>
              ) : (
                <Link href="/panel" className="btn-primario whitespace-nowrap">
                  Mi panel
                  {sesion.premium && <span className="rounded bg-fondo/20 px-1.5 font-mono text-[10px]">PRO</span>}
                </Link>
              )}
              <MenuUsuario
                usuario={{
                  nombre: sesion.perfil?.nombre || sesion.usuario.email.split("@")[0],
                  email: sesion.usuario.email,
                  premium: sesion.premium,
                  accesoHasta: sesion.accesoHasta,
                  admin: esAdmin(sesion.usuario.email),
                  venta,
                }}
              />
            </>
          ) : (
            <>
              <Link href="/ingresar" className="btn whitespace-nowrap px-2 text-tenue hover:text-texto sm:px-4">Ingresar</Link>
              <Link href="/registro" className="btn-primario whitespace-nowrap">
                <span>
                  Crear cuenta<span className="hidden sm:inline"> gratis</span>
                </span>
              </Link>
              <MenuUsuario usuario={null} />
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
