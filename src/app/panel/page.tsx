import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sitio, enlaceWhatsApp, formatoSoles, PRECIO_DESDE } from "@/config/sitio";
import { SITE_URL } from "@/lib/entorno";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerProgreso } from "@/lib/progreso-servidor";
import { diasEntre, hoyLima, siguientePaso, type Progreso } from "@/lib/progreso";
import { DOMINIOS, PESOS } from "@/lib/tipos";
import { AnilloPreparacion, Medalla, Medidor, Racha, TendenciaIntentos } from "@/components/progreso/Indicadores";
import { EditarFecha, PreguntarResultado, ReiniciarMeta } from "@/components/progreso/Meta";
import Garantia, { type EstadoGarantia } from "@/components/progreso/Garantia";
import { CERT_ACTUAL } from "@/config/certificaciones";
import { clienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Mi panel" };
export const dynamic = "force-dynamic";

const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", { day: "numeric", month: "long", timeZone: "UTC" });

export default async function Panel() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?next=/panel");

  const perfil = sesion.perfil;
  const progreso = await obtenerProgreso(sesion);
  // Primera visita: define tu meta antes de ver el panel.
  if (perfil && !perfil.nivel && progreso.respondidas === 0) redirect("/bienvenida");

  const hoy = hoyLima();
  const nombre = (perfil?.nombre || sesion.usuario.email.split("@")[0]).split(" ")[0];
  const diasExamen = perfil?.fecha_examen ? diasEntre(hoy, perfil.fecha_examen) : null;
  const paso = siguientePaso(progreso, sesion.premium);

  // Garantía: solo relevante para quien no aprobó y tuvo acceso pagado.
  let garantia: EstadoGarantia | undefined;
  if (perfil?.resultado_examen === "no_aprobado" && sesion.accesoHasta) {
    const supabase = await clienteServidor();
    const { data } = await supabase.from("garantias").select("estado").eq("certificacion", CERT_ACTUAL.id).maybeSingle();
    garantia = (data?.estado as EstadoGarantia) ?? null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* ── Saludo y meta ───────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="etiqueta">Mi camino a la certificación</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Hola, {nombre} 👋</h1>
          <Cuenta diasExamen={diasExamen} fecha={perfil?.fecha_examen ?? null} resultado={perfil?.resultado_examen ?? null} />
        </div>
        <div className="flex gap-2">
          <Link href="/simulador" className="btn-secundario">Simulador</Link>
          <Link href="/cuenta" className="btn-secundario">Mi cuenta</Link>
        </div>
      </div>

      {/* ── Después del examen ─────────────────────────── */}
      <BloqueExamen diasExamen={diasExamen} resultado={perfil?.resultado_examen ?? null} progreso={progreso} garantia={garantia} />

      {/* ── Índice + siguiente paso ─────────────────────── */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="tarjeta flex flex-col items-center p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-tenue">Índice de preparación</p>
          <div className="mt-5">
            <AnilloPreparacion indice={progreso.indice} etiqueta={progreso.etiqueta} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-tenue">
            Combina tu precisión y cuánto has practicado en cada dominio. Apunta a <strong className="text-texto">85%</strong> antes
            del examen.
          </p>
        </div>

        <div
          className={`relative overflow-hidden rounded-xl border p-8 ${
            paso.tipo === "premium" ? "border-oro/50 bg-panel" : "border-acento/50 bg-panel"
          }`}
        >
          <div className="resplandor pointer-events-none absolute inset-0" />
          <div className="relative flex h-full flex-col">
            <p className="etiqueta">Tu siguiente paso</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{paso.titulo}</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-tenue">{paso.texto}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={paso.href} className="btn-primario px-5 py-3">
                {paso.cta} →
              </Link>
              {paso.tipo === "premium" && (
                <span className="text-sm text-tenue">desde {formatoSoles(PRECIO_DESDE)}, pago único</span>
              )}
            </div>
            <dl className="mt-auto grid grid-cols-3 gap-4 border-t border-borde pt-6">
              <div>
                <dt className="text-xs text-tenue">Preguntas respondidas</dt>
                <dd className="mt-1 text-2xl font-semibold">{progreso.respondidas}</dd>
              </div>
              <div>
                <dt className="text-xs text-tenue">Errores por repasar</dt>
                <dd className="mt-1 text-2xl font-semibold">{progreso.errores.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-tenue">Intentos</dt>
                <dd className="mt-1 text-2xl font-semibold">{progreso.intentos.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* ── Dominios ────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold">Tu dominio por tema</h2>
          <p className="text-xs text-tenue">Bronce → Plata → Oro: llega a Oro en las 7 secciones y tendrás nivel de examen.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {progreso.dominios.map((d) => {
            const puedePracticar = d.respondidas < d.disponibles || sesion.premium;
            return (
              <div key={d.dominio} className="tarjeta flex flex-col p-5">
                <Medalla nivel={d.nivel} />
                <h3 className="mt-3 text-sm font-semibold leading-snug">{DOMINIOS[d.dominio]}</h3>
                <p className="mt-1 font-mono text-[11px] text-tenue">{PESOS[d.dominio]}% del examen</p>
                <div className="mt-4">
                  <Medidor valor={d.puntaje} etiqueta={`Dominio de ${DOMINIOS[d.dominio]}`} />
                </div>
                <p className="mt-2 text-xs text-tenue">
                  {d.respondidas
                    ? `${Math.round(d.precision * 100)}% de acierto · ${d.respondidas} de ${d.totalBanco} preguntas`
                    : "Aún sin practicar"}
                </p>
                <div className="mt-auto pt-4">
                  {puedePracticar ? (
                    <Link href={`/simulador?modo=dominio&dominio=${d.dominio}`} className="text-sm text-acento hover:underline">
                      Practicar →
                    </Link>
                  ) : (
                    <Link href="/comprar" className="text-sm text-oro hover:underline">
                      🔒 +{d.totalBanco - d.disponibles} en Premium
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Racha, tendencia y acompañamiento ───────────── */}
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <div className="tarjeta p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-tenue">Racha de práctica</p>
          <div className="mt-4">
            <Racha racha={progreso.racha} diasActivos={progreso.diasActivos} hoy={hoy} />
          </div>
          <p className="mt-4 text-xs text-tenue">
            {progreso.diasActivos.has(hoy)
              ? "¡Hoy ya practicaste! Vuelve mañana para mantener la racha."
              : "10 minutos al día rinden más que 3 horas un domingo."}
          </p>
        </div>

        <div className="tarjeta p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-tenue">Tu evolución</p>
          <div className="mt-6">
            {progreso.intentos.length >= 2 ? (
              <TendenciaIntentos intentos={progreso.intentos} meta={sitio.examen.porcentajeAprobacion} />
            ) : (
              <p className="text-sm text-tenue">Completa al menos 2 intentos para ver cómo vas mejorando.</p>
            )}
          </div>
        </div>

        <Acompanamiento premium={sesion.premium} />
      </div>
    </div>
  );
}

function Cuenta({ diasExamen, fecha, resultado }: { diasExamen: number | null; fecha: string | null; resultado: string | null }) {
  if (resultado) return null;
  if (diasExamen === null || !fecha) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3 text-tenue">
        <span>Ponle fecha a tu meta: quien agenda su examen, lo da.</span>
        <EditarFecha fecha={null} texto="Definir fecha de examen" />
      </div>
    );
  }
  if (diasExamen < 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-tenue">
      <span>
        {diasExamen === 0 ? (
          <strong className="text-texto">¡Hoy es tu examen! Mucha suerte 💪</strong>
        ) : (
          <>
            Faltan <strong className="text-texto">{diasExamen} {diasExamen === 1 ? "día" : "días"}</strong> para tu examen (
            {fechaLarga(fecha)})
          </>
        )}
      </span>
      <EditarFecha fecha={fecha} />
    </div>
  );
}

function BloqueExamen({
  diasExamen,
  resultado,
  progreso,
  garantia,
}: {
  diasExamen: number | null;
  resultado: "aprobado" | "no_aprobado" | null;
  progreso: Progreso;
  /** undefined: no aplica (nunca tuvo acceso pagado). */
  garantia?: EstadoGarantia;
}) {
  if (resultado === "aprobado") {
    const compartir = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`;
    return (
      <div className="relative mt-8 overflow-hidden rounded-xl border border-emerald-500/40 bg-panel p-8">
        <div className="relative">
          <p className="text-4xl" aria-hidden>🏆</p>
          <h2 className="mt-3 text-2xl font-semibold">¡Felicitaciones, ya eres Databricks Certified!</h2>
          <p className="mt-2 max-w-2xl text-tenue">
            Todo el esfuerzo valió la pena. Comparte tu logro: tu badge en LinkedIn abre puertas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={compartir} target="_blank" rel="noreferrer" className="btn-primario">
              Compartir en LinkedIn
            </a>
            <Link href="/cuenta" className="btn-secundario">
              Invita a tus colegas
            </Link>
            <a
              href={enlaceWhatsApp(`¡Hola ${sitio.instructor.nombre.split(" ")[0]}! Aprobé mi certificación Databricks. Te cuento mi experiencia con ${sitio.nombre}: `)}
              target="_blank"
              rel="noreferrer"
              className="btn-secundario"
            >
              Cuéntame tu experiencia
            </a>
            <ReiniciarMeta />
          </div>
        </div>
      </div>
    );
  }

  if (resultado === "no_aprobado") {
    const debiles = progreso.dominios.filter((d) => d.nivel !== "oro").map((d) => DOMINIOS[d.dominio]);
    return (
      <div className="mt-8 rounded-xl border border-borde-fuerte bg-panel p-8">
        <h2 className="text-2xl font-semibold">Esta vez no salió, y está bien.</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-tenue">
          Un intento no aprobado te deja algo valioso: ya conoces el formato y el ritmo del examen. Tu panel te dice qué
          reforzar
          {debiles.length ? `: ${debiles.slice(0, 3).join(", ")}` : ""}. Define tu nueva fecha y vamos por ella.
        </p>
        {garantia !== undefined && (
          <div className="mt-5">
            <Garantia estado={garantia} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <ReiniciarMeta />
          <Link href="/simulador?modo=repaso" className="btn-primario">Repasar mis errores</Link>
        </div>
      </div>
    );
  }

  if (diasExamen !== null && diasExamen < 0) {
    return (
      <div className="mt-8 rounded-xl border border-acento/50 bg-panel p-8">
        <h2 className="text-2xl font-semibold">¿Cómo te fue en tu examen?</h2>
        <p className="mt-2 text-tenue">Cuéntanos para ajustar tu panel a lo que sigue.</p>
        <div className="mt-6">
          <PreguntarResultado />
        </div>
      </div>
    );
  }

  if (diasExamen !== null && diasExamen <= 7) {
    return (
      <div className="mt-8 rounded-xl border border-oro/40 bg-panel p-8">
        <p className="etiqueta !text-oro">Recta final</p>
        <h2 className="mt-2 text-2xl font-semibold">Checklist para el día del examen</h2>
        <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          {[
            "Confirma la fecha, la hora y la zona horaria de tu cita en el correo del proveedor del examen.",
            "Ten a la mano tu documento de identidad vigente.",
            "Si es en línea: prueba cámara, micrófono e internet con un día de anticipación.",
            "Escritorio despejado y un lugar silencioso, sin interrupciones.",
            "El día anterior: solo repasa tus errores. Nada de temas nuevos.",
            "Durante el examen: marca las dudosas, sigue avanzando y vuelve al final.",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span className="text-oro">☐</span>
              <span className="text-tenue">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

function Acompanamiento({ premium }: { premium: boolean }) {
  const { dudasPorWhatsapp, tiempoRespuesta } = sitio.acompanamiento;
  if (!dudasPorWhatsapp) return null;
  return (
    <div className={`tarjeta p-6 ${premium ? "border-acento/40" : ""}`}>
      <p className="font-mono text-xs uppercase tracking-widest text-tenue">Acompañamiento</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-borde-fuerte bg-panel-2 font-mono text-acento">
          {sitio.instructor.iniciales}
        </span>
        <div>
          <p className="font-semibold">{sitio.instructor.nombre}</p>
          <p className="text-xs text-tenue">{sitio.instructor.titulo}</p>
        </div>
      </div>
      {premium ? (
        <>
          <p className="mt-4 text-sm leading-relaxed text-tenue">
            ¿Una pregunta no te quedó clara? Escríbeme y te respondo {tiempoRespuesta}. También puedes consultarme desde
            cada pregunta del simulador.
          </p>
          <a
            href={enlaceWhatsApp(`Hola ${sitio.instructor.nombre.split(" ")[0]}, tengo Premium en ${sitio.nombre}. `)}
            target="_blank"
            rel="noreferrer"
            className="btn-secundario mt-4 w-full"
          >
            Escribirle por WhatsApp
          </a>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-tenue">
            Con Premium tienes acompañamiento: consulta tus dudas directamente con el instructor por WhatsApp.
          </p>
          <Link href="/comprar" className="btn-secundario mt-4 w-full">
            Ver Premium
          </Link>
        </>
      )}
    </div>
  );
}
