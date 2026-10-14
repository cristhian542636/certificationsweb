import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import MarcoAuth from "@/components/MarcoAuth";
import FormularioRegistro from "./FormularioRegistro";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Crear cuenta" };
export const dynamic = "force-dynamic";

export default async function Registro() {
  if (await obtenerSesion()) redirect("/simulador");
  return (
    <MarcoAuth
      titulo="Crea tu cuenta gratis"
      subtitulo={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/ingresar" className="text-acento hover:underline">
            Ingresa aquí
          </Link>
        </>
      }
    >
      <Suspense>
        <FormularioRegistro />
      </Suspense>
    </MarcoAuth>
  );
}
