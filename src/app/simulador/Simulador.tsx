"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sitio, formatoSoles, PRECIO_DESDE, enlaceDuda } from "@/config/sitio";
import { DOMINIOS, type Dominio, type Modo, type Pregunta, type RespuestaPreguntas } from "@/lib/tipos";

type Fase = "menu" | "cargando" | "en-curso" | "resultados" | "vacio";

interface ProgresoApi {
  indice: number;
  etiqueta: string;
  racha: number;
  respondidas: number;
  errores: number;
}

const SEGUNDOS_POR_PREGUNTA = (sitio.examen.minutosReales * 60) / sitio.examen.preguntasReales;

// Sesiones cortas en los modos de práctica: es más fácil volver mañana que terminar 45 preguntas hoy.
const LIMITE: Record<Modo, number> = {
  diagnostico: 10,
  dominio: 10,
  repaso: 15,
  practica: 15,
  examen: sitio.examen.preguntasReales,
};

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

export default function Simulador({ modoInicial, dominioInicial }: { modoInicial?: Modo; dominioInicial?: Dominio }) {
  const [fase, setFase] = useState<Fase>(modoInicial ? "cargando" : "menu");
  const [error, setError] = useState(false);
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
  const inicio = useRef(0);

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
    setError(false);
    const qs = new URLSearchParams({ modo: m, ...(d ? { dominio: d } : {}) });
    // Índice antes de esta sesión, para mostrar al final cuánto subió.
    fetch("/api/progreso")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setProgresoPrevio(p))
      .catch(() => {});
    try {
      const r = await fetch(`/api/preguntas?${qs}`);
      if (!r.ok) throw new Error();
      const banco = (await r.json()) as RespuestaPreguntas;
      setPremium(banco.premium);
      if (!banco.preguntas.length) {
        setFase("vacio");
        return;
      }
      const seleccion = mezclar(banco.preguntas).slice(0, LIMITE[m]).map(mezclarOpciones);
      setPreguntas(seleccion);
      setRespuestas(seleccion.map(() => null));
      setMarcadas(new Set());
      setActual(0);
      setRestante(Math.round(seleccion.length * SEGUNDOS_POR_PREGUNTA));
      setMensaje("");
      inicio.current = Date.now();
      setFase("en-curso");
      window.history.replaceState(null, "", `/simulador?${qs}`);
    } catch {
      setError(true);
      setFase("menu");
    }
  }, []);

  useEffect(() => {
    if (modoInicial) empezar(modoInicial, dominioInicial);
  }, [modoInicial, dominioInicial, empezar]);

  useEffect(() => {
    if (fase !== "en-curso" || modo !== "examen") return;
    if (restante <= 0) {
      setFase("resultados");
      return;
    }
    const t = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [fase, modo, restante]);

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

      <div className="tarjeta mt-6 p-6 md:p-8">
        <h2 className="text-lg leading-relaxed">{p.enunciado}</h2>
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
                <span className="min-w-0 [overflow-wrap:anywhere]">{op}</span>
              </button>
            );
          })}
        </div>

        {mostrarSolucion && (
          <div className="mt-6 rounded-lg border border-borde bg-fondo p-5 text-sm" role="status">
            <p className={`font-semibold ${elegida === p.correcta ? "text-emerald-400" : "text-red-400"}`}>
              {elegida === p.correcta ? `✓ ${mensaje}` : `✗ ${mensaje} La respuesta es ${String.fromCharCode(65 + p.correcta)}.`}
            </p>
            <p className="mt-2 leading-relaxed text-tenue">{p.explicacion}</p>
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
  if (!sitio.acompanamiento.dudasPorWhatsapp) return null;
  if (!premium) {
    return (
      <Link href="/comprar" className="text-tenue hover:text-texto" title="Disponible en Premium">
        🔒 Preguntarle al instructor
      </Link>
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
}: {
  progreso: ProgresoApi | null;
  error: boolean;
  onEmpezar: (m: Modo, d?: Dominio) => void;
}) {
  const nuevo = progreso !== null && progreso.respondidas === 0;
  const errores = progreso?.errores ?? 0;

  return (
    <div>
      <p className="etiqueta">Simulador</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">¿Qué quieres practicar hoy?</h1>
      {progreso && progreso.respondidas > 0 && (
        <p className="mt-2 text-sm text-tenue">
          Índice de preparación: <strong className="text-texto">{progreso.indice}%</strong> · {progreso.etiqueta}
          {progreso.racha > 0 && <> · 🔥 {progreso.racha} {progreso.racha === 1 ? "día" : "días"} seguidos</>}
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-400">No se pudieron cargar las preguntas. Inténtalo otra vez.</p>}

      {nuevo && (
        <button
          onClick={() => onEmpezar("diagnostico")}
          className="relative mt-8 block w-full overflow-hidden rounded-xl border border-acento/60 bg-panel p-6 text-left"
        >
          <div className="resplandor pointer-events-none absolute inset-0" />
          <span className="relative font-mono text-xs text-acento">recomendado para empezar</span>
          <p className="relative mt-2 text-xl font-semibold">Diagnóstico inicial · 10 preguntas</p>
          <p className="relative mt-1 text-sm text-tenue">Dos preguntas por dominio para saber desde dónde partes.</p>
        </button>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Opcion
          tag="10–15 min"
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
        <Opcion
          tag={`${sitio.examen.preguntasReales} preg. · ${sitio.examen.minutosReales} min`}
          titulo="Simulacro de examen"
          texto="Cronometrado, sin ver respuestas hasta el final y con preguntas marcables, como el día real."
          onClick={() => onEmpezar("examen")}
        />
        {!nuevo && (
          <Opcion
            tag="10 preguntas"
            titulo="Repetir diagnóstico"
            texto="Vuelve a medirte con las mismas 10 preguntas base y compara."
            onClick={() => onEmpezar("diagnostico")}
          />
        )}
      </div>

      <h2 className="mt-10 font-semibold">Practicar por dominio</h2>
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
                <span className="flex-1">{p.enunciado}</span>
              </summary>
              <div className="mt-4 space-y-2 border-t border-borde pt-4 text-sm">
                <p className="text-tenue">
                  Tu respuesta:{" "}
                  <span className="text-texto">{respuestas[i] === null ? "sin responder" : p.opciones[respuestas[i] as number]}</span>
                </p>
                <p className="text-tenue">
                  Correcta: <span className="text-emerald-400">{p.opciones[p.correcta]}</span>
                </p>
                <p className="leading-relaxed text-tenue">{p.explicacion}</p>
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
