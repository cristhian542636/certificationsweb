import Link from "next/link";
import { sitio, formatoSoles, enlaceWhatsApp } from "@/config/sitio";
import { DOMINIOS, TEMAS, type Dominio } from "@/lib/tipos";
import { estadisticasBanco, preguntasGratis } from "@/lib/preguntas";
import DiagramaMedallion from "@/components/DiagramaMedallion";
import PreguntaDemo from "@/components/PreguntaDemo";

const pasos = [
  { n: "01", titulo: "Crea tu cuenta gratis", texto: "Solo correo y contraseña. Sin tarjeta." },
  { n: "02", titulo: "Practica con preguntas de muestra", texto: "Mide tu nivel en los 5 dominios del examen." },
  { n: "03", titulo: "Desbloquea el banco completo", texto: "Paga con Yape o tarjeta y tu acceso se activa al instante." },
];

const beneficios = [
  { icono: "⏱", titulo: "Modo examen real", texto: `${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos, con la misma presión del día del examen.` },
  { icono: "◎", titulo: "Diagnóstico por dominio", texto: "Ves exactamente dónde fallas: ingesta, transformación, producción o gobierno." },
  { icono: "✎", titulo: "Explicaciones de ingeniero", texto: "Cada respuesta explica el porqué y la trampa más común, no solo cuál es la correcta." },
  { icono: "⛁", titulo: "Casos reales", texto: "Escenarios de seguros, banca y retail: Medallion, CDC, Unity Catalog en producción." },
  { icono: "↻", titulo: "Banco que crece", texto: "Preguntas nuevas cada mes, actualizadas con los cambios de la plataforma." },
  { icono: "▤", titulo: "Historial de progreso", texto: "Tus intentos quedan guardados para ver tu evolución hasta el día del examen." },
];

const faqs = [
  {
    p: "¿Son las preguntas reales del examen?",
    r: "No. Son preguntas originales escritas por un Data Engineer en actividad, basadas en los dominios oficiales del examen. Usar preguntas filtradas (dumps) viola las políticas de Databricks y puede invalidar tu certificación.",
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
    r: `No. Es un pago único de ${formatoSoles(sitio.producto.precio)} por ${sitio.producto.mesesAcceso} meses de acceso. No hay cobros automáticos ni renovaciones.`,
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
              El simulador en español para ingenieros de datos: preguntas originales, modo examen cronometrado y
              explicaciones escritas desde la experiencia real con Lakeflow, Unity Catalog y Delta Lake.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="btn-primario px-5 py-3 text-[15px]">
                Empieza gratis →
              </Link>
              <Link href="#temario" className="btn-secundario px-5 py-3 text-[15px]">
                Ver temario
              </Link>
            </div>
            <p className="mt-5 font-mono text-xs text-tenue">
              Sin tarjeta para empezar · Premium {formatoSoles(sitio.producto.precio)} pago único con Yape o tarjeta
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

      {/* ── Beneficios ───────────────────────────────────── */}
      <section className="border-t border-borde bg-panel/30">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <p className="etiqueta">Qué incluye</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Todo lo que necesitas para llegar listo al examen.
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-borde bg-borde md:grid-cols-3">
            {beneficios.map((b) => (
              <div key={b.titulo} className="bg-panel p-7">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-borde-fuerte bg-panel-2 text-acento">
                  {b.icono}
                </span>
                <h3 className="mt-5 font-semibold">{b.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-tenue">{b.texto}</p>
              </div>
            ))}
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

      {/* ── Cómo funciona ────────────────────────────────── */}
      <section id="como-funciona" className="scroll-mt-20 border-y border-borde bg-panel/30">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <p className="etiqueta">Cómo funciona</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">De cero a listo en tres pasos.</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {pasos.map((p) => (
              <li key={p.n} className="tarjeta p-7">
                <span className="font-mono text-sm text-acento">{p.n}</span>
                <h3 className="mt-4 text-lg font-semibold">{p.titulo}</h3>
                <p className="mt-2 text-sm text-tenue">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Precio ───────────────────────────────────────── */}
      <section id="precio" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <div className="text-center">
          <p className="etiqueta">Precio</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Menos que un almuerzo de oficina.</h2>
          <p className="mx-auto mt-4 max-w-xl text-tenue">
            El examen oficial cuesta USD 200. Llega preparado y apruébalo a la primera.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <PlanCard
            nombre="Gratis"
            precio="S/ 0"
            nota="para siempre"
            cta="Crear cuenta"
            items={[`${stats.gratis} preguntas de muestra`, "Modo práctica con explicaciones", "Resultados por dominio"]}
          />
          <PlanCard
            destacado
            nombre="Premium"
            precio={formatoSoles(sitio.producto.precio)}
            anterior={formatoSoles(sitio.producto.precioAnterior)}
            nota={`pago único · ${sitio.producto.mesesAcceso} meses`}
            cta="Empezar ahora"
            items={[
              `Banco completo de ${stats.total}+ preguntas`,
              `Simulacros de ${sitio.examen.preguntasReales} preguntas cronometrados`,
              "Historial y progreso de tus intentos",
              "Preguntas nuevas cada mes incluidas",
              "Activación automática al pagar",
            ]}
          />
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
            Crear cuenta gratis →
          </Link>
        </div>
      </section>
    </div>
  );
}

function PlanCard(props: {
  nombre: string;
  precio: string;
  anterior?: string;
  nota: string;
  cta: string;
  items: string[];
  destacado?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-8 ${
        props.destacado ? "border-acento/60 bg-panel shadow-2xl shadow-acento/10" : "border-borde bg-panel/60"
      }`}
    >
      {props.destacado && (
        <span className="absolute -top-3 left-8 rounded-full bg-acento px-3 py-0.5 font-mono text-xs font-semibold text-fondo">
          precio de lanzamiento
        </span>
      )}
      <p className="font-mono text-sm text-tenue">{props.nombre}</p>
      <p className="mt-3 flex items-baseline gap-3">
        <span className="text-4xl font-semibold tracking-tight">{props.precio}</span>
        {props.anterior && <span className="text-tenue line-through">{props.anterior}</span>}
      </p>
      <p className="mt-1 text-sm text-tenue">{props.nota}</p>
      <ul className="mt-8 space-y-3 text-sm">
        {props.items.map((it) => (
          <li key={it} className="flex gap-3">
            <span className="text-acento">✓</span>
            {it}
          </li>
        ))}
      </ul>
      <Link href="/registro" className={`${props.destacado ? "btn-primario" : "btn-secundario"} mt-8 w-full py-3`}>
        {props.cta}
      </Link>
    </div>
  );
}
