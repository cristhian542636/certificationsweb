import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { certificacionPorSlug, CERT_ACTUAL, enlaceDiagnostico, NIVELES_CERTIFICACION, PUBLICADAS } from "@/config/certificaciones";
import { obtenerSesion } from "@/lib/sesion";
import { sitio } from "@/config/sitio";
import { estadisticasBanco } from "@/lib/preguntas";
import { DOMINIOS } from "@/lib/tipos";
import Precios from "@/components/Precios";
import Temario from "@/components/Temario";

export function generateStaticParams() {
  return PUBLICADAS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const cert = certificacionPorSlug((await params).slug);
  if (!cert) return {};
  return {
    title: `${cert.nombreOficial} en español`,
    description: `Prepárate para ${cert.nombreOficial} con preguntas originales en español, simulacros de ${cert.examen.preguntas} preguntas y un plan guiado. ${cert.descripcion}`,
  };
}

export default async function PaginaCertificacion({ params }: { params: Promise<{ slug: string }> }) {
  const cert = certificacionPorSlug((await params).slug);
  if (!cert) notFound();
  const [stats, sesion] = await Promise.all([estadisticasBanco(), obtenerSesion()]);
  // Si ya tiene acceso a esta certificación, la página lo lleva a practicar en lugar de venderle.
  const conAcceso = Boolean(sesion?.premium && cert.id === CERT_ACTUAL.id);

  return (
    <div className="overflow-x-hidden">
      <section className="relative">
        <div className="reticula pointer-events-none absolute inset-0" />
        <div className="resplandor pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 md:pt-20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-borde bg-fondo px-2 py-0.5 font-mono text-xs text-tenue">{cert.proveedor}</span>
            <span className="rounded-md bg-acento/15 px-2 py-0.5 font-mono text-xs text-acento">{NIVELES_CERTIFICACION[cert.nivel]}</span>
          </div>
          <h1 className="mt-5 max-w-3xl text-[32px] font-semibold leading-[1.1] tracking-tight md:text-5xl">
            {cert.nombreOficial}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-tenue">{cert.descripcion}</p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              [`${cert.examen.preguntas}`, "preguntas en el examen"],
              [`${cert.examen.minutos} min`, "de duración"],
              [`${cert.examen.correctasAprobacion}/${cert.examen.preguntas}`, "para aprobar"],
              [`USD ${cert.examen.costoUsd}`, "por intento"],
            ].map(([valor, texto]) => (
              <div key={texto} className="tarjeta p-4">
                <dt className="font-mono text-xl font-semibold">{valor}</dt>
                <dd className="mt-1 text-xs text-tenue">{texto}</dd>
              </div>
            ))}
          </dl>
          {conAcceso ? (
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/panel" className="btn-primario px-5 py-3 text-[15px]">
                Ir a mi práctica →
              </Link>
              <span className="rounded-md bg-acento/15 px-2 py-1 font-mono text-xs text-acento">Tienes acceso Premium</span>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={enlaceDiagnostico(cert)} className="btn-primario px-5 py-3 text-[15px]">
                Haz tu diagnóstico gratis →
              </Link>
              <Link href="#precio" className="btn-secundario px-5 py-3 text-[15px]">
                Ver pases
              </Link>
            </div>
          )}
        </div>
      </section>

      <section id="temario" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <p className="etiqueta">Temario</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          Las {Object.keys(DOMINIOS).length} secciones del examen vigente.
        </h2>
        <p className="mt-4 max-w-2xl text-tenue">
          Basado en la guía oficial del examen ({cert.guia}). Practicas cada sección en la misma proporción en que aparece
          en el examen real, con {stats.total} preguntas originales explicadas en español.
        </p>
        <Temario porDominio={stats.porDominio} />
      </section>

      {!conAcceso && (
        <section id="precio" className="scroll-mt-20 border-t border-borde bg-panel/30">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="text-center">
              <p className="etiqueta">Pases</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Pagas una vez, sin renovaciones.</h2>
              <p className="mx-auto mt-4 max-w-xl text-tenue">
                Empieza gratis con el diagnóstico. Si no apruebas, te extendemos el acceso {sitio.garantia.dias} días sin
                costo.
              </p>
            </div>
            <Precios cert={cert} totalPreguntas={stats.total} gratis={stats.gratis} />
          </div>
        </section>
      )}
    </div>
  );
}
