"use client";

import { useEffect, useRef, useState } from "react";
import { hoyLima } from "@/lib/progreso";

// Calendario propio (en lugar de <input type="date">): mismo comportamiento en todos los navegadores,
// fechas anteriores a `min` deshabilitadas y un "Restablecer" que siempre funciona.

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const aIso = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function fechaLegible(iso: string) {
  const t = new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function SelectorFecha({
  valor,
  onCambio,
  min,
  etiqueta = "Fecha de tu examen",
  textoVacio = "Elegir fecha",
}: {
  valor: string; // YYYY-MM-DD o ""
  onCambio: (valor: string) => void;
  min?: string;
  etiqueta?: string;
  textoVacio?: string;
}) {
  const hoy = hoyLima();
  const minimo = min ?? hoy;
  const [abierto, setAbierto] = useState(false);
  const base = valor || minimo;
  const [anio, setAnio] = useState(Number(base.slice(0, 4)));
  const [mes, setMes] = useState(Number(base.slice(5, 7)) - 1);
  const contenedor = useRef<HTMLDivElement>(null);

  // Al abrir, el calendario muestra el mes de la fecha elegida (o el de hoy).
  useEffect(() => {
    if (!abierto) return;
    const b = valor || minimo;
    setAnio(Number(b.slice(0, 4)));
    setMes(Number(b.slice(5, 7)) - 1);
  }, [abierto, valor, minimo]);

  // Cierra con clic afuera o Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const primerDia = (new Date(Date.UTC(anio, mes, 1)).getUTCDay() + 6) % 7; // lunes = 0
  const diasMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const celdas: (number | null)[] = [...Array(primerDia).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  const mesMinimo = minimo.slice(0, 7);
  const mesActual = aIso(anio, mes, 1).slice(0, 7);

  function mover(delta: number) {
    const d = new Date(Date.UTC(anio, mes + delta, 1));
    setAnio(d.getUTCFullYear());
    setMes(d.getUTCMonth());
  }

  function elegir(iso: string) {
    if (iso < minimo) return;
    onCambio(iso);
    setAbierto(false);
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={`${etiqueta}: ${valor ? fechaLegible(valor) : "sin elegir"}`}
        className="campo flex items-center justify-between gap-3 text-left"
      >
        <span className={valor ? "text-texto" : "text-tenue"}>{valor ? fechaLegible(valor) : textoVacio}</span>
        <span aria-hidden className="text-tenue">📅</span>
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label={etiqueta}
          className="absolute left-0 z-30 mt-2 w-[19rem] rounded-xl border border-borde-fuerte bg-panel p-4 shadow-2xl shadow-black/50"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => mover(-1)}
              disabled={mesActual <= mesMinimo}
              aria-label="Mes anterior"
              className="flex h-8 w-8 items-center justify-center rounded-md text-tenue hover:bg-panel-2 hover:text-texto disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ‹
            </button>
            <p className="text-sm font-semibold capitalize" aria-live="polite">
              {MESES[mes]} {anio}
            </p>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Mes siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-md text-tenue hover:bg-panel-2 hover:text-texto"
            >
              ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-tenue" aria-hidden>
            {DIAS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {celdas.map((dia, i) => {
              if (dia === null) return <span key={`v${i}`} />;
              const iso = aIso(anio, mes, dia);
              const pasado = iso < minimo;
              const elegido = iso === valor;
              const esHoy = iso === hoy;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={pasado}
                  onClick={() => elegir(iso)}
                  aria-label={`${fechaLegible(iso)}${pasado ? " (no disponible)" : ""}`}
                  aria-pressed={elegido}
                  className={`h-9 rounded-md text-sm transition ${
                    elegido
                      ? "bg-acento font-semibold text-fondo"
                      : pasado
                        ? "cursor-not-allowed text-tenue/30 line-through"
                        : "text-texto hover:bg-panel-2"
                  } ${esHoy && !elegido ? "ring-1 ring-acento/60" : ""}`}
                >
                  {dia}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-borde pt-3 text-sm">
            <button
              type="button"
              onClick={() => {
                onCambio("");
                setAbierto(false);
              }}
              className="text-tenue hover:text-texto"
            >
              Restablecer
            </button>
            <button type="button" onClick={() => elegir(hoy)} disabled={hoy < minimo} className="text-acento hover:underline disabled:opacity-40">
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
