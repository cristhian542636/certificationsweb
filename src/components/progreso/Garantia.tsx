"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sitio, enlaceWhatsApp } from "@/config/sitio";

export type EstadoGarantia = "pendiente" | "aprobada" | "rechazada" | null;

// Tras no aprobar: el alumno solicita la extensión gratuita de su acceso.
export default function Garantia({ estado }: { estado: EstadoGarantia }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const { dias } = sitio.garantia;
  const whatsapp = enlaceWhatsApp(
    `Hola ${sitio.instructor.nombre.split(" ")[0]}, solicité la garantía de acompañamiento en ${sitio.nombre}. Te envío el reporte de mi examen.`,
  );

  if (estado === "aprobada") {
    return <p className="text-sm text-emerald-400">Tu garantía está activa: sumamos {dias} días a tu acceso. ¡Vamos por el siguiente intento!</p>;
  }
  if (estado === "rechazada") {
    return <p className="text-sm text-tenue">Revisamos tu solicitud de garantía y no aplicaba esta vez. Escríbenos si tienes dudas.</p>;
  }
  if (estado === "pendiente" || respuesta?.ok) {
    return (
      <p className="text-sm text-tenue">
        {respuesta?.mensaje ?? "Tu solicitud de garantía está en revisión."}{" "}
        <a href={whatsapp} target="_blank" rel="noreferrer" className="text-acento hover:underline">
          Enviar reporte por WhatsApp →
        </a>
      </p>
    );
  }

  async function solicitar() {
    setEnviando(true);
    const r = await fetch("/api/garantia", { method: "POST" })
      .then((x) => x.json() as Promise<{ ok: boolean; mensaje: string }>)
      .catch(() => ({ ok: false, mensaje: "No pudimos registrar tu solicitud. Inténtalo otra vez." }));
    setRespuesta(r);
    setEnviando(false);
    if (r.ok) router.refresh();
  }

  return (
    <div className="rounded-lg border border-acento/40 bg-acento/5 p-4">
      <p className="text-sm">
        <strong>Garantía de acompañamiento:</strong> si tenías un pase y completaste al menos{" "}
        {sitio.garantia.minimoSimulacros} simulacros antes del examen, te extendemos el acceso {dias} días sin costo.
        Solicítala antes de definir tu nueva fecha.
      </p>
      <button onClick={solicitar} disabled={enviando} className="btn-primario mt-3">
        {enviando ? "Enviando…" : `Solicitar ${dias} días gratis`}
      </button>
      {respuesta && !respuesta.ok && <p className="mt-2 text-sm text-red-400">{respuesta.mensaje}</p>}
    </div>
  );
}
