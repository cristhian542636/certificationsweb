"use client";

import { useEffect, useState } from "react";
import { DOMINIOS, type Pregunta } from "@/lib/tipos";
import TextoTecnico from "@/components/TextoTecnico";

const CLAVE = "revision-preguntas";

function leerRevisadas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export default function ListaRevision({ preguntas }: { preguntas: (Pregunta & { gratis: boolean })[] }) {
  // El avance de revisión se guarda solo en este navegador.
  const [revisadas, setRevisadas] = useState<Set<string>>(new Set());
  useEffect(() => setRevisadas(leerRevisadas()), []);

  function alternar(id: string) {
    setRevisadas((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      try {
        localStorage.setItem(CLAVE, JSON.stringify([...n]));
      } catch {}
      return n;
    });
  }

  const hechas = preguntas.filter((p) => revisadas.has(p.id)).length;

  return (
    <div className="mt-8">
      <div className="sticky top-16 z-10 -mx-4 border-b border-borde bg-fondo/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span>
            Revisadas: <strong>{hechas}</strong> de {preguntas.length}
          </span>
          <span className="font-mono text-xs text-tenue">{Math.round((hechas / Math.max(1, preguntas.length)) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-acento/15">
          <div className="h-1.5 rounded-full bg-acento" style={{ width: `${(hechas / Math.max(1, preguntas.length)) * 100}%` }} />
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        {preguntas.map((p) => {
          const ok = revisadas.has(p.id);
          return (
            <li key={p.id} id={p.id} className={`tarjeta scroll-mt-20 p-6 ${ok ? "border-emerald-500/40 opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded bg-panel-2 px-2 py-0.5 text-texto">{p.id}</span>
                <span className="text-tenue">{DOMINIOS[p.dominio]}</span>
                {p.gratis && <span className="rounded bg-acento/15 px-2 py-0.5 text-acento">diagnóstico gratis</span>}
              </div>
              <p className="mt-3 leading-relaxed"><TextoTecnico texto={p.enunciado} /></p>
              {p.codigo && (
                <pre className="mt-3 overflow-x-auto rounded-lg border border-borde bg-fondo p-3 font-mono text-[13px] leading-6">{p.codigo}</pre>
              )}
              <ol className="mt-4 space-y-1.5 text-sm">
                {p.opciones.map((op, i) => (
                  <li
                    key={i}
                    className={`flex gap-3 rounded-md border px-3 py-2 ${
                      i === p.correcta ? "border-emerald-500/60 bg-emerald-500/10" : "border-borde"
                    }`}
                  >
                    <span className="font-mono text-tenue">{String.fromCharCode(65 + i)}</span>
                    <span className="min-w-0 [overflow-wrap:anywhere]"><TextoTecnico texto={op} /></span>
                    {i === p.correcta && <span className="ml-auto shrink-0 text-emerald-400">✓ correcta</span>}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm leading-relaxed text-tenue">
                <strong className="text-texto">Explicación:</strong> <TextoTecnico texto={p.explicacion} />
              </p>
              <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={ok} onChange={() => alternar(p.id)} className="h-4 w-4 accent-acento" />
                Revisada y correcta
              </label>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
