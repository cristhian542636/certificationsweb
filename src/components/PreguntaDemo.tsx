"use client";

import Link from "next/link";
import { useState } from "react";
import type { Pregunta } from "@/lib/tipos";
import TextoTecnico from "./TextoTecnico";

// Una pregunta gratuita para que el visitante pruebe el simulador sin registrarse.
export default function PreguntaDemo({ pregunta }: { pregunta: Pregunta }) {
  const [elegida, setElegida] = useState<number | null>(null);
  const respondida = elegida !== null;

  return (
    <div className="tarjeta overflow-hidden">
      <div className="flex items-center justify-between border-b border-borde bg-panel-2 px-5 py-3 font-mono text-xs text-tenue">
        <span>pregunta_demo.sql</span>
        <span>1 / 45</span>
      </div>
      <div className="p-5 md:p-6">
        <p className="text-[15px] leading-relaxed"><TextoTecnico texto={pregunta.enunciado} /></p>
        <div className="mt-5 space-y-2.5">
          {pregunta.opciones.map((op, i) => {
            let estilo = "border-borde hover:border-borde-fuerte hover:bg-panel-2";
            if (respondida) {
              if (i === pregunta.correcta) estilo = "border-emerald-500/70 bg-emerald-500/10";
              else if (i === elegida) estilo = "border-red-500/70 bg-red-500/10";
              else estilo = "border-borde opacity-50";
            }
            return (
              <button
                key={i}
                disabled={respondida}
                onClick={() => setElegida(i)}
                className={`flex w-full gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${estilo}`}
              >
                <span className="font-mono text-tenue">{String.fromCharCode(65 + i)}</span>
                <span className="min-w-0 font-mono text-[13px] [overflow-wrap:anywhere]"><TextoTecnico texto={op} /></span>
              </button>
            );
          })}
        </div>
        {respondida && (
          <div className="mt-5 rounded-lg border border-borde bg-fondo p-4 text-sm">
            <p className={elegida === pregunta.correcta ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>
              {elegida === pregunta.correcta ? "✓ Correcto" : "✗ Incorrecto"}
            </p>
            <p className="mt-2 leading-relaxed text-tenue"><TextoTecnico texto={pregunta.explicacion} /></p>
            <Link href="/registro" className="btn-primario mt-4">
              Seguir practicando gratis →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
