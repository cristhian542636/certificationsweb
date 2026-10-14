import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import MarcoAuth from "@/components/MarcoAuth";
import FormularioIngreso from "./FormularioIngreso";

export const metadata: Metadata = { title: "Ingresar" };

export default function Ingresar() {
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
