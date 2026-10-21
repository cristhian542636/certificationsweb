"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sitio, formatoSoles, PRECIO_DESDE, enlaceDuda } from "@/config/sitio";
import { DOMINIOS, type Dominio, type Modo, type Pregunta, type RespuestaPreguntas } from "@/lib/tipos";
import TextoTecnico from "@/components/TextoTecnico";

type Fase = "menu" | "cargando" | "en-curso" | "resultados" | "vacio";

interface ProgresoApi {
  indice: number;
  etiqueta: string;
  racha: number;
  respondidas: number;
  errores: number;
  nuevas: number;
  totalBanco: number;
  premium: boolean;
}

const SEGUNDOS_POR_PREGUNTA = (sitio.examen.minutosReales * 60) / sitio.examen.preguntasReales;

const TITULOS: Record<Modo, string> = {
  diagnostico: "Diagnóstico inicial",
  dominio: "Práctica por dominio",
  repaso: "Repaso de errores",
  practica: "Práctica libre",
  examen: "Simulacro de examen",
};

const ACIERTOS = ["¡Correcto!", "¡Exacto!", "¡Bien!", "Eso es.", "¡Muy bien!"];
const FALLOS = [
  "Casi. Esta confunde a muchos.",
  "No era esa, pero ahora ya no se te olvida.",
  "Incorrecto. Lee la explicación: aquí está el aprendizaje.",
];

function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Mezcla las opciones para que la posición de la respuesta correcta no siga un patrón.
function mezclarOpciones(p: Pregunta): Pregunta {
  const orden = mezclar(p.opciones.map((_, i) => i));
  return { ...p, opciones: orden.map((i) => p.opciones[i]), correcta: orden.indexOf(p.correcta) };
}

function formatoTiempo(seg: number) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const azar = (lista: string[]) => lista[Math.floor(Math.random() * lista.length)];

// ── Sesión en curso guardada en el navegador ────────────────────────────────
// Si el alumno sale del simulador (atrás, recarga, un enlace), vuelve a la misma pregunta.
// Se usa sessionStorage (por pestaña) para no mezclar sesiones de distintas cuentas en el mismo equipo.
const CLAVE_SESION = "datacert-sesion-simulador";
const VIGENCIA_MS = 12 * 60 * 60 * 1000;

interface SesionGuardada {
  modo: Modo;
  dominio?: Dominio;
  premium: boolean;
  preguntas: Pregunta[];
  respuestas: (number | null)[];
  marcadas: number[];
  actual: number;
  nuevas: number;
  inicio: number; // ms
  limite: number | null; // ms en que vence el simulacro cronometrado
  guardadoEn: number;
}

function leerSesion(): SesionGuardada | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? "null") as SesionGuardada | null;
    if (!s || Date.now() - s.guardadoEn > VIGENCIA_MS || !s.preguntas?.length) return null;
    return s;
  } catch {
    return null;
  }
}

function guardarSesion(s: Omit<SesionGuardada, "guardadoEn">) {
  try {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ ...s, guardadoEn: Date.now() }));
  } catch {}
}

function borrarSesion() {
  try {
    sessionStorage.removeItem(CLAVE_SESION);
  } catch {}
}

export default function Simulador({
  modoInicial,
  dominioInicial,
  marca,
}: {
  modoInicial?: Modo;
  dominioInicial?: Dominio;
  /** Correo del alumno, visible como marca de agua sobre las preguntas. */
  marca?: string;
}) {
  const [fase, setFase] = useState<Fase>(modoInicial ? "cargando" : "menu");
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>(modoInicial ?? "practica");
  const [dominio, setDominio] = useState<Dominio | undefined>(dominioInicial);
  const [premium, setPremium] = useState(false);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [respuestas, setRespuestas] = useState<(number | null)[]>([]);
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [actual, setActual] = useState(0);
  const [restante, setRestante] = useState(0);
  const [progresoPrevio, setProgresoPrevio] = useState<ProgresoApi | null>(null);
  const [mensaje, setMensaje] = useState<string>("");
  const [nuevas, setNuevas] = useState(0);
  const [pendiente, setPendiente] = useState<SesionGuardada | null>(null);
  const inicio = useRef(0);
  const limite = useRef<number | null>(null);

  // Progreso antes de empezar: permite mostrar cuánto subió el índice al terminar.
  useEffect(() => {
    fetch("/api/progreso")
      .then((r) => (r.ok ? r.json() : null))
      .then(setProgresoPrevio)
      .catch(() => {});
  }, []);

  const empezar = useCallback(async (m: Modo, d?: Dominio) => {
    setFase("cargando");
    setModo(m);
    setDominio(d);
    setError(null);
    const qs = new URLSearchParams({ modo: m, ...(d ? { dominio: d } : {}) });
    // Índice antes de esta sesión, para mostrar al final cuánto subió.
    fetch("/api/progreso")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setProgresoPrevio(p))
      .catch(() => {});
    try {
      const r = await fetch(`/api/preguntas?${qs}`);
      if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? "");
      const banco = (await r.json()) as RespuestaPreguntas;
      setPremium(banco.premium);
      if (!banco.preguntas.length) {
        setFase("vacio");
        return;
      }
      // El servidor ya eligió las preguntas (priorizando las que nunca viste); aquí solo se mezclan las opciones.
      const seleccion = banco.preguntas.map(mezclarOpciones);
      setNuevas(banco.nuevas);
      setPreguntas(seleccion);
      setRespuestas(seleccion.map(() => null));
      setMarcadas(new Set());
      setActual(0);
      setMensaje("");
      inicio.current = Date.now();
      limite.current = m === "examen" ? Date.now() + Math.round(seleccion.length * SEGUNDOS_POR_PREGUNTA) * 1000 : null;
      setRestante(Math.round(seleccion.length * SEGUNDOS_POR_PREGUNTA));
      setPendiente(null);
      borrarSesion();
      setFase("en-curso");
      window.history.replaceState(null, "", `/simulador?${qs}`);
    } catch (e) {
      setError((e instanceof Error && e.message) || "No se pudieron cargar las preguntas. Inténtalo otra vez.");
      setFase("menu");
    }
  }, []);

  const restaurar = useCallback((g: SesionGuardada) => {
    setModo(g.modo);
    setDominio(g.dominio);
    setPremium(g.premium);
    setPreguntas(g.preguntas);
    setRespuestas(g.respuestas);
    setMarcadas(new Set(g.marcadas));
    setActual(g.actual);
    setNuevas(g.nuevas);
    setMensaje("");
    inicio.current = g.inicio;
    limite.current = g.limite;
    setPendiente(null);
    const qs = new URLSearchParams({ modo: g.modo, ...(g.dominio ? { dominio: g.dominio } : {}) });
    window.history.replaceState(null, "", `/simulador?${qs}`);
    // Si el tiempo del simulacro se acabó mientras estaba fuera, va directo a resultados.
    setFase(g.limite !== null && Date.now() >= g.limite ? "resultados" : "en-curso");
  }, []);

  useEffect(() => {
    const guardada = leerSesion();
    if (modoInicial) {
      if (guardada && guardada.modo === modoInicial && guardada.dominio === dominioInicial) restaurar(guardada);
      else empezar(modoInicial, dominioInicial);
    } else {
      setPendiente(guardada);
    }
  }, [modoInicial, dominioInicial, empezar, restaurar]);

  // Guarda el avance mientras la sesión está en curso.
  useEffect(() => {
    if (fase !== "en-curso" || !preguntas.length) return;
    guardarSesion({
      modo,
      dominio,
      premium,
      preguntas,
      respuestas,
      marcadas: [...marcadas],
      actual,
      nuevas,
      inicio: inicio.current,
      limite: limite.current,
    });
  }, [fase, modo, dominio, premium, preguntas, respuestas, marcadas, actual, nuevas]);

  // Al terminar, la sesión ya no se puede retomar.
  useEffect(() => {
    if (fase === "resultados") borrarSesion();
  }, [fase]);

  // Cronómetro basado en la hora de vencimiento: sigue corriendo aunque el alumno salga y vuelva.
  useEffect(() => {
    if (fase !== "en-curso" || modo !== "examen" || limite.current === null) return;
    const tic = () => {
      const r = Math.max(0, Math.ceil((limite.current! - Date.now()) / 1000));
      setRestante(r);
      if (r <= 0) setFase("resultados");
    };
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  }, [fase, modo]);

  // Racha dentro de la sesión (respuestas correctas consecutivas hasta la pregunta actual).
  const seguidas = useMemo(() => {
    let n = 0;
    for (let i = actual; i >= 0; i--) {
      if (respuestas[i] === null || respuestas[i] !== preguntas[i]?.correcta) break;
      n++;
    }
    return n;
  }, [actual, respuestas, preguntas]);

  if (fase === "menu") {
    return (
      <Menu
        progreso={progresoPrevio}
        error={error}
        onEmpezar={empezar}
        pendiente={pendiente}
        onContinuar={() => pendiente && restaurar(pendiente)}
        onDescartar={() => {
          borrarSesion();
          setPendiente(null);
        }}
      />
    );
  }

  if (fase === "cargando") {
    return (
      <div className="flex items-center gap-3 font-mono text-sm text-tenue">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-borde-fuerte border-t-acento" />
        preparando tus preguntas…
      </div>
    );
  }

  if (fase === "vacio") {
    return (
      <div className="tarjeta p-10 text-center">
        <p className="text-4xl" aria-hidden>{modo === "repaso" ? "🎯" : "📭"}</p>
        <h1 className="mt-4 text-2xl font-semibold">
          {modo === "repaso" ? "¡No tienes errores pendientes!" : "No hay preguntas disponibles aquí"}
        </h1>
        <p className="mt-2 text-tenue">
          {modo === "repaso"
            ? "Todo lo que has respondido mal ya lo corregiste. Sigue practicando para descubrir nuevos temas."
            : "Prueba otro modo de práctica."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => setFase("menu")} className="btn-secundario">Elegir otro modo</button>
          <Link href="/panel" className="btn-primario">Ir a mi panel</Link>
        </div>
      </div>
    );
  }

  if (fase === "resultados") {
    return (
      <Resultados
        modo={modo}
        dominio={dominio}
        preguntas={preguntas}
        respuestas={respuestas}
        segundos={Math.round((Date.now() - inicio.current) / 1000)}
        premium={premium}
        progresoPrevio={progresoPrevio}
        onNuevo={() => setFase("menu")}
        onPracticar={(d) => empezar("dominio", d)}
      />
    );
  }

  const p = preguntas[actual];
  const elegida = respuestas[actual];
  const conFeedback = modo !== "examen";
  const mostrarSolucion = conFeedback && elegida !== null;
  const contestadas = respuestas.filter((r) => r !== null).length;

  function responder(i: number) {
    setRespuestas((r) => r.map((v, k) => (k === actual ? i : v)));
    if (conFeedback) setMensaje(i === p.correcta ? azar(ACIERTOS) : azar(FALLOS));
  }

  function ir(i: number) {
    setActual(i);
    setMensaje("");
  }

  function terminar() {
    const faltan = preguntas.length - contestadas;
    const dudas = marcadas.size;
    const aviso = [faltan ? `Te faltan ${faltan} preguntas.` : "", dudas ? `Tienes ${dudas} marcadas para revisar.` : ""]
      .filter(Boolean)
      .join(" ");
    if (!aviso || confirm(`${aviso} ¿Terminar de todos modos?`)) setFase("resultados");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="etiqueta">{TITULOS[modo]}{modo === "dominio" && dominio ? ` · ${DOMINIOS[dominio]}` : ""}</p>
          <p className="mt-1 font-mono text-xs text-tenue">
            <span className="text-texto">{String(actual + 1).padStart(2, "0")}</span> / {preguntas.length} · {DOMINIOS[p.dominio]}
            {nuevas > 0 && modo !== "diagnostico" && (
              <span className="ml-2 text-acento">· {nuevas} {nuevas === 1 ? "pregunta nueva" : "preguntas nuevas"} para ti</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {conFeedback && seguidas >= 3 && (
            <span className="rounded-md border border-oro/40 px-2.5 py-1 font-mono text-xs text-oro">🔥 {seguidas} seguidas</span>
          )}
          {modo === "examen" && (
            <span
              className={`rounded-md border px-2.5 py-1 font-mono text-sm ${
                restante < 300 ? "border-red-500/50 text-red-400" : "border-borde-fuerte text-texto"
              }`}
              aria-live={restante < 300 ? "polite" : "off"}
            >
              ⏱ {formatoTiempo(restante)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 h-1 rounded-full bg-acento/15">
        <div className="h-1 rounded-full bg-acento transition-all" style={{ width: `${(contestadas / preguntas.length) * 100}%` }} />
      </div>

      {modo === "examen" && (
        <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="Navegador de preguntas">
          {preguntas.map((_, i) => {
            const respondida = respuestas[i] !== null;
            const marcada = marcadas.has(i);
            return (
              <button
                key={i}
                onClick={() => ir(i)}
                aria-current={i === actual}
                aria-label={`Pregunta ${i + 1}${respondida ? ", respondida" : ""}${marcada ? ", marcada para revisar" : ""}`}
                className={`relative h-8 w-8 rounded-md border font-mono text-xs transition ${
                  i === actual
                    ? "border-acento text-texto"
                    : respondida
                      ? "border-borde-fuerte bg-panel-2 text-texto"
                      : "border-borde text-tenue hover:border-borde-fuerte"
                }`}
              >
                {i + 1}
                {marcada && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-oro" aria-hidden />}
              </button>
            );
          })}
        </nav>
      )}

      <div className="tarjeta relative mt-6 overflow-hidden p-6 md:p-8">
        {marca && <MarcaDeAgua texto={marca} />}
        <h2 className="text-lg leading-relaxed"><TextoTecnico texto={p.enunciado} /></h2>
        {p.codigo && (
          <pre className="mt-5 overflow-x-auto rounded-lg border border-borde bg-fondo p-4 font-mono text-[13px] leading-6">{p.codigo}</pre>
        )}

        <div className="mt-6 space-y-2.5">
          {p.opciones.map((op, i) => {
            let estilo = "border-borde hover:border-borde-fuerte hover:bg-panel-2";
            if (mostrarSolucion) {
              if (i === p.correcta) estilo = "border-emerald-500/70 bg-emerald-500/10";
              else if (i === elegida) estilo = "border-red-500/70 bg-red-500/10";
              else estilo = "border-borde opacity-50";
            } else if (i === elegida) {
              estilo = "border-acento bg-acento/10";
            }
            return (
              <button
                key={i}
                disabled={mostrarSolucion}
                onClick={() => responder(i)}
                className={`flex w-full gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition ${estilo}`}
              >
                <span className="font-mono text-tenue">{String.fromCharCode(65 + i)}</span>
                <span className="min-w-0 [overflow-wrap:anywhere]"><TextoTecnico texto={op} /></span>
              </button>
            );
          })}
        </div>

        {mostrarSolucion && (
          <div className="mt-6 rounded-lg border border-borde bg-fondo p-5 text-sm" role="status">
            <p className={`font-semibold ${elegida === p.correcta ? "text-emerald-400" : "text-red-400"}`}>
              {elegida === p.correcta ? `✓ ${mensaje}` : `✗ ${mensaje} La respuesta es ${String.fromCharCode(65 + p.correcta)}.`}
            </p>
            <p className="mt-2 leading-relaxed text-tenue"><TextoTecnico texto={p.explicacion} /></p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {p.referencia && (
                <a href={p.referencia} target="_blank" rel="noreferrer" className="text-acento hover:underline">
                  Ver documentación oficial →
                </a>
              )}
              <BotonDuda pregunta={p} premium={premium} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => ir(actual - 1)} disabled={actual === 0} className="btn-secundario">
          ← Anterior
        </button>
        {modo === "examen" && (
          <button
            onClick={() =>
              setMarcadas((m) => {
                const n = new Set(m);
                if (n.has(actual)) n.delete(actual);
                else n.add(actual);
                return n;
              })
            }
            className={`btn border ${marcadas.has(actual) ? "border-oro/60 text-oro" : "border-borde text-tenue hover:text-texto"}`}
          >
            {marcadas.has(actual) ? "★ Marcada" : "☆ Marcar para revisar"}
          </button>
        )}
        {actual < preguntas.length - 1 ? (
          <button onClick={() => ir(actual + 1)} className="btn-primario">
            Siguiente →
          </button>
        ) : (
          <button onClick={terminar} className="btn bg-emerald-500 text-fondo hover:bg-emerald-400">
            Terminar y ver resultados
          </button>
        )}
      </div>
    </div>
  );
}

function BotonDuda({ pregunta, premium }: { pregunta: Pregunta; premium: boolean }) {
  const [aviso, setAviso] = useState(false);
  if (!sitio.acompanamiento.dudasPorWhatsapp) return null;
  if (!premium) {
    // No navega: sacar al alumno a mitad de una sesión interrumpe su práctica.
    return (
      <span className="inline-flex flex-col gap-2">
        <button type="button" onClick={() => setAviso((v) => !v)} className="w-fit text-tenue hover:text-texto" aria-expanded={aviso}>
          🔒 Preguntarle al instructor
        </button>
        {aviso && (
          <span className="rounded-md border border-oro/40 bg-panel px-3 py-2 text-xs leading-relaxed text-tenue">
            Con Premium puedes consultar esta pregunta directamente con {sitio.instructor.nombre.split(" ")[0]} por
            WhatsApp.{" "}
            <a href="/comprar" target="_blank" rel="noreferrer" className="text-oro hover:underline">
              Ver Premium (se abre en otra pestaña) ↗
            </a>
          </span>
        )}
      </span>
    );
  }
  return (
    <a href={enlaceDuda(pregunta.id, DOMINIOS[pregunta.dominio])} target="_blank" rel="noreferrer" className="text-acento hover:underline">
      💬 Preguntarle al instructor
    </a>
  );
}

function Menu({
  progreso,
  error,
  onEmpezar,
  pendiente,
  onContinuar,
  onDescartar,
}: {
  progreso: ProgresoApi | null;
  error: string | null;
  onEmpezar: (m: Modo, d?: Dominio) => void;
  pendiente: SesionGuardada | null;
  onContinuar: () => void;
  onDescartar: () => void;
}) {
  const nuevo = progreso !== null && progreso.respondidas === 0;
  const errores = progreso?.errores ?? 0;
  const premium = progreso?.premium ?? false;
  const nuevas = progreso?.nuevas ?? 0;
  const enPremium = progreso ? Math.max(0, progreso.totalBanco - (progreso.respondidas + nuevas)) : 0;

  return (
    <div>
      <p className="etiqueta">Simulador</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">¿Qué quieres practicar hoy?</h1>
      {progreso && progreso.respondidas > 0 && (
        <p className="mt-2 text-sm text-tenue">
          Índice de preparación: <strong className="text-texto">{progreso.indice}%</strong> · {progreso.etiqueta}
          {progreso.racha > 0 && <> · 🔥 {progreso.racha} {progreso.racha === 1 ? "día seguido" : "días seguidos"}</>}
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {pendiente && (
        <div className="relative mt-8 overflow-hidden rounded-xl border border-acento/60 bg-panel p-6">
          <div className="resplandor pointer-events-none absolute inset-0" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="etiqueta">Tienes una sesión sin terminar</p>
              <p className="mt-2 font-semibold">
                {TITULOS[pendiente.modo]}
                {pendiente.dominio ? ` · ${DOMINIOS[pendiente.dominio]}` : ""}
              </p>
              <p className="mt-1 text-sm text-tenue">
                {pendiente.respuestas.filter((r) => r !== null).length} de {pendiente.preguntas.length} respondidas
                {pendiente.limite !== null &&
                  ` · ${Date.now() < pendiente.limite ? `${formatoTiempo(Math.ceil((pendiente.limite - Date.now()) / 1000))} restantes` : "tiempo agotado"}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={onDescartar} className="btn text-tenue hover:text-texto">Descartar</button>
              <button onClick={onContinuar} className="btn-primario">Continuar donde lo dejé →</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan gratis sin preguntas nuevas: explica qué se repite y qué ofrece Premium */}
      {progreso && !premium && !nuevo && nuevas === 0 && (
        <div className="relative mt-8 overflow-hidden rounded-xl border border-oro/40 bg-panel p-6">
          <p className="font-semibold">Ya respondiste todas las preguntas gratuitas 🎯</p>
          <p className="mt-2 text-sm leading-relaxed text-tenue">
            Puedes repetir el diagnóstico o tus errores para medir tu avance, pero verás las mismas preguntas.
            Premium tiene <strong className="text-texto">{enPremium} preguntas nuevas</strong> y simulacros de{" "}
            {sitio.examen.preguntasReales} preguntas que no se repiten mientras haya preguntas por ver.
          </p>
          <Link href="/comprar" className="btn-primario mt-4">
            Ver Premium · desde {formatoSoles(PRECIO_DESDE)}
          </Link>
        </div>
      )}

      {nuevo && (
        <button
          onClick={() => onEmpezar("diagnostico")}
          className="relative mt-8 block w-full overflow-hidden rounded-xl border border-acento/60 bg-panel p-6 text-left"
        >
          <div className="resplandor pointer-events-none absolute inset-0" />
          <span className="relative font-mono text-xs text-acento">recomendado para empezar</span>
          <p className="relative mt-2 text-xl font-semibold">Diagnóstico inicial · 15 preguntas</p>
          <p className="relative mt-1 text-sm text-tenue">Cubre las 7 secciones del examen según su peso, para saber desde dónde partes.</p>
        </button>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Opcion
          tag={premium && nuevas > 0 ? `15 preguntas · ${Math.min(nuevas, 15)} nuevas` : "15 preguntas"}
          titulo="Práctica libre"
          texto="Preguntas de todos los temas, con la explicación después de cada una."
          onClick={() => onEmpezar("practica")}
        />
        <Opcion
          tag={errores ? `${errores} pendientes` : "sin errores"}
          titulo="Repasar mis errores"
          texto="Vuelve sobre lo que fallaste. Es lo que más rápido sube tu índice."
          onClick={() => onEmpezar("repaso")}
          deshabilitado={errores === 0}
        />
        {premium ? (
          <Opcion
            tag={`${sitio.examen.preguntasReales} preg. · ${sitio.examen.minutosReales} min${nuevas > 0 ? ` · ${Math.min(nuevas, sitio.examen.preguntasReales)} nuevas` : ""}`}
            titulo="Simulacro de examen"
            texto="Cronometrado, con la distribución por sección del examen real. Siempre te damos primero las preguntas que no has visto."
            onClick={() => onEmpezar("examen")}
          />
        ) : (
          <Link href="/comprar" className="tarjeta block p-6 transition hover:border-oro/60">
            <span className="font-mono text-xs text-oro">🔒 Premium</span>
            <p className="mt-2 text-lg font-semibold">Simulacro de examen</p>
            <p className="mt-2 text-sm leading-relaxed text-tenue">
              {sitio.examen.preguntasReales} preguntas en {sitio.examen.minutosReales} minutos, con la distribución por sección del examen
              real y sin repetir preguntas.
            </p>
          </Link>
        )}
        {!nuevo && (
          <Opcion
            tag="15 preguntas"
            titulo="Repetir diagnóstico"
            texto="Vuelve a medirte con las mismas 15 preguntas base y compara tu avance."
            onClick={() => onEmpezar("diagnostico")}
          />
        )}
      </div>

      <h2 className="mt-10 font-semibold">Practicar por sección</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(DOMINIOS) as Dominio[]).map((d) => (
          <button key={d} onClick={() => onEmpezar("dominio", d)} className="btn-secundario">
            {DOMINIOS[d]}
          </button>
        ))}
      </div>

      <p className="mt-10 text-sm text-tenue">
        <Link href="/panel" className="text-acento hover:underline">← Volver a mi panel</Link>
      </p>
    </div>
  );
}

function Opcion(props: { tag: string; titulo: string; texto: string; onClick: () => void; deshabilitado?: boolean }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.deshabilitado}
      className="tarjeta group p-6 text-left transition hover:border-acento/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-borde"
    >
      <span className="font-mono text-xs text-acento">{props.tag}</span>
      <p className="mt-2 text-lg font-semibold">{props.titulo}</p>
      <p className="mt-2 text-sm leading-relaxed text-tenue">{props.texto}</p>
    </button>
  );
}

function Resultados({
  modo,
  dominio,
  preguntas,
  respuestas,
  segundos,
  premium,
  progresoPrevio,
  onNuevo,
  onPracticar,
}: {
  modo: Modo;
  dominio?: Dominio;
  preguntas: Pregunta[];
  respuestas: (number | null)[];
  segundos: number;
  premium: boolean;
  progresoPrevio: ProgresoApi | null;
  onNuevo: () => void;
  onPracticar: (d: Dominio) => void;
}) {
  const correctas = preguntas.filter((p, i) => respuestas[i] === p.correcta).length;
  const porcentaje = Math.round((correctas / preguntas.length) * 100);
  const aprobado = porcentaje >= sitio.examen.porcentajeAprobacion;
  const [progresoNuevo, setProgresoNuevo] = useState<ProgresoApi | null>(null);

  const porDominio = useMemo(() => {
    const acc: Partial<Record<Dominio, { total: number; ok: number }>> = {};
    preguntas.forEach((p, i) => {
      const d = (acc[p.dominio] ??= { total: 0, ok: 0 });
      d.total++;
      if (respuestas[i] === p.correcta) d.ok++;
    });
    return acc;
  }, [preguntas, respuestas]);

  const masDebil = useMemo(() => {
    const lista = Object.entries(porDominio) as [Dominio, { total: number; ok: number }][];
    return lista.sort((a, b) => a[1].ok / a[1].total - b[1].ok / b[1].total)[0];
  }, [porDominio]);

  // Guarda el intento (una sola vez) y luego trae el índice actualizado.
  const guardado = useRef(false);
  useEffect(() => {
    if (guardado.current) return;
    guardado.current = true;
    const detalle = preguntas
      .map((p, i) => (respuestas[i] === null ? null : { pregunta_id: p.id, correcta: respuestas[i] === p.correcta }))
      .filter(Boolean);
    fetch("/api/intentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo, total: preguntas.length, correctas, segundos, porDominio, respuestas: detalle }),
    })
      .then(() => fetch("/api/progreso"))
      .then((r) => (r.ok ? r.json() : null))
      .then(setProgresoNuevo)
      .catch(() => {});
  }, [modo, preguntas, respuestas, correctas, segundos, porDominio]);

  const delta = progresoNuevo && progresoPrevio ? progresoNuevo.indice - progresoPrevio.indice : null;
  const titulo =
    modo === "diagnostico"
      ? "Tu punto de partida"
      : aprobado
        ? "¡Nivel de aprobación!"
        : porcentaje >= 50
          ? "Vas por buen camino"
          : "Cada error de hoy es un acierto en el examen";

  return (
    <div>
      <p className="etiqueta">Resultados · {TITULOS[modo]}</p>
      <div className="tarjeta mt-4 grid gap-6 p-8 md:grid-cols-[auto_1fr] md:items-center">
        <div
          className={`flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 ${
            aprobado ? "border-emerald-400" : "border-acento/40"
          }`}
        >
          <span className="text-4xl font-semibold">{porcentaje}%</span>
        </div>
        <div>
          <p className="text-2xl font-semibold">{titulo}</p>
          <p className="mt-2 text-tenue">
            {correctas} de {preguntas.length} correctas · {formatoTiempo(segundos)} min
          </p>
          {progresoNuevo && (
            <p className="mt-3 text-sm">
              Índice de preparación: <strong>{progresoNuevo.indice}%</strong>
              {delta !== null && delta > 0 && <span className="ml-2 font-semibold text-emerald-400">▲ +{delta} puntos</span>}
              {delta === 0 && <span className="ml-2 text-tenue">(sin cambios)</span>}
              {progresoNuevo.racha > 1 && <span className="ml-2 text-tenue">· 🔥 {progresoNuevo.racha} días seguidos</span>}
            </p>
          )}
        </div>
      </div>

      {/* Plan de acción: un siguiente paso concreto según lo que acaba de pasar */}
      {masDebil && masDebil[1].ok < masDebil[1].total && (
        <div className="relative mt-6 overflow-hidden rounded-xl border border-acento/50 bg-panel p-6">
          <div className="resplandor pointer-events-none absolute inset-0" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="etiqueta">Tu siguiente paso</p>
              <p className="mt-2 font-semibold">
                Refuerza {DOMINIOS[masDebil[0]]}: acertaste {masDebil[1].ok} de {masDebil[1].total}.
              </p>
              <p className="mt-1 text-sm text-tenue">
                {premium
                  ? "Una práctica corta de este tema es lo que más va a subir tu índice."
                  : "Las preguntas gratis son una muestra: Premium tiene el banco completo de este tema."}
              </p>
            </div>
            {premium ? (
              <button onClick={() => onPracticar(masDebil[0])} className="btn-primario">
                Practicar {DOMINIOS[masDebil[0]]} →
              </button>
            ) : (
              <Link href="/comprar" className="btn-primario">
                Ver Premium · desde {formatoSoles(PRECIO_DESDE)}
              </Link>
            )}
          </div>
        </div>
      )}

      <h2 className="mt-10 font-semibold">Por dominio</h2>
      <div className="tarjeta mt-4 space-y-4 p-6">
        {(Object.entries(porDominio) as [Dominio, { total: number; ok: number }][]).map(([d, { total, ok }]) => {
          const pct = Math.round((ok / total) * 100);
          return (
            <div key={d}>
              <div className="flex justify-between text-sm">
                <span>{DOMINIOS[d]}</span>
                <span className="font-mono text-tenue">
                  {ok}/{total} · {pct}%
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-acento/15">
                <div
                  className={`h-1.5 rounded-full ${pct >= sitio.examen.porcentajeAprobacion ? "bg-emerald-400" : "bg-acento"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 font-semibold">Revisión</h2>
      <div className="mt-4 space-y-2">
        {preguntas.map((p, i) => {
          const ok = respuestas[i] === p.correcta;
          return (
            <details key={p.id} className="tarjeta group px-5 py-4">
              <summary className="flex cursor-pointer list-none gap-3 text-sm">
                <span className={`font-mono ${ok ? "text-emerald-400" : "text-red-400"}`}>{ok ? "✓" : "✗"}</span>
                <span className="flex-1"><TextoTecnico texto={p.enunciado} /></span>
              </summary>
              <div className="mt-4 space-y-2 border-t border-borde pt-4 text-sm">
                <p className="text-tenue">
                  Tu respuesta:{" "}
                  <span className="text-texto">{respuestas[i] === null ? "sin responder" : <TextoTecnico texto={p.opciones[respuestas[i] as number]} />}</span>
                </p>
                <p className="text-tenue">
                  Correcta: <span className="text-emerald-400"><TextoTecnico texto={p.opciones[p.correcta]} /></span>
                </p>
                <p className="leading-relaxed text-tenue"><TextoTecnico texto={p.explicacion} /></p>
                {!ok && <BotonDuda pregunta={p} premium={premium} />}
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={onNuevo} className="btn-primario px-5 py-3">
          Seguir practicando
        </button>
        <Link href="/panel" className="btn-secundario px-5 py-3">
          Ver mi panel
        </Link>
      </div>
    </div>
  );
}

// Marca de agua tenue con el correo del alumno: desalienta compartir capturas del contenido premium.
function MarcaDeAgua({ texto }: { texto: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
      <div className="absolute -inset-1/2 flex -rotate-[20deg] flex-wrap content-center gap-x-16 gap-y-20 font-mono text-xs text-texto/[0.05]">
        {Array.from({ length: 40 }, (_, i) => (
          <span key={i}>{texto}</span>
        ))}
      </div>
    </div>
  );
}
