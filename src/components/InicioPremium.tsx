import Link from "next/link";
import { CERT_ACTUAL, NIVELES_CERTIFICACION, PUBLICADAS } from "@/config/certificaciones";
import { sitio, enlaceWhatsApp } from "@/config/sitio";
import { SITE_URL } from "@/lib/entorno";
import type { Sesion } from "@/lib/sesion";
import { obtenerProgreso } from "@/lib/progreso-servidor";
import { calcularRango, RANGOS } from "@/lib/progreso";
import { Insignia } from "./progreso/Insignia";
import { clienteServidor } from "@/lib/supabase/servidor";
import Invitar from "./Invitar";

// Portada para quien ya es Premium: no se le vende nada. Lo lleva a seguir practicando,
// le muestra lo que tiene disponible, lo invita a recomendar y responde dudas de uso.

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" });

const faqs = [
  {
    p: "¿Cómo hago un simulacro como el examen?",
    r: `En Simulador → Simulacro de examen: ${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos, repartidas según el peso de cada sección. Te damos primero las preguntas que aún no has visto y, cuando se acaban, las que fallaste.`,
  },
  {
    p: "¿Puedo practicar en inglés?",
    r: `Sí. El examen se rinde en ${sitio.examen.idioma}: en el simulador, el botón ES/EN cambia el enunciado y las opciones de cada pregunta. Te recomendamos hacer en ${sitio.examen.idioma} tus simulacros de las últimas semanas. Las explicaciones siguen en español.`,
  },
  {
    p: "¿Qué significan el índice y las medallas?",
    r: "El índice combina tu precisión y cuánto has practicado cada sección, con el mismo peso que tiene en el examen. Cada sección pasa de Bronce a Plata y a Oro; apunta a un índice de 85% y a Oro en todas antes de tu examen.",
  },
  {
    p: "¿Cómo consulto una duda?",
    r: `Desde cada pregunta del simulador (botón "Preguntarle al instructor") o por WhatsApp desde tu panel. Respondemos ${sitio.acompanamiento.tiempoRespuesta}.`,
  },
  {
    p: "¿Cuándo vence mi acceso?",
    r: "Lo ves en Mi cuenta. Si necesitas más tiempo antes de tu examen, puedes comprar otro pase y se suma al que tienes; te avisamos en el menú cuando falten pocos días.",
  },
  {
    p: "¿Y si no apruebo?",
    r: `Seguimos contigo: si hiciste al menos ${sitio.garantia.minimoSimulacros} simulacros completos antes de tu examen, registra tu resultado en tu panel dentro de los ${sitio.garantia.plazoDias} días siguientes y extendemos tu acceso ${sitio.garantia.dias} días sin costo.`,
  },
  {
    p: "¿En cuántos dispositivos puedo usar mi cuenta?",
    r: `En hasta ${sitio.seguridad.maxDispositivos} a la vez, por ejemplo tu laptop y tu celular. Si un colega quiere prepararse, comparte tu enlace de invitación: tiene descuento y tú ganas ${sitio.referidos.diasInvitador} días.`,
  },
  sitio.faqExamen[1],
];

export default async function InicioPremium({ sesion, totalPreguntas }: { sesion: Sesion; totalPreguntas: number }) {
  const supabase = await clienteServidor();
  const [{ data: codigo }, { data: invitados }, progreso] = await Promise.all([
    supabase.from("perfiles").select("codigo_referido").eq("id", sesion.usuario.id).maybeSingle(),
    supabase.from("referidos").select("recompensado_en").eq("invitador_id", sesion.usuario.id),
    obtenerProgreso(sesion),
  ]);
  const rango = calcularRango(progreso, { preguntas: sitio.examen.preguntasReales, correctasAprobacion: sitio.examen.correctasAprobacion });
  const faltan = rango.metas.filter((m) => !m.cumplida).length;
  const nombre = (sesion.perfil?.nombre || sesion.usuario.email.split("@")[0]).split(" ")[0];
  // Hoy el acceso es a la certificación actual; con más publicadas, cada una tendrá su propio acceso.
  const mias = PUBLICADAS.filter((c) => c.id === CERT_ACTUAL.id);

  return (
    <div className="overflow-x-hidden">
      <section className="relative">
        <div className="reticula pointer-events-none absolute inset-0" />
        <div className="resplandor pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 md:pt-20">
          <p className="etiqueta">Tu espacio Premium</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Hola, {nombre}. Sigamos con tu preparación.</h1>
          {sesion.accesoHasta && (
            <p className="mt-4 text-lg text-tenue">
              Tu acceso está activo hasta el <strong className="text-texto">{fechaLarga(sesion.accesoHasta)}</strong>.
            </p>
          )}
          {rango.actual !== "ninguno" && (
            <Link href="/panel" className="mt-6 inline-flex items-center gap-3 rounded-xl border border-borde bg-panel/70 py-2 pl-2 pr-4 hover:border-borde-fuerte">
              <Insignia rango={rango.actual} tamano={36} />
              <span className="text-sm">
                <strong>Insignia {RANGOS[rango.actual].nombre}</strong>
                <span className="block text-xs text-tenue">
                  {rango.siguiente
                    ? `Te ${faltan === 1 ? "falta 1 meta" : `faltan ${faltan} metas`} para ${RANGOS[rango.siguiente].nombre}`
                    : "La insignia más alta"}
                </span>
              </span>
            </Link>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/panel" className="btn-primario px-5 py-3 text-[15px]">
              Ir a mi práctica de hoy →
            </Link>
            <Link href="/simulador?modo=examen" className="text-sm text-acento hover:underline">
              Hacer un simulacro completo
            </Link>
          </div>
        </div>
      </section>

      <section id="certificaciones" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-12">
        <h2 className="text-xl font-semibold">Tus certificaciones</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {mias.map((c) => (
            <div key={c.id} className="tarjeta border-acento/40 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-borde bg-fondo px-2 py-0.5 font-mono text-xs text-tenue">{c.proveedor}</span>
                <span className="rounded-md bg-acento/15 px-2 py-0.5 font-mono text-xs text-acento">{NIVELES_CERTIFICACION[c.nivel]}</span>
                <span className="rounded-md bg-acento px-2 py-0.5 font-mono text-xs font-semibold text-fondo">PRO</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{c.nombre}</h3>
              <p className="mt-2 font-mono text-xs text-tenue">
                {totalPreguntas} preguntas · simulacros de {c.examen.preguntas} en {c.examen.minutos} min
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link href="/panel" className="btn-primario">
                  Practicar
                </Link>
                <Link href={`/certificaciones/${c.slug}#temario`} className="text-sm text-acento hover:underline">
                  Ver temario
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-12 md:grid-cols-2 [&>*]:min-w-0">
        {codigo?.codigo_referido && (
          <Invitar
            enlace={`${SITE_URL}/?ref=${codigo.codigo_referido}`}
            invitados={invitados?.length ?? 0}
            compraron={(invitados ?? []).filter((i) => i.recompensado_en).length}
          />
        )}
        <div className="tarjeta p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-tenue">Tu instructor</p>
          <h2 className="mt-3 text-lg font-semibold">¿Te trabaste con un tema?</h2>
          <p className="mt-2 text-sm leading-relaxed text-tenue">
            Escríbeme por WhatsApp y te respondo {sitio.acompanamiento.tiempoRespuesta}. Y cuando apruebes, cuéntame: me
            encantará celebrarlo contigo.
          </p>
          <a
            href={enlaceWhatsApp(`Hola ${sitio.instructor.nombre.split(" ")[0]}, tengo Premium en ${sitio.nombre}. `)}
            target="_blank"
            rel="noreferrer"
            className="btn-secundario mt-4 w-full"
          >
            Escribirle a {sitio.instructor.nombre.split(" ")[0]}
          </a>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Preguntas frecuentes</h2>
        <div className="mt-8 divide-y divide-borde rounded-xl border border-borde">
          {faqs.map((f) => (
            <details key={f.p} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.p}
                <span className="font-mono text-tenue transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-tenue">{f.r}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
