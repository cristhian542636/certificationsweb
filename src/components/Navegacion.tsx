import Link from "next/link";
import Logo from "./Logo";
import MenuUsuario from "./MenuUsuario";
import { esAdmin } from "@/lib/entorno";
import { obtenerSesion } from "@/lib/sesion";

export default async function Navegacion() {
  const sesion = await obtenerSesion();

  return (
    <header className="sticky top-0 z-40 border-b border-borde/70 bg-fondo/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <div className="hidden items-center gap-7 text-sm text-tenue md:flex">
          <Link href="/#certificaciones" className="hover:text-texto">Certificaciones</Link>
          <Link href="/#como-funciona" className="hover:text-texto">Cómo funciona</Link>
          <Link href="/#precio" className="hover:text-texto">Precio</Link>
          <Link href="/#faq" className="hover:text-texto">FAQ</Link>
        </div>
        <div className="flex items-center gap-2">
          {sesion ? (
            <>
              <Link href="/panel" className="btn-primario whitespace-nowrap">
                Mi panel
                {sesion.premium && <span className="rounded bg-fondo/20 px-1.5 font-mono text-[10px]">PRO</span>}
              </Link>
              <MenuUsuario
                usuario={{
                  nombre: sesion.perfil?.nombre || sesion.usuario.email.split("@")[0],
                  email: sesion.usuario.email,
                  premium: sesion.premium,
                  accesoHasta: sesion.accesoHasta,
                  admin: esAdmin(sesion.usuario.email),
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
