import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sitio, enlaceWhatsApp, formatoSoles, PRECIO_DESDE } from "@/config/sitio";
import { SITE_URL } from "@/lib/entorno";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerProgreso } from "@/lib/progreso-servidor";
import { calcularRango, diasEntre, examenTerminado, horaFinExamen, hoyLima, RANGOS, siguientePaso, type Progreso, type ProgresoDominio } from "@/lib/progreso";
import { DOMINIOS, PESOS } from "@/lib/tipos";
import { AnilloPreparacion, Medalla, Medidor, Racha } from "@/components/progreso/Indicadores";
import { CredencialAprobado, EditarFecha, PreguntarResultado, RegistrarResultado, ReiniciarMeta } from "@/components/progreso/Meta";
import Garantia, { type EstadoGarantia } from "@/components/progreso/Garantia";
import { garantiaDelAlumno } from "@/lib/garantia";
import { Insignia, TarjetaInsignia } from "@/components/progreso/Insignia";
import { CERT_ACTUAL } from "@/config/certificaciones";
import { clienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Mi panel" };
export const dynamic = "force-dynamic";

const EXAMEN = { preguntas: sitio.examen.preguntasReales, correctasAprobacion: sitio.examen.correctasAprobacion };
/** Preguntas del diagnóstico gratis. */
const DIAGNOSTICO = 15;
const COLOR_RANGO = { bronce: "text-bronce", plata: "text-plata", oro: "text-oro" } as const;

const fechaIso = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", timeZone: "America/Lima" });

const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", { day: "numeric", month: "long", timeZone: "UTC" });

// El panel muestra solo lo que sirve en cada etapa:
// - Sin práctica (gratis o Premium): una sola tarjeta para empezar el diagnóstico.
// - Gratis con diagnóstico: su resultado, una oferta Premium basada en su sección más débil y sus secciones.
// - Premium: índice, la práctica de hoy, sus secciones, racha e instructor.
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
  const horaExamen = perfil?.hora_examen ?? null;
  // Con hora: puede contar cómo le fue apenas termina el examen; sin hora, desde el día siguiente.
  const terminado = perfil?.fecha_examen ? examenTerminado(perfil.fecha_examen, horaExamen, CERT_ACTUAL.examen.minutos) : false;
  const empezo = progreso.respondidas > 0;

  // Garantía: solo relevante para quien no aprobó y tuvo acceso pagado.
  const datosGarantia = await garantiaDelAlumno(sesion);
  const garantia: EstadoGarantia | undefined = datosGarantia ? datosGarantia.estado : undefined;
  // Credencial: solo para quien registró que aprobó.
  let credencial: string | null = null;
  if (perfil?.resultado_examen) {
    const supabase = await clienteServidor();
    if (perfil.resultado_examen === "aprobado") {
      const { data } = await supabase.from("perfiles").select("insignia_url").eq("id", sesion.usuario.id).maybeSingle();
      credencial = (data?.insignia_url as string | null) ?? null;
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="etiqueta">Mi camino a la certificación</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Hola, {nombre} 👋</h1>
      <Cuenta
        diasExamen={diasExamen}
        terminado={terminado}
        hora={horaExamen}
        fecha={perfil?.fecha_examen ?? null}
        resultado={perfil?.resultado_examen ?? null}
        pedirFecha={sesion.premium}
        registrar={empezo}
      />

      <BloqueExamen
        diasExamen={diasExamen}
        terminado={terminado}
        resultado={perfil?.resultado_examen ?? null}
        progreso={progreso}
        garantia={garantia}
        credencial={credencial}
      />

      {!empezo ? (
        <EmpezarDiagnostico />
      ) : sesion.premium ? (
        <PanelPremium progreso={progreso} hoy={hoy} diasExamen={diasExamen} />
      ) : (
        <PanelGratis
          progreso={progreso}
          diasExamen={diasExamen}
          // Tuvo Premium: su acceso venció o practicó más allá del diagnóstico gratis.
          expremium={Boolean(sesion.accesoHasta) || progreso.respondidas > DIAGNOSTICO}
          vencio={sesion.accesoHasta}
          garantia={datosGarantia?.abierta ? datosGarantia.estado : undefined}
        />
      )}
    </div>
  );
}

function EmpezarDiagnostico() {
  return (
    <div className="relative mt-8 overflow-hidden rounded-xl border border-acento/50 bg-panel p-8 md:p-10">
      <div className="resplandor pointer-events-none absolute inset-0" />
      <div className="relative max-w-xl">
        <p className="etiqueta">Tu primer paso</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Empieza por tu diagnóstico</h2>
        <p className="mt-3 leading-relaxed text-tenue">
          15 preguntas que cubren las 7 secciones del examen. En unos 20 minutos sabrás desde dónde partes y qué reforzar.
          Es gratis.
        </p>
        <Link href="/simulador?modo=diagnostico" className="btn-primario mt-6 px-6 py-3 text-[15px]">
          Empezar mi diagnóstico →
        </Link>
      </div>
    </div>
  );
}

/** Sección más débil: la que más le falta, ponderada por su peso en el examen. */
function seccionDebil(progreso: Progreso) {
  return [...progreso.dominios]
    .filter((d) => d.respondidas > 0)
    .sort((a, b) => (1 - b.precision) * PESOS[b.dominio] - (1 - a.precision) * PESOS[a.dominio])[0];
}

function PanelGratis({
  progreso,
  diasExamen,
  expremium,
  vencio,
  garantia,
}: {
  progreso: Progreso;
  diasExamen: number | null;
  /** Tuvo Premium: se le muestra su progreso y se le invita a retomarlo, no la oferta de la primera compra. */
  expremium: boolean;
  vencio: string | null;
  /** Garantía que puede solicitar o que está pendiente: en lugar de renovar, se le lleva a ella. */
  garantia?: EstadoGarantia;
}) {
  const correctas = progreso.dominios.reduce((s, d) => s + d.correctas, 0);
  const debil = seccionDebil(progreso);
  const totalBanco = progreso.dominios.reduce((s, d) => s + d.totalBanco, 0);
  const rango = calcularRango(progreso, EXAMEN).actual;
  // La garantía exige simulacros antes del examen: no se ofrece el mismo día ni después.
  const conGarantia = diasExamen === null || diasExamen > 0;
  const porVer = Math.max(0, totalBanco - progreso.respondidas);

  return (
    <>
      <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="tarjeta p-8">
          {expremium ? (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-tenue">Tu progreso</p>
              <p className="mt-4 font-mono text-5xl font-semibold">
                {progreso.indice}
                <span className="text-2xl text-tenue">%</span>
              </p>
              <p className="mt-2 text-tenue">índice de preparación · {progreso.respondidas} preguntas practicadas</p>
            </>
          ) : (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-tenue">Tu diagnóstico</p>
              <p className="mt-4 font-mono text-5xl font-semibold">
                {correctas}
                <span className="text-2xl text-tenue">/{progreso.respondidas}</span>
              </p>
              <p className="mt-2 text-tenue">respuestas correctas</p>
            </>
          )}
          {rango !== "ninguno" && (
            <p className="mt-4 flex items-center gap-2 text-sm">
              <Insignia rango={rango} tamano={22} /> {expremium ? "Tu insignia" : "Ganaste tu insignia"}{" "}
              <strong className={COLOR_RANGO[rango]}>{RANGOS[rango].nombre}</strong>
            </p>
          )}
          {debil && (
            <p className="mt-5 border-t border-borde pt-5 text-sm leading-relaxed">
              Tu sección más débil: <strong>{DOMINIOS[debil.dominio]}</strong>{" "}
              <span className="text-tenue">({PESOS[debil.dominio]}% del examen)</span>.
            </p>
          )}
          <Link href="/simulador?modo=diagnostico" className="mt-4 inline-block text-sm text-acento hover:underline">
            Repetir mi diagnóstico
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-oro/50 bg-panel p-8">
          <div className="resplandor pointer-events-none absolute inset-0" />
          <div className="relative">
            <p className="etiqueta !text-oro">Tu siguiente paso</p>
            {garantia !== undefined ? (
              <>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  {garantia === "pendiente" ? "Estamos revisando tu garantía" : "Solicita tu garantía"}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-tenue">
                  {garantia === "pendiente"
                    ? `Cuando la aprobemos, tu acceso Premium vuelve por ${sitio.garantia.dias} días sin costo y sigues donde lo dejaste. No necesitas renovar.`
                    : `Cumples las condiciones: te devolvemos ${sitio.garantia.dias} días de Premium sin costo para tu siguiente intento. No necesitas renovar.`}
                </p>
                {garantia === null && (
                  <a href="#garantia" className="btn-primario mt-6 px-5 py-3 text-[15px]">
                    Solicitar mi garantía ↑
                  </a>
                )}
              </>
            ) : expremium ? (
              <>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">Retoma donde lo dejaste</h2>
                <p className="mt-3 text-sm leading-relaxed text-tenue">
                  {vencio ? `Tu acceso Premium venció el ${fechaIso(vencio)}. ` : ""}Tu progreso sigue guardado: al renovar
                  continúas con tu historial, tu insignia y tus errores por repasar.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-tenue">
                  {progreso.errores.length > 0 && (
                    <li>
                      ✓ <strong className="text-texto">{progreso.errores.length} errores</strong> por repasar
                    </li>
                  )}
                  {porVer > 0 && (
                    <li>
                      ✓ <strong className="text-texto">{porVer} preguntas</strong> que aún no has visto
                    </li>
                  )}
                  {debil && <li>✓ Práctica enfocada en {DOMINIOS[debil.dominio]}</li>}
                </ul>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  {debil ? `Refuerza ${DOMINIOS[debil.dominio]}` : "Sigue practicando con Premium"}
                </h2>
                <ul className="mt-4 space-y-2 text-sm text-tenue">
                  {debil && (
                    <li>
                      ✓ <strong className="text-texto">{debil.totalBanco} preguntas</strong> de esta sección, explicadas en español
                    </li>
                  )}
                  <li>
                    ✓ Simulacros de {sitio.examen.preguntasReales} preguntas como el examen real ({totalBanco} en total)
                  </li>
                  <li>✓ Cada pregunta en español o en {sitio.examen.idioma}, como el día del examen</li>
                  {conGarantia && (
                    <li>
                      ✓ Si no apruebas, +{sitio.garantia.dias} días sin costo (con {sitio.garantia.minimoSimulacros} simulacros
                      completos antes de tu examen)
                    </li>
                  )}
                </ul>
              </>
            )}
            {garantia === undefined && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/comprar" className="btn bg-oro px-5 py-3 font-semibold text-fondo hover:bg-oro/90">
                  {expremium ? "Renovar mi acceso →" : "Pasar a Premium →"}
                </Link>
                <span className="text-sm text-tenue">desde {formatoSoles(PRECIO_DESDE)}, pago único</span>
                {!expremium && (
                  <p className="w-full text-xs text-tenue">
                    Si no apruebas el examen oficial, repetirlo cuesta otros USD {sitio.examen.costoUsd}.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Secciones dominios={progreso.dominios} practicar={false} />
    </>
  );
}

/** Desde cuántos días antes del examen se recomienda practicar en inglés. */
const DIAS_PRACTICA_EN_INGLES = 21;

function PanelPremium({ progreso, hoy, diasExamen }: { progreso: Progreso; hoy: string; diasExamen: number | null }) {
  const paso = siguientePaso(progreso, true);
  const rectaFinal = diasExamen !== null && diasExamen >= 0 && diasExamen <= DIAS_PRACTICA_EN_INGLES;
  return (
    <>
      <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
        <div className="tarjeta flex flex-col items-center justify-center p-6 text-center">
          <AnilloPreparacion indice={progreso.indice} etiqueta={progreso.etiqueta} tamano={150} />
          <p className="mt-3 text-xs text-tenue">
            Apunta a <strong className="text-texto">85%</strong> antes del examen.
          </p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-acento/50 bg-panel p-8">
          <div className="resplandor pointer-events-none absolute inset-0" />
          <div className="relative">
            <p className="etiqueta">Tu práctica de hoy</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{paso.titulo}</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-tenue">{paso.texto}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href={paso.href} className="btn-primario px-5 py-3">
                {paso.cta} →
              </Link>
              {paso.href !== "/simulador?modo=examen" && (
                <Link href="/simulador?modo=examen" className="text-sm text-acento hover:underline">
                  o haz un simulacro completo ({sitio.examen.preguntasReales} preguntas · {sitio.examen.minutosReales} min)
                </Link>
              )}
            </div>
            {rectaFinal && (
              <p className="mt-5 text-sm text-tenue">
                <span className="mr-1.5 rounded bg-acento/15 px-1.5 py-0.5 font-mono text-xs text-acento">EN</span>
                Recta final: haz tus simulacros en inglés, como el examen real. Cambia el idioma con el botón ES/EN del
                simulador.
              </p>
            )}
          </div>
        </div>
      </div>

      <Secciones dominios={progreso.dominios} practicar />

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
        <TarjetaInsignia estado={calcularRango(progreso, EXAMEN)} premium />
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
        <Acompanamiento />
      </div>
    </>
  );
}

/** Lista compacta de las 7 secciones; con Premium cada una tiene su acceso a práctica. */
function Secciones({ dominios, practicar }: { dominios: ProgresoDominio[]; practicar: boolean }) {
  return (
    <section className="tarjeta mt-8 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Tus secciones</h2>
        <p className="text-xs text-tenue">{practicar ? "Toca una sección para practicarla" : "Bronce → Plata → Oro"}</p>
      </div>
      <ul className="mt-4 grid gap-x-8 md:grid-cols-2 [&>*]:min-w-0">
        {dominios.map((d) => {
          const contenido = (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{DOMINIOS[d.dominio]}</span>
                  <Medalla nivel={d.nivel} />
                </div>
                <div className="mt-2">
                  <Medidor valor={d.puntaje} etiqueta={`Dominio de ${DOMINIOS[d.dominio]}`} />
                </div>
              </div>
              {practicar && (
                <span aria-hidden className="text-lg text-tenue transition group-hover:translate-x-0.5 group-hover:text-acento">
                  ›
                </span>
              )}
            </>
          );
          return (
            <li key={d.dominio} className="border-b border-borde last:border-0">
              {practicar ? (
                <Link
                  href={`/simulador?modo=dominio&dominio=${d.dominio}`}
                  aria-label={`Practicar ${DOMINIOS[d.dominio]}`}
                  className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-panel-2"
                >
                  {contenido}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-3">{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Cuenta({
  diasExamen,
  terminado,
  hora,
  fecha,
  resultado,
  pedirFecha,
  registrar,
}: {
  diasExamen: number | null;
  terminado: boolean;
  hora: string | null;
  fecha: string | null;
  resultado: string | null;
  /** Solo se invita a definir la fecha cuando ya está practicando en serio (Premium). */
  pedirFecha: boolean;
  /** Quien ya practica puede registrar que rindió el examen aunque no haya puesto fecha. */
  registrar: boolean;
}) {
  if (resultado) return null;
  if (diasExamen === null || !fecha) {
    if (!pedirFecha) {
      return registrar ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <RegistrarResultado />
        </div>
      ) : null;
    }
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3 text-tenue">
        <span>Ponle fecha a tu meta: quien agenda su examen, lo da.</span>
        <EditarFecha fecha={null} texto="Definir fecha de examen" />
        {registrar && <RegistrarResultado />}
      </div>
    );
  }
  if (terminado || diasExamen < 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-tenue">
      <span>
        {diasExamen === 0 ? (
          <>
            <strong className="text-texto">¡Hoy es tu examen{hora ? ` a las ${hora}` : ""}! Mucha suerte 💪</strong>
            {hora && <> Desde las {horaFinExamen(hora, CERT_ACTUAL.examen.minutos)} podrás contarnos cómo te fue.</>}
          </>
        ) : (
          <>
            Faltan <strong className="text-texto">{diasExamen} {diasExamen === 1 ? "día" : "días"}</strong> para tu examen (
            {fechaLarga(fecha)}
            {hora ? ` · ${hora}` : ""})
          </>
        )}
      </span>
      <EditarFecha fecha={fecha} hora={hora} texto={!hora && diasExamen <= 7 ? "Agregar la hora del examen" : "Cambiar fecha"} />
      {registrar && diasExamen > 0 && <RegistrarResultado />}
    </div>
  );
}

function BloqueExamen({
  diasExamen,
  terminado,
  resultado,
  progreso,
  garantia,
  credencial,
}: {
  diasExamen: number | null;
  /** Ya pasó la hora de fin del examen (o el día, si no indicó hora). */
  terminado: boolean;
  resultado: "aprobado" | "no_aprobado" | null;
  progreso: Progreso;
  /** undefined: no aplica (nunca tuvo acceso pagado). */
  garantia?: EstadoGarantia;
  /** Enlace de la credencial digital de quien aprobó. */
  credencial: string | null;
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
          <div className="mt-5">
            <CredencialAprobado enlace={credencial} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={compartir} target="_blank" rel="noreferrer" className="btn-primario">
              Compartir en LinkedIn
            </a>
            <Link href="/cuenta#invitar" className="btn-secundario">
              Invita a tus colegas
            </Link>
            <ReiniciarMeta />
          </div>
          <a
            href={enlaceWhatsApp(`¡Hola ${sitio.instructor.nombre.split(" ")[0]}! Aprobé mi certificación Databricks. Te cuento mi experiencia con ${sitio.nombre}: `)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm text-acento hover:underline"
          >
            Cuéntale tu experiencia a {sitio.instructor.nombre.split(" ")[0]} →
          </a>
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
          <div id="garantia" className="mt-5 scroll-mt-24">
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

  if (terminado) {
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

// Acompañamiento del instructor (Premium): también es el lugar de la ayuda por WhatsApp.
function Acompanamiento() {
  const { dudasPorWhatsapp, tiempoRespuesta } = sitio.acompanamiento;
  if (!dudasPorWhatsapp) return null;
  return (
    <div className="tarjeta p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-tenue">Tu instructor</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-borde-fuerte bg-panel-2 font-mono text-acento">
          {sitio.instructor.iniciales}
        </span>
        <div>
          <p className="font-semibold">{sitio.instructor.nombre}</p>
          <p className="text-xs text-tenue">{sitio.instructor.titulo}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-tenue">
        ¿Una pregunta no te quedó clara o tienes un problema con tu cuenta? Escríbeme y te respondo {tiempoRespuesta}.
      </p>
      <a
        href={enlaceWhatsApp(`Hola ${sitio.instructor.nombre.split(" ")[0]}, tengo Premium en ${sitio.nombre}. `)}
        target="_blank"
        rel="noreferrer"
        className="btn-secundario mt-4 w-full"
      >
        Escribirle por WhatsApp
      </a>
    </div>
  );
}
