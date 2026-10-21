import Link from "next/link";
import { CERT_ACTUAL, NIVELES_CERTIFICACION, PUBLICADAS, enlaceDiagnostico } from "@/config/certificaciones";
import { sitio, formatoSoles, enlaceWhatsApp, duracion, precioVigente, PASES_ACTUALES, PRECIO_DESDE } from "@/config/sitio";
import { estadisticasBanco, preguntasGratis } from "@/lib/preguntas";
import DiagramaMedallion from "@/components/DiagramaMedallion";
import Precios from "@/components/Precios";
import PreguntaDemo from "@/components/PreguntaDemo";
import { AnilloPreparacion, Medalla, Medidor } from "@/components/progreso/Indicadores";
import type { Nivel } from "@/lib/progreso";

const recorrido = [
  { titulo: "Diagnóstico gratis", texto: "15 preguntas que cubren las 7 secciones del examen. En unos 20 minutos sabes desde dónde partes." },
  { titulo: "Práctica guiada", texto: "Tu panel te dice cada día qué reforzar y vuelves sobre tus errores hasta dominarlos." },
  { titulo: "Simulacros como el examen", texto: `${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos para llegar con confianza.` },
];

const diferencias = [
  "En español, con casos reales de banca, seguros y retail",
  "Practicas, te equivocas y entiendes el porqué de cada respuesta",
  "Tu panel te muestra cuánto te falta y qué reforzar",
  "Dudas directo con el instructor por WhatsApp (Premium)",
  `Pago único desde ${formatoSoles(PRECIO_DESDE)} y, si no apruebas, +${sitio.garantia.dias} días sin costo`,
];

const ejemploDominios: { nombre: string; nivel: Nivel; valor: number }[] = [
  { nombre: "Plataforma", nivel: "oro", valor: 0.9 },
  { nombre: "Ingesta y carga", nivel: "plata", valor: 0.68 },
  { nombre: "Transformación", nivel: "oro", valor: 0.84 },
  { nombre: "Lakeflow Jobs", nivel: "plata", valor: 0.62 },
  { nombre: "CI/CD", nivel: "bronce", valor: 0.4 },
  { nombre: "Optimización", nivel: "plata", valor: 0.6 },
  { nombre: "Gobierno y seguridad", nivel: "bronce", valor: 0.35 },
];

const faqs = [
  {
    p: "¿Son las preguntas reales del examen?",
    r: "No. Son preguntas originales escritas por un Data Engineer en actividad, basadas en la guía oficial del examen. Usar preguntas filtradas (dumps) viola las políticas de Databricks y puede invalidar tu certificación.",
  },
  {
    p: "¿En qué se diferencia de un curso en video?",
    r: "Un curso te enseña el tema; DataCert te entrena para el examen y te acompaña hasta rendirlo: diagnóstico, práctica guiada hacia tus puntos débiles y simulacros, todo en español. Si ya llevaste un curso, aquí lo conviertes en una certificación.",
  },
  {
    p: "¿Es una suscripción? ¿Qué pase me conviene?",
    r: `No: es un pago único por certificación, sin renovaciones (${PASES_ACTUALES.map((p) => `${duracion(p)} por ${formatoSoles(precioVigente(p))}`).join(" o ")}). Si ya trabajas con Databricks y solo quieres simulacros, el más corto; si vas a estudiar con calma, el más largo.`,
  },
  {
    p: "¿Cómo pago y cuándo se activa?",
    r: "Con Yape o con tarjeta, a través de Mercado Pago (nunca vemos los datos de tu tarjeta). Tu acceso se activa al instante, sin enviar capturas.",
  },
  {
    p: "¿Y si no apruebo?",
    r: `Seguimos contigo: si hiciste al menos ${sitio.garantia.minimoSimulacros} simulacros completos antes de tu examen, extendemos tu acceso ${sitio.garantia.dias} días sin costo para tu siguiente intento.`,
  },
];

export default async function Inicio() {
  const [stats, gratis] = await Promise.all([estadisticasBanco(), preguntasGratis()]);
  const demo = gratis.find((p) => p.id === "g-02") ?? gratis[0];

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative">
        <div className="reticula pointer-events-none absolute inset-0" />
        <div className="resplandor pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 md:pt-24 lg:grid-cols-[1.1fr_1fr] [&>*]:min-w-0">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-borde-fuerte bg-panel px-3 py-1 font-mono text-xs text-tenue">
              <span className="h-1.5 w-1.5 rounded-full bg-acento" />
              Certificaciones Databricks · en español
            </span>
            <h1 className="mt-6 text-[34px] font-semibold sm:text-4xl leading-[1.1] tracking-tight md:text-[56px]">
              Certifícate en Databricks{" "}
              <span className="texto-gradiente">practicando como en producción.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-tenue">
              No es otro curso: es tu plan para aprobar. Diagnóstico de tu nivel, práctica guiada hacia tus puntos débiles,
              simulacros como el examen real y un instructor que te acompaña. Todo en español.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#certificaciones" className="btn-primario px-5 py-3 text-[15px]">
                Elige tu certificación →
              </Link>
            </div>
            <p className="mt-5 font-mono text-xs text-tenue">
              Diagnóstico de 15 preguntas · sin tarjeta · Premium desde {formatoSoles(PRECIO_DESDE)}
            </p>
          </div>

          <div className="tarjeta relative p-2 shadow-2xl shadow-acento/5">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-xs text-tenue">pipeline_polizas.sql</span>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-fondo p-4 font-mono text-[12.5px] leading-6">
              <span className="text-tenue">-- Silver: pólizas deduplicadas con CDC</span>
              {"\n"}
              <span className="text-[#ff7b72]">CREATE OR REFRESH STREAMING TABLE</span> silver_polizas;
              {"\n"}
              <span className="text-[#ff7b72]">CREATE FLOW</span> polizas_cdc <span className="text-[#ff7b72]">AS AUTO CDC INTO</span> silver_polizas
              {"\n"}
              {"  "}<span className="text-[#ff7b72]">FROM STREAM</span>(bronze_polizas)
              {"\n"}
              {"  "}<span className="text-[#ff7b72]">KEYS</span> (poliza_id)
              {"\n"}
              {"  "}<span className="text-[#ff7b72]">SEQUENCE BY</span> actualizado_en
              {"\n"}
              {"  "}<span className="text-[#ff7b72]">STORED AS</span> <span className="text-oro">SCD TYPE 2</span>;<span className="cursor" />
            </pre>
            <div className="px-2 pb-1 pt-3">
              <DiagramaMedallion />
            </div>
          </div>
        </div>
      </section>

      {/* ── Métricas ─────────────────────────────────────── */}
      <section className="border-y border-borde bg-panel/50">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-borde px-4 md:grid-cols-4 md:divide-x">
          {[
            [`${stats.total}+`, "preguntas originales"],
            [`${sitio.examen.preguntasReales} · ${sitio.examen.minutosReales}′`, "preguntas · minutos por simulacro"],
            ["2026", "temario según la guía oficial vigente"],
            ["100%", "en español"],
          ].map(([valor, texto]) => (
            <div key={texto} className="px-4 py-8 text-center">
              <dt className="font-mono text-3xl font-semibold text-texto">{valor}</dt>
              <dd className="mt-1 text-sm text-tenue">{texto}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Demo ─────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-2 [&>*]:min-w-0">
        <div>
          <p className="etiqueta">Pruébalo ahora</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Preguntas que se sienten como el examen real.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-tenue">
            Escenarios concretos, código real y distractores basados en los errores que vemos en el día a día. Responde
            esta pregunta y mira cómo explicamos cada respuesta.
          </p>
        </div>
        <PreguntaDemo pregunta={demo} />
      </section>

      {/* ── Por qué DataCert ─────────────────────────────── */}
      <section className="border-t border-borde bg-panel/30">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
          <div>
            <p className="etiqueta">Por qué DataCert</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Un curso te enseña. Nosotros te llevamos hasta el examen.
            </h2>
            <ul className="mt-8 space-y-3">
              {diferencias.map((d) => (
                <li key={d} className="flex gap-3">
                  <span className="text-acento">✓</span>
                  <span className="text-tenue">{d}</span>
                </li>
              ))}
            </ul>
          </div>
            <div className="tarjeta relative p-6 shadow-2xl shadow-acento/5" aria-label="Vista de ejemplo del panel">
              <p className="mb-4 text-right">
                <span className="rounded-full border border-borde px-2 py-0.5 font-mono text-[10px] text-tenue">vista de ejemplo</span>
              </p>
              <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
                <div className="flex justify-center">
                  <AnilloPreparacion indice={72} etiqueta="Muy cerca del nivel de examen" tamano={140} />
                </div>
                <div className="space-y-3">
                  {ejemploDominios.map((d) => (
                    <div key={d.nombre}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span>{d.nombre}</span>
                        <Medalla nivel={d.nivel} />
                      </div>
                      <Medidor valor={d.valor} etiqueta={d.nombre} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 rounded-lg border border-acento/40 bg-fondo p-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-acento">Tu siguiente paso</p>
                <p className="mt-1 text-sm font-semibold">Refuerza Gobierno y seguridad</p>
                <p className="mt-1 text-xs text-tenue">Faltan 18 días para tu examen · 🔥 5 días seguidos</p>
              </div>
            </div>
        </div>
      </section>

      {/* ── Certificaciones ─────────────────────────────── */}
      <section id="certificaciones" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <p className="etiqueta">Certificaciones</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Elige tu certificación y empieza hoy.</h2>
        <p className="mt-4 max-w-2xl text-tenue">
          Cada certificación tiene su propio diagnóstico gratis, banco de preguntas y temario alineado a la guía oficial
          del examen.
        </p>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {PUBLICADAS.map((c) => (
            <div key={c.id} className="tarjeta flex flex-col p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-borde bg-fondo px-2 py-0.5 font-mono text-xs text-tenue">{c.proveedor}</span>
                <span className="rounded-md bg-acento/15 px-2 py-0.5 font-mono text-xs text-acento">{NIVELES_CERTIFICACION[c.nivel]}</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold">{c.nombre}</h3>
              <p className="mt-2 text-sm leading-relaxed text-tenue">{c.descripcion}</p>
              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-borde pt-4 font-mono text-xs text-tenue">
                <div>
                  <dt>Banco</dt>
                  <dd className="mt-1 text-base text-texto">{stats.total}</dd>
                </div>
                <div>
                  <dt>Examen</dt>
                  <dd className="mt-1 text-base text-texto">{c.examen.preguntas} · {c.examen.minutos}′</dd>
                </div>
                <div>
                  <dt>Aprobación</dt>
                  <dd className="mt-1 text-base text-texto">{c.examen.porcentajeAprobacion}%</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link href={enlaceDiagnostico(c)} className="btn-primario">
                  Haz tu diagnóstico gratis →
                </Link>
                <Link href={`/certificaciones/${c.slug}`} className="text-sm text-acento hover:underline">
                  Ver temario y pases
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cómo funciona ─────────────────────────────── */}
      <section id="como-funciona" className="scroll-mt-20 border-y border-borde bg-panel/30">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <p className="etiqueta">Cómo funciona</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Tres pasos hasta tu badge.</h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {recorrido.map((p, i) => (
              <li key={p.titulo} className="tarjeta relative p-6">
                <span className="font-mono text-sm text-acento">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-lg font-semibold">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-tenue">{p.texto}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link href="#certificaciones" className="btn-primario px-6 py-3">
              Elige tu certificación →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Precio ───────────────────────────────────────── */}
      <section id="precio" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <div className="text-center">
          <p className="etiqueta">Precio</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Pagas una vez por certificación.</h2>
          <p className="mx-auto mt-4 max-w-xl text-tenue">
            Cada intento del examen oficial cuesta USD {CERT_ACTUAL.examen.costoUsd}. Llega con confianza y apruébalo a la primera.
          </p>
          <p className="mt-2 font-mono text-xs text-tenue">{CERT_ACTUAL.nombreOficial}</p>
        </div>
        <Precios cert={CERT_ACTUAL} totalPreguntas={stats.total} gratis={stats.gratis} />
      </section>

      {/* ── Instructor ───────────────────────────────────── */}
      <section className="border-y border-borde bg-panel/30">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-[auto_1fr]">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-borde-fuerte bg-panel-2 font-mono text-3xl text-acento">
            {sitio.instructor.iniciales}
          </div>
          <div>
            <p className="etiqueta">Quién está detrás</p>
            <h2 className="mt-3 text-2xl font-semibold">{sitio.instructor.nombre}</h2>
            <p className="font-mono text-sm text-tenue">{sitio.instructor.titulo}</p>
            <p className="mt-4 max-w-2xl leading-relaxed text-tenue">{sitio.instructor.bio}</p>
            <a href={sitio.instructor.linkedin} className="mt-4 inline-block text-sm text-acento hover:underline">
              Ver perfil en LinkedIn →
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24">
        <p className="etiqueta text-center">FAQ</p>
        <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight md:text-4xl">Preguntas frecuentes</h2>
        <div className="mt-12 divide-y divide-borde rounded-xl border border-borde">
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
        <p className="mt-8 text-center text-sm text-tenue">
          ¿Otra duda?{" "}
          <a href={enlaceWhatsApp(`Hola, tengo una consulta sobre ${sitio.nombre}.`)} className="text-acento hover:underline">
            Escríbenos por WhatsApp
          </a>
        </p>
      </section>

      {/* ── CTA final ────────────────────────────────────── */}
      <section className="px-4 pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-borde-fuerte bg-panel px-6 py-16 text-center">
          <div className="resplandor pointer-events-none absolute inset-0" />
          <h2 className="relative text-3xl font-semibold tracking-tight md:text-4xl">Tu próximo badge empieza hoy.</h2>
          <p className="relative mx-auto mt-4 max-w-lg text-tenue">
            Crea tu cuenta gratis, mide tu nivel en unos 20 minutos y decide después.
          </p>
          <Link href="#certificaciones" className="btn-primario relative mt-8 px-6 py-3 text-[15px]">
            Elige tu certificación →
          </Link>
        </div>
      </section>
    </div>
  );
}
