import Link from "next/link";
import { sitio, formatoSoles, enlaceWhatsApp, duracion, precioMensual, PRECIO_DESDE } from "@/config/sitio";
import { DOMINIOS, TEMAS, type Dominio } from "@/lib/tipos";
import { estadisticasBanco, preguntasGratis } from "@/lib/preguntas";
import DiagramaMedallion from "@/components/DiagramaMedallion";
import PreguntaDemo from "@/components/PreguntaDemo";
import { AnilloPreparacion, Medalla, Medidor } from "@/components/progreso/Indicadores";
import type { Nivel } from "@/lib/progreso";

const recorrido = [
  { titulo: "Diagnóstico gratis", texto: "10 preguntas, dos por dominio. En 10 minutos sabes desde dónde partes." },
  { titulo: "Tu plan con fecha", texto: "Eliges cuándo das el examen y te decimos cuánto practicar según tu nivel." },
  { titulo: "Práctica guiada", texto: "Cada día tu panel te dice qué tema reforzar. 20 minutos bastan." },
  { titulo: "Repaso de errores", texto: "Vuelves sobre lo que fallaste hasta dominarlo: Bronce → Plata → Oro." },
  { titulo: "Simulacros reales", texto: `${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos, cuando tu índice pase de 70%.` },
  { titulo: "Día del examen", texto: "Checklist final y, al aprobar, compartes tu badge en LinkedIn." },
];

const comparacion = [
  ["Objetivo", "Enseñarte el tema", "Que apruebes el examen"],
  ["Idioma y casos", "Muchas veces en inglés o con subtítulos", "Español, con casos de banca, seguros y retail"],
  ["Cómo aprendes", "Ves videos y avanzas por tu cuenta", "Practicas, te equivocas y entiendes el porqué"],
  ["Seguimiento", "Porcentaje de videos vistos", "Índice de preparación por dominio y plan con fecha"],
  ["Dudas", "Foro o comentarios", "Directo con el instructor por WhatsApp (Premium)"],
  ["Pago", "Suscripción o curso suelto", `Pase desde ${formatoSoles(PRECIO_DESDE)}, sin renovación automática`],
];

const ejemploDominios: { nombre: string; nivel: Nivel; valor: number }[] = [
  { nombre: "Plataforma", nivel: "oro", valor: 0.9 },
  { nombre: "Ingesta", nivel: "plata", valor: 0.68 },
  { nombre: "Transformación", nivel: "oro", valor: 0.84 },
  { nombre: "Producción", nivel: "plata", valor: 0.6 },
  { nombre: "Gobierno", nivel: "bronce", valor: 0.35 },
];

const faqs = [
  {
    p: "¿Son las preguntas reales del examen?",
    r: "No. Son preguntas originales escritas por un Data Engineer en actividad, basadas en los dominios oficiales del examen. Usar preguntas filtradas (dumps) viola las políticas de Databricks y puede invalidar tu certificación.",
  },
  {
    p: "¿En qué se diferencia de un curso de Udemy o Coursera?",
    r: "Un curso te enseña el tema; DataCert te entrena para el examen y te acompaña hasta rendirlo. Empiezas con un diagnóstico, tu panel te dice cada día qué reforzar, practicas con preguntas tipo examen explicadas en español y, si eres Premium, consultas tus dudas directamente con el instructor. Se complementan bien: si ya llevaste un curso, aquí lo conviertes en una certificación.",
  },
  {
    p: "¿Cómo pago? ¿Es seguro?",
    r: "Pagas con Yape (ingresando tu celular y el código de aprobación de tu app) o con tarjeta de crédito o débito. Los pagos los procesa Mercado Pago: nosotros nunca vemos ni guardamos los datos de tu tarjeta.",
  },
  {
    p: "¿Cuándo se activa mi acceso?",
    r: "Al instante. Apenas Mercado Pago confirma el pago, tu cuenta pasa a Premium automáticamente, sin enviar capturas ni esperar a nadie.",
  },
  {
    p: "¿Es una suscripción? ¿Me cobrarán cada mes?",
    r: `No. Compras un pase de pago único: ${sitio.planes
      .map((p) => `${duracion(p)} por ${formatoSoles(p.precio)}`)
      .join(" o ")}. No hay cobros automáticos ni renovaciones; si necesitas más tiempo, compras otro pase y se suma al que tienes.`,
  },
  {
    p: "¿Qué pase me conviene?",
    r: "Si ya trabajas con Databricks y solo quieres simulacros antes del examen, el pase de 1 mes. Si vas a estudiar los temas con calma (lo más común: entre 6 y 10 semanas), el de 3 meses te sale más barato por mes.",
  },
  {
    p: "¿Necesito experiencia previa?",
    r: "Se recomienda haber trabajado al menos unos meses con Databricks o Spark. Si recién empiezas, las explicaciones te ayudarán a cubrir los vacíos.",
  },
];

export default async function Inicio() {
  const [stats, gratis] = await Promise.all([estadisticasBanco(), preguntasGratis()]);
  const demo = gratis.find((p) => p.id === "g-002") ?? gratis[0];

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
              Databricks Data Engineer Associate · 2026
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
              <Link href="/registro" className="btn-primario px-5 py-3 text-[15px]">
                Haz tu diagnóstico gratis →
              </Link>
              <Link href="#como-funciona" className="btn-secundario px-5 py-3 text-[15px]">
                Cómo te acompañamos
              </Link>
            </div>
            <p className="mt-5 font-mono text-xs text-tenue">
              10 preguntas · 10 minutos · sin tarjeta · Premium desde {formatoSoles(PRECIO_DESDE)}
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
            ["5", "dominios del examen"],
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

      {/* ── Diferencia ───────────────────────────────────── */}
      <section className="border-t border-borde bg-panel/30">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <p className="etiqueta">Por qué DataCert</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Un curso te enseña. Nosotros te llevamos hasta el examen.
          </h2>
          <div className="mt-12 overflow-x-auto rounded-xl border border-borde">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-borde bg-panel text-left">
                  <th className="w-1/5 px-5 py-4 font-normal text-tenue" />
                  <th className="px-5 py-4 font-medium text-tenue">Curso en video típico</th>
                  <th className="px-5 py-4 font-semibold text-acento">DataCert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {comparacion.map(([aspecto, curso, nosotros]) => (
                  <tr key={aspecto} className="bg-panel/40">
                    <th scope="row" className="px-5 py-4 text-left font-mono text-xs uppercase tracking-wider text-tenue">
                      {aspecto}
                    </th>
                    <td className="px-5 py-4 text-tenue">{curso}</td>
                    <td className="px-5 py-4">
                      <span className="mr-2 text-acento">✓</span>
                      {nosotros}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista previa del panel del alumno */}
          <div className="mt-20 grid items-center gap-12 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
            <div>
              <p className="etiqueta">Tu panel</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Sabrás exactamente cuándo tienes nivel de examen.</h3>
              <p className="mt-4 leading-relaxed text-tenue">
                Tu índice de preparación sube con cada práctica. Cada dominio avanza de Bronce a Plata a Oro, y tu panel
                siempre te muestra un único siguiente paso: nada de adivinar qué estudiar.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-tenue">
                <li>✓ Cuenta regresiva a tu fecha de examen</li>
                <li>✓ Racha de días practicando</li>
                <li>✓ Repaso automático de tus errores</li>
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
                <p className="mt-1 text-sm font-semibold">Refuerza Gobierno y calidad de datos</p>
                <p className="mt-1 text-xs text-tenue">Faltan 18 días para tu examen · 🔥 5 días seguidos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Temario ──────────────────────────────────────── */}
      <section id="temario" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <p className="etiqueta">Temario</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Los 5 dominios del examen.</h2>
        <div className="mt-12 space-y-3">
          {(Object.keys(DOMINIOS) as Dominio[]).map((d, i) => (
            <div key={d} className="tarjeta grid gap-4 p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8">
              <span className="font-mono text-sm text-tenue">0{i + 1}</span>
              <div>
                <h3 className="font-semibold">{DOMINIOS[d]}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TEMAS[d].map((t) => (
                    <span key={t} className="rounded-md border border-borde bg-fondo px-2.5 py-1 font-mono text-xs text-tenue">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <span className="font-mono text-sm text-acento">{stats.porDominio[d] ?? 0} preguntas</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cómo te acompañamos ─────────────────────────── */}
      <section id="como-funciona" className="scroll-mt-20 border-y border-borde bg-panel/30">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <p className="etiqueta">Cómo te acompañamos</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">De tu primer diagnóstico a tu badge.</h2>
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
            <Link href="/registro" className="btn-primario px-6 py-3">
              Empezar con mi diagnóstico →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Precio ───────────────────────────────────────── */}
      <section id="precio" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <div className="text-center">
          <p className="etiqueta">Precio</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Menos que un almuerzo de oficina.</h2>
          <p className="mx-auto mt-4 max-w-xl text-tenue">
            El examen oficial cuesta USD 200. Llega con confianza y apruébalo a la primera.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          <PlanCard
            nombre="Gratis"
            precio="S/ 0"
            nota="para siempre"
            cta="Crear cuenta"
            href="/registro"
            items={[
              `Diagnóstico de ${stats.gratis} preguntas con explicaciones`,
              "Panel con índice de preparación",
              "Plan con fecha de examen",
            ]}
          />
          {sitio.planes.map((plan) => {
            const destacado = "destacado" in plan && plan.destacado;
            const base = Math.max(...sitio.planes.map(precioMensual));
            const ahorro = Math.round((1 - precioMensual(plan) / base) * 100);
            return (
              <PlanCard
                key={plan.id}
                destacado={destacado}
                insignia={destacado ? `más elegido${ahorro > 0 ? ` · ahorra ${ahorro}%` : ""}` : undefined}
                nombre={plan.nombre}
                precio={formatoSoles(plan.precio)}
                nota={
                  plan.meses > 1
                    ? `${formatoSoles(precioMensual(plan))} al mes · pago único`
                    : `pago único · ${plan.nota}`
                }
                cta={`Elegir ${duracion(plan)}`}
                href={`/comprar?plan=${plan.id}`}
                items={[
                  `Banco completo de ${stats.total}+ preguntas`,
                  `Simulacros de ${sitio.examen.preguntasReales} preguntas cronometrados`,
                  "Práctica por dominio y repaso de errores",
                  ...(sitio.acompanamiento.dudasPorWhatsapp ? ["Dudas con el instructor por WhatsApp"] : []),
                  `Acceso por ${duracion(plan)}, sin renovación automática`,
                ]}
              />
            );
          })}
        </div>
        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-tenue">
          <span>Paga con</span>
          {["Yape", "Visa", "Mastercard", "Amex"].map((m) => (
            <span key={m} className="rounded-md border border-borde bg-panel px-2.5 py-1 font-mono text-xs text-texto">
              {m}
            </span>
          ))}
          <span>· Procesado de forma segura por Mercado Pago</span>
        </p>
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
          <a href={enlaceWhatsApp("Hola, tengo una consulta sobre el simulador de Databricks.")} className="text-acento hover:underline">
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
            Crea tu cuenta gratis, mide tu nivel en 10 minutos y decide después.
          </p>
          <Link href="/registro" className="btn-primario relative mt-8 px-6 py-3 text-[15px]">
            Haz tu diagnóstico gratis →
          </Link>
        </div>
      </section>
    </div>
  );
}

function PlanCard(props: {
  nombre: string;
  precio: string;
  nota: string;
  cta: string;
  href: string;
  items: string[];
  destacado?: boolean;
  insignia?: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 ${
        props.destacado ? "border-acento/60 bg-panel shadow-2xl shadow-acento/10" : "border-borde bg-panel/60"
      }`}
    >
      {props.insignia && (
        <span className="absolute -top-3 left-8 rounded-full bg-acento px-3 py-0.5 font-mono text-xs font-semibold text-fondo">
          {props.insignia}
        </span>
      )}
      <p className="font-mono text-sm text-tenue">{props.nombre}</p>
      <p className="mt-3 flex items-baseline gap-3">
        <span className="text-4xl font-semibold tracking-tight">{props.precio}</span>
      </p>
      <p className="mt-1 text-sm text-tenue">{props.nota}</p>
      <ul className="mt-8 flex-1 space-y-3 text-sm">
        {props.items.map((it) => (
          <li key={it} className="flex gap-3">
            <span className="text-acento">✓</span>
            {it}
          </li>
        ))}
      </ul>
      <Link href={props.href} className={`${props.destacado ? "btn-primario" : "btn-secundario"} mt-8 w-full py-3`}>
        {props.cta}
      </Link>
    </div>
  );
}
