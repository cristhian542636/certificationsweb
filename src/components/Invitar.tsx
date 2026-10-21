"use client";

import { useState } from "react";
import { sitio } from "@/config/sitio";

// Enlace de invitación del alumno: copiar o compartir por WhatsApp.
export default function Invitar({ enlace, invitados, compraron }: { enlace: string; invitados: number; compraron: number }) {
  const [copiado, setCopiado] = useState(false);
  const { diasInvitador, descuento } = sitio.referidos;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="tarjeta p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-tenue">Invita y gana</p>
      <h2 className="mt-3 text-lg font-semibold">¿Un colega también se está preparando?</h2>
      <p className="mt-2 text-sm leading-relaxed text-tenue">
        Comparte tu enlace: tiene {Math.round(descuento * 100)}% de descuento en su primera compra y tú recibes{" "}
        {diasInvitador} días gratis cuando compre.
      </p>
      <div className="mt-4 flex min-w-0 gap-2">
        <input readOnly value={enlace} aria-label="Tu enlace de invitación" className="campo min-w-0 flex-1 font-mono text-xs" />
        <button onClick={copiar} className="btn-secundario shrink-0">
          {copiado ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(
          `Me estoy preparando para certificarme en Databricks con ${sitio.nombre}. Con este enlace tienes descuento: ${enlace}`,
        )}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm text-acento hover:underline"
      >
        Compartir por WhatsApp →
      </a>
      {invitados > 0 && (
        <p className="mt-4 border-t border-borde pt-4 font-mono text-xs text-tenue">
          {invitados} {invitados === 1 ? "invitado" : "invitados"} · {compraron} {compraron === 1 ? "compró" : "compraron"} · +
          {compraron * diasInvitador} días ganados
        </p>
      )}
    </div>
  );
}
