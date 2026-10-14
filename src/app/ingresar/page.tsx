import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import MarcoAuth from "@/components/MarcoAuth";
import FormularioIngreso from "./FormularioIngreso";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ingresar" };
export const dynamic = "force-dynamic";

export default async function Ingresar({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await obtenerSesion()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/simulador");
  return (
    <MarcoAuth
      titulo="Bienvenido de vuelta"
      subtitulo={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-acento hover:underline">
            Créala gratis
          </Link>
        </>
      }
    >
      <Suspense>
        <FormularioIngreso />
      </Suspense>
    </MarcoAuth>
  );
}
