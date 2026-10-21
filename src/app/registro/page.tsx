import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import MarcoAuth from "@/components/MarcoAuth";
import FormularioRegistro from "./FormularioRegistro";
import { obtenerSesion } from "@/lib/sesion";
import { CERT_ACTUAL, obtenerCertificacion } from "@/config/certificaciones";

export const metadata: Metadata = { title: "Crear cuenta" };
export const dynamic = "force-dynamic";

export default async function Registro({ searchParams }: { searchParams: Promise<{ next?: string; cert?: string }> }) {
  const { next, cert: certId } = await searchParams;
  const cert = obtenerCertificacion(certId);
  const destino = next?.startsWith("/") && !next.startsWith("//") ? next : null;
  if (await obtenerSesion()) redirect(destino ?? "/panel");
  return (
    <MarcoAuth
      titulo="Crea tu cuenta gratis"
      subtitulo={
        <>
          <span className="mb-3 block rounded-lg border border-acento/40 bg-acento/10 px-3 py-2 text-texto">
            Diagnóstico gratis de <strong>{(cert ?? CERT_ACTUAL).nombreOficial}</strong>: 15 preguntas, unos 20 minutos.
          </span>
          ¿Ya tienes cuenta?{" "}
          <Link
            href={destino ? `/ingresar?next=${encodeURIComponent(destino)}` : "/ingresar"}
            className="text-acento hover:underline"
          >
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
