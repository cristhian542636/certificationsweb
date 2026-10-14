"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { sitio, formatoSoles, PRECIO_DESDE } from "@/config/sitio";
import { DOMINIOS, type Dominio, type Pregunta, type RespuestaPreguntas } from "@/lib/tipos";

type Modo = "practica" | "examen";
type Fase = "inicio" | "en-curso" | "resultados";

const SEGUNDOS_POR_PREGUNTA = (sitio.examen.minutosReales * 60) / sitio.examen.preguntasReales;

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

export default function Simulador() {
  const [banco, setBanco] = useState<RespuestaPreguntas | null>(null);
  const [error, setError] = useState(false);
  const [fase, setFase] = useState<Fase>("inicio");
  const [modo, setModo] = useState<Modo>("practica");
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [respuestas, setRespuestas] = useState<(number | null)[]>([]);
  const [actual, setActual] = useState(0);
  const [restante, setRestante] = useState(0);
  const inicio = useRef(0);

  useEffect(() => {
    fetch("/api/preguntas")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setBanco)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (fase !== "en-curso" || modo !== "examen") return;
    if (restante <= 0) {
      setFase("resultados");
      return;
    }
    const t = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [fase, modo, restante]);

  function empezar(m: Modo) {
    if (!banco) return;
    const seleccion = mezclar(banco.preguntas).slice(0, sitio.examen.preguntasReales).map(mezclarOpciones);
    setModo(m);
    setPreguntas(seleccion);
    setRespuestas(seleccion.map(() => null));
    setActual(0);
    setRestante(Math.round(seleccion.length * SEGUNDOS_POR_PREGUNTA));
    inicio.current = Date.now();
    setFase("en-curso");
  }

  if (error) return <p className="text-red-400">No se pudieron cargar las preguntas. Recarga la página.</p>;
  if (!banco)
    return (
      <div className="flex items-center gap-3 font-mono text-sm text-tenue">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-borde-fuerte border-t-acento" />
        cargando banco de preguntas…
      </div>
    );

  if (fase === "inicio") return <Inicio banco={banco} onEmpezar={empezar} />;

  if (fase === "resultados") {
    return (
      <Resultados
        modo={modo}
        preguntas={preguntas}
        respuestas={respuestas}
        segundos={Math.round((Date.now() - inicio.current) / 1000)}
        premium={banco.premium}
        onReiniciar={() => setFase("inicio")}
      />
    );
  }

  const p = preguntas[actual];
  const elegida = respuestas[actual];
  const mostrarSolucion = modo === "practica" && elegida !== null;
  const contestadas = respuestas.filter((r) => r !== null).length;

  return (
    <div>
      <div className="flex items-center justify-between font-mono text-xs text-tenue">
        <span>
          <span className="text-texto">{String(actual + 1).padStart(2, "0")}</span> / {preguntas.length} ·{" "}
          {DOMINIOS[p.dominio]}
        </span>
        {modo === "examen" && (
          <span
            className={`rounded-md border px-2.5 py-1 text-sm ${
              restante < 300 ? "border-red-500/50 text-red-400" : "border-borde-fuerte text-texto"
            }`}
          >
            ⏱ {formatoTiempo(restante)}
          </span>
        )}
      </div>
      <div className="mt-3 h-1 rounded-full bg-panel-2">
        <div
          className="h-1 rounded-full bg-acento transition-all"
          style={{ width: `${(contestadas / preguntas.length) * 100}%` }}
        />
      </div>

      <div className="tarjeta mt-6 p-6 md:p-8">
        <h2 className="text-lg leading-relaxed">{p.enunciado}</h2>
        {p.codigo && (
          <pre className="mt-5 overflow-x-auto rounded-lg border border-borde bg-fondo p-4 font-mono text-[13px] leading-6">
            {p.codigo}
          </pre>
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
                onClick={() => setRespuestas((r) => r.map((v, k) => (k === actual ? i : v)))}
                className={`flex w-full gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition ${estilo}`}
              >
                <span className="font-mono text-tenue">{String.fromCharCode(65 + i)}</span>
                <span className="min-w-0 [overflow-wrap:anywhere]">{op}</span>
              </button>
            );
          })}
        </div>

        {mostrarSolucion && (
          <div className="mt-6 rounded-lg border border-borde bg-fondo p-5 text-sm">
            <p className={`font-semibold ${elegida === p.correcta ? "text-emerald-400" : "text-red-400"}`}>
              {elegida === p.correcta
                ? "✓ Correcto"
                : `✗ Incorrecto · la respuesta es ${String.fromCharCode(65 + p.correcta)}`}
            </p>
            <p className="mt-2 leading-relaxed text-tenue">{p.explicacion}</p>
            {p.referencia && (
              <a href={p.referencia} target="_blank" rel="noreferrer" className="mt-3 inline-block text-acento hover:underline">
                Ver documentación oficial →
              </a>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between gap-3">
        <button onClick={() => setActual((a) => a - 1)} disabled={actual === 0} className="btn-secundario">
          ← Anterior
        </button>
        {actual < preguntas.length - 1 ? (
          <button onClick={() => setActual((a) => a + 1)} className="btn-primario">
            Siguiente →
          </button>
        ) : (
          <button
            onClick={() => {
              const faltan = preguntas.length - contestadas;
              if (faltan === 0 || confirm(`Te faltan ${faltan} preguntas. ¿Terminar de todos modos?`)) setFase("resultados");
            }}
            className="btn bg-emerald-500 text-fondo hover:bg-emerald-400"
          >
            Terminar y ver resultados
          </button>
        )}
      </div>
    </div>
  );
}

function Inicio({ banco, onEmpezar }: { banco: RespuestaPreguntas; onEmpezar: (m: Modo) => void }) {
  const total = Math.min(banco.preguntas.length, sitio.examen.preguntasReales);
  return (
    <div>
      <p className="etiqueta">Simulador</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Databricks Data Engineer Associate</h1>
      <p className="mt-2 font-mono text-sm text-tenue">
        {banco.premium
          ? `plan premium · ${banco.preguntas.length} preguntas disponibles`
          : `plan gratis · ${banco.preguntas.length} preguntas de muestra`}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {(
          [
            ["practica", "Modo práctica", "Ves la respuesta y la explicación después de cada pregunta. Sin límite de tiempo.", "aprende"],
            [
              "examen",
              "Modo examen",
              `${total} preguntas en ${formatoTiempo(Math.round(total * SEGUNDOS_POR_PREGUNTA))} minutos. Resultados al final, como el día del examen.`,
              "mide",
            ],
          ] as const
        ).map(([m, titulo, texto, tag]) => (
          <button key={m} onClick={() => onEmpezar(m)} className="tarjeta group p-6 text-left transition hover:border-acento/60">
            <span className="font-mono text-xs text-acento">{tag}</span>
            <p className="mt-2 text-lg font-semibold">{titulo}</p>
            <p className="mt-2 text-sm leading-relaxed text-tenue">{texto}</p>
            <span className="mt-5 inline-block text-sm text-acento transition group-hover:translate-x-1">Empezar →</span>
          </button>
        ))}
      </div>

      {!banco.premium && <BannerPremium />}
    </div>
  );
}

function Resultados({
  modo,
  preguntas,
  respuestas,
  segundos,
  premium,
  onReiniciar,
}: {
  modo: Modo;
  preguntas: Pregunta[];
  respuestas: (number | null)[];
  segundos: number;
  premium: boolean;
  onReiniciar: () => void;
}) {
  const correctas = preguntas.filter((p, i) => respuestas[i] === p.correcta).length;
  const porcentaje = Math.round((correctas / preguntas.length) * 100);
  const aprobado = porcentaje >= sitio.examen.porcentajeAprobacion;

  const porDominio = useMemo(() => {
    const acc: Partial<Record<Dominio, { total: number; ok: number }>> = {};
    preguntas.forEach((p, i) => {
      const d = (acc[p.dominio] ??= { total: 0, ok: 0 });
      d.total++;
      if (respuestas[i] === p.correcta) d.ok++;
    });
    return acc;
  }, [preguntas, respuestas]);

  // Guarda el intento en el historial del usuario (una sola vez).
  const guardado = useRef(false);
  useEffect(() => {
    if (guardado.current) return;
    guardado.current = true;
    fetch("/api/intentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo, total: preguntas.length, correctas, segundos, porDominio }),
    }).catch(() => {});
  }, [modo, preguntas.length, correctas, segundos, porDominio]);

  return (
    <div>
      <p className="etiqueta">Resultados</p>
      <div className="tarjeta mt-4 grid gap-6 p-8 md:grid-cols-[auto_1fr] md:items-center">
        <div
          className={`flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 ${
            aprobado ? "border-emerald-400" : "border-acento/40"
          }`}
        >
          <span className="font-mono text-4xl font-semibold">{porcentaje}%</span>
        </div>
        <div>
          <p className="text-2xl font-semibold">{aprobado ? "¡Nivel de aprobación!" : "Sigue practicando"}</p>
          <p className="mt-2 text-tenue">
            {correctas} de {preguntas.length} correctas · {formatoTiempo(segundos)} min ·{" "}
            {aprobado
              ? "estás listo para este nivel de preguntas."
              : `la meta es ${sitio.examen.porcentajeAprobacion}% o más.`}
          </p>
        </div>
      </div>

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
              <div className="mt-2 h-1.5 rounded-full bg-panel-2">
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
                  <span className="text-texto">
                    {respuestas[i] === null ? "sin responder" : p.opciones[respuestas[i] as number]}
                  </span>
                </p>
                <p className="text-tenue">
                  Correcta: <span className="text-emerald-400">{p.opciones[p.correcta]}</span>
                </p>
                <p className="leading-relaxed text-tenue">{p.explicacion}</p>
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={onReiniciar} className="btn-primario px-5 py-3">
          Nuevo intento
        </button>
        <Link href="/cuenta" className="btn-secundario px-5 py-3">
          Ver mi progreso
        </Link>
      </div>
      {!premium && <BannerPremium />}
    </div>
  );
}

function BannerPremium() {
  return (
    <div className="relative mt-10 overflow-hidden rounded-xl border border-acento/40 bg-panel p-6">
      <div className="resplandor pointer-events-none absolute inset-0" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Desbloquea el banco completo</p>
          <p className="mt-1 text-sm text-tenue">
            Simulacros de {sitio.examen.preguntasReales} preguntas, todas las explicaciones y tu historial.{" "}
            Desde {formatoSoles(PRECIO_DESDE)}, pago único con Yape o tarjeta.
          </p>
        </div>
        <Link href="/comprar" className="btn-primario">
          Pasar a Premium →
        </Link>
      </div>
    </div>
  );
}
