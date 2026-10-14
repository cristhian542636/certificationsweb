import Link from "next/link";
import { sitio, enlaceWhatsApp } from "@/config/sitio";
import { DOMINIOS } from "@/lib/tipos";

const beneficios = [
  {
    titulo: "Preguntas originales tipo examen",
    texto: "Escritas a partir de los dominios oficiales del examen, con una explicación detallada en cada respuesta.",
  },
  {
    titulo: "Modo examen cronometrado",
    texto: `Practica con ${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos, igual que el examen real.`,
  },
  {
    titulo: "Resultados por dominio",
    texto: "Mira en qué dominio fallas más y enfoca tu estudio donde de verdad lo necesitas.",
  },
  {
    titulo: "Casos reales de la industria",
    texto: "Pipelines Medallion, CDC y gobierno con Unity Catalog, explicados con ejemplos del sector seguros.",
  },
];

const faqs = [
  {
    p: "¿Son las preguntas reales del examen?",
    r: "No. Son preguntas originales escritas para practicar los temas del examen. Usar preguntas filtradas (dumps) viola las reglas de Databricks y puede invalidar tu certificación.",
  },
  {
    p: "¿Cómo pago?",
    r: `Escaneas el QR de Yape, pagas S/ ${sitio.producto.precioSoles} y nos envías la captura por WhatsApp. Te respondemos con tu código de acceso.`,
  },
  {
    p: "¿Cuánto tiempo tengo acceso?",
    r: `${sitio.producto.duracionAccesoMeses} meses desde la activación, incluidas las preguntas nuevas que agreguemos.`,
  },
  {
    p: "¿Puedo probar antes de pagar?",
    r: "Sí. El simulador tiene preguntas gratuitas sin registro.",
  },
];

export default function Inicio() {
  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-orange-600">
          Databricks Data Engineer Associate
        </p>
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          Aprueba tu certificación de Databricks <span className="text-orange-600">a la primera</span>, practicando
          en español.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Simulador de examen con preguntas originales, explicaciones claras y casos reales de ingeniería de datos.
          Hecho por un Data Engineer que trabaja con Databricks todos los días.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/simulador"
            className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
          >
            Probar gratis
          </Link>
          <Link
            href="/comprar"
            className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Acceso completo · S/ {sitio.producto.precioSoles}
          </Link>
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold">Qué incluye</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {beneficios.map((b) => (
              <div key={b.titulo} className="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
                <h3 className="font-semibold">{b.titulo}</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-2xl font-bold">Dominios que cubre el simulador</h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {Object.values(DOMINIOS).map((d) => (
            <li key={d} className="flex items-center gap-3">
              <span className="text-orange-600">✓</span>
              {d}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white py-16 dark:bg-slate-900">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Sobre el instructor</h2>
            <p className="mt-2 font-semibold">
              {sitio.instructor.nombre} · {sitio.instructor.titulo}
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-300">{sitio.instructor.bio}</p>
            <a href={sitio.instructor.linkedin} className="mt-4 inline-block text-orange-600 hover:underline">
              Ver perfil de LinkedIn →
            </a>
          </div>
          <div className="rounded-2xl border-2 border-orange-600 p-8">
            <p className="text-sm font-semibold uppercase text-orange-600">Precio de lanzamiento</p>
            <p className="mt-2 text-4xl font-extrabold">
              S/ {sitio.producto.precioSoles}{" "}
              <span className="text-lg font-normal text-slate-400 line-through">
                S/ {sitio.producto.precioAnteriorSoles}
              </span>
            </p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Pago único con Yape · {sitio.producto.duracionAccesoMeses} meses de acceso
            </p>
            <Link
              href="/comprar"
              className="mt-6 block rounded-lg bg-orange-600 px-5 py-3 text-center font-semibold text-white hover:bg-orange-700"
            >
              Comprar con Yape
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-2xl font-bold">Preguntas frecuentes</h2>
        <div className="mt-6 space-y-4">
          {faqs.map((f) => (
            <details key={f.p} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <summary className="cursor-pointer font-semibold">{f.p}</summary>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{f.r}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-slate-600 dark:text-slate-300">
          ¿Otra duda?{" "}
          <a
            href={enlaceWhatsApp(`Hola, tengo una consulta sobre el ${sitio.producto.nombre}.`)}
            className="text-orange-600 hover:underline"
          >
            Escríbenos por WhatsApp
          </a>
        </p>
      </section>
    </div>
  );
}
