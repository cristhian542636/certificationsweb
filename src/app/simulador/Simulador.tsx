"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sitio } from "@/config/sitio";
import { DOMINIOS, type Pregunta, type RespuestaPreguntas } from "@/lib/tipos";

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

  useEffect(() => {
    fetch("/api/preguntas")
      .then((r) => r.json())
      .then(setBanco)
      .catch(() => setError(true));
  }, []);

  const terminar = () => setFase("resultados");

  useEffect(() => {
    if (fase !== "en-curso" || modo !== "examen") return;
    if (restante <= 0) {
      terminar();
      return;
    }
    const t = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [fase, modo, restante]);

  function empezar(m: Modo) {
    if (!banco) return;
    const seleccion = mezclar(banco.preguntas)
      .slice(0, sitio.examen.preguntasReales)
      .map(mezclarOpciones);
    setModo(m);
    setPreguntas(seleccion);
    setRespuestas(seleccion.map(() => null));
    setActual(0);
    setRestante(Math.round(seleccion.length * SEGUNDOS_POR_PREGUNTA));
    setFase("en-curso");
  }

  if (error) return <p className="text-red-600">No se pudieron cargar las preguntas. Recarga la página.</p>;
  if (!banco) return <p className="text-slate-500">Cargando preguntas…</p>;

  if (fase === "inicio") return <Inicio banco={banco} onEmpezar={empezar} />;

  if (fase === "resultados") {
    return (
      <Resultados
        preguntas={preguntas}
        respuestas={respuestas}
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
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Pregunta {actual + 1} de {preguntas.length} · {DOMINIOS[p.dominio]}
        </span>
        {modo === "examen" && (
          <span className={`font-mono font-semibold ${restante < 300 ? "text-red-600" : ""}`}>
            ⏱ {formatoTiempo(restante)}
          </span>
        )}
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-2 rounded-full bg-orange-600 transition-all"
          style={{ width: `${(contestadas / preguntas.length) * 100}%` }}
        />
      </div>

      <h2 className="mt-8 text-xl font-semibold leading-relaxed">{p.enunciado}</h2>
      {p.codigo && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">{p.codigo}</pre>
      )}

      <div className="mt-6 space-y-3">
        {p.opciones.map((op, i) => {
          let estilo = "border-slate-300 hover:border-orange-500 dark:border-slate-700";
          if (mostrarSolucion) {
            if (i === p.correcta) estilo = "border-green-600 bg-green-50 dark:bg-green-950";
            else if (i === elegida) estilo = "border-red-600 bg-red-50 dark:bg-red-950";
            else estilo = "border-slate-300 opacity-60 dark:border-slate-700";
          } else if (i === elegida) {
            estilo = "border-orange-600 bg-orange-50 dark:bg-orange-950";
          }
          return (
            <button
              key={i}
              disabled={mostrarSolucion}
              onClick={() => setRespuestas((r) => r.map((v, k) => (k === actual ? i : v)))}
              className={`block w-full rounded-lg border-2 px-4 py-3 text-left transition ${estilo}`}
            >
              <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
              {op}
            </button>
          );
        })}
      </div>

      {mostrarSolucion && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className={`font-semibold ${elegida === p.correcta ? "text-green-600" : "text-red-600"}`}>
            {elegida === p.correcta ? "¡Correcto!" : `Incorrecto. La respuesta es ${String.fromCharCode(65 + p.correcta)}.`}
          </p>
          <p className="mt-2 text-slate-700 dark:text-slate-300">{p.explicacion}</p>
          {p.referencia && (
            <a href={p.referencia} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-orange-600 hover:underline">
              Ver documentación →
            </a>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-between gap-3">
        <button
          onClick={() => setActual((a) => a - 1)}
          disabled={actual === 0}
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40 dark:border-slate-700"
        >
          ← Anterior
        </button>
        {actual < preguntas.length - 1 ? (
          <button
            onClick={() => setActual((a) => a + 1)}
            className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={() => {
              const faltan = preguntas.length - contestadas;
              if (faltan === 0 || confirm(`Te faltan ${faltan} preguntas. ¿Terminar de todos modos?`)) terminar();
            }}
            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
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
      <h1 className="text-3xl font-bold">Simulador Databricks Data Engineer Associate</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        {banco.premium
          ? `Acceso completo activo · ${banco.preguntas.length} preguntas disponibles.`
          : `Versión gratuita · ${banco.preguntas.length} preguntas de muestra.`}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <button
          onClick={() => onEmpezar("practica")}
          className="rounded-xl border-2 border-slate-200 p-6 text-left hover:border-orange-500 dark:border-slate-800"
        >
          <p className="text-lg font-semibold">Modo práctica</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Ves la respuesta correcta y la explicación después de cada pregunta. Sin límite de tiempo.
          </p>
        </button>
        <button
          onClick={() => onEmpezar("examen")}
          className="rounded-xl border-2 border-slate-200 p-6 text-left hover:border-orange-500 dark:border-slate-800"
        >
          <p className="text-lg font-semibold">Modo examen</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {total} preguntas con {formatoTiempo(Math.round(total * SEGUNDOS_POR_PREGUNTA))} de tiempo. Ves tus resultados al
            final, igual que en el examen real.
          </p>
        </button>
      </div>

      {!banco.premium && <BannerPremium />}
    </div>
  );
}

function Resultados({
  preguntas,
  respuestas,
  premium,
  onReiniciar,
}: {
  preguntas: Pregunta[];
  respuestas: (number | null)[];
  premium: boolean;
  onReiniciar: () => void;
}) {
  const correctas = preguntas.filter((p, i) => respuestas[i] === p.correcta).length;
  const porcentaje = Math.round((correctas / preguntas.length) * 100);
  const aprobado = porcentaje >= sitio.examen.porcentajeAprobacion;

  const porDominio = useMemo(() => {
    const acc: Record<string, { total: number; ok: number }> = {};
    preguntas.forEach((p, i) => {
      acc[p.dominio] ??= { total: 0, ok: 0 };
      acc[p.dominio].total++;
      if (respuestas[i] === p.correcta) acc[p.dominio].ok++;
    });
    return Object.entries(acc) as [keyof typeof DOMINIOS, { total: number; ok: number }][];
  }, [preguntas, respuestas]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Resultados</h1>
      <div
        className={`mt-6 rounded-xl p-6 ${aprobado ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}
      >
        <p className="text-5xl font-extrabold">{porcentaje}%</p>
        <p className="mt-2">
          {correctas} de {preguntas.length} correctas ·{" "}
          {aprobado
            ? "¡Vas por buen camino!"
            : `Necesitas al menos ${sitio.examen.porcentajeAprobacion}% para estar listo.`}
        </p>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Por dominio</h2>
      <div className="mt-4 space-y-3">
        {porDominio.map(([d, { total, ok }]) => (
          <div key={d}>
            <div className="flex justify-between text-sm">
              <span>{DOMINIOS[d]}</span>
              <span>
                {ok}/{total}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-orange-600" style={{ width: `${(ok / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Revisión</h2>
      <div className="mt-4 space-y-4">
        {preguntas.map((p, i) => {
          const ok = respuestas[i] === p.correcta;
          return (
            <details key={p.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <summary className="cursor-pointer">
                <span className={ok ? "text-green-600" : "text-red-600"}>{ok ? "✓" : "✗"}</span> {p.enunciado}
              </summary>
              <p className="mt-3 text-sm">
                Tu respuesta:{" "}
                {respuestas[i] === null ? "sin responder" : p.opciones[respuestas[i] as number]}
                <br />
                Correcta: <strong>{p.opciones[p.correcta]}</strong>
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.explicacion}</p>
            </details>
          );
        })}
      </div>

      <button
        onClick={onReiniciar}
        className="mt-8 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
      >
        Volver a intentar
      </button>
      {!premium && <BannerPremium />}
    </div>
  );
}

function BannerPremium() {
  return (
    <div className="mt-10 rounded-xl border-2 border-orange-600 p-6">
      <p className="text-lg font-semibold">Desbloquea el simulador completo</p>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Todas las preguntas, modo examen de {sitio.examen.preguntasReales} preguntas y {sitio.producto.duracionAccesoMeses}{" "}
        meses de acceso por S/ {sitio.producto.precioSoles}, pago único con Yape.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/comprar" className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700">
          Comprar con Yape
        </Link>
        <Link href="/activar" className="rounded-lg border border-slate-300 px-4 py-2 dark:border-slate-700">
          Ya tengo un código
        </Link>
      </div>
    </div>
  );
}
