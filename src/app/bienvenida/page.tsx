import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/sesion";
import Bienvenida from "./Bienvenida";

export const metadata: Metadata = { title: "Tu plan" };
export const dynamic = "force-dynamic";

export default async function PaginaBienvenida({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?next=/bienvenida");
  const { editar } = await searchParams;
  if (sesion.perfil?.nivel && editar === undefined) redirect("/panel");

  const nombre = (sesion.perfil?.nombre || sesion.usuario.email.split("@")[0]).split(" ")[0];
  return (
    <div className="relative">
      <div className="reticula pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-2xl px-4 py-14 md:py-20">
        <Bienvenida
          nombre={nombre}
          nivelInicial={sesion.perfil?.nivel ?? null}
          fechaInicial={sesion.perfil?.fecha_examen ?? null}
        />
      </div>
    </div>
  );
}
