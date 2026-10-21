"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sitio, enlaceWhatsApp } from "@/config/sitio";

export type EstadoGarantia = "pendiente" | "aprobada" | "rechazada" | null;

// Tras no aprobar: el alumno sube el reporte de su examen y solicita la extensión gratuita de su acceso.
export default function Garantia({ estado }: { estado: EstadoGarantia }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const { dias, minimoSimulacros } = sitio.garantia;
  const whatsapp = enlaceWhatsApp(
    `Hola ${sitio.instructor.nombre.split(" ")[0]}, quiero solicitar la garantía de acompañamiento en ${sitio.nombre}. Te envío el reporte de mi examen.`,
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
        {respuesta?.mensaje ?? `Tu solicitud de garantía está en revisión; te avisamos ${sitio.acompanamiento.tiempoRespuesta}.`}
      </p>
    );
  }

  async function solicitar(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    setEnviando(true);
    const datos = new FormData();
    datos.append("reporte", archivo);
    const r = await fetch("/api/garantia", { method: "POST", body: datos })
      .then((x) => x.json() as Promise<{ ok: boolean; mensaje: string }>)
      .catch(() => ({ ok: false, mensaje: "No pudimos registrar tu solicitud. Inténtalo otra vez." }));
    setRespuesta(r);
    setEnviando(false);
    if (r.ok) router.refresh();
  }

  return (
    <form onSubmit={solicitar} className="rounded-lg border border-acento/40 bg-acento/5 p-4">
      <p className="text-sm">
        <strong>Garantía de acompañamiento:</strong> si tenías un pase y completaste al menos {minimoSimulacros} simulacros
        antes del examen, te extendemos el acceso {dias} días sin costo. Solicítala antes de definir tu nueva fecha.
      </p>
      <label className="mt-4 block text-sm">
        <span className="text-tenue">Reporte de resultado de tu examen (PDF o captura, máximo 4 MB)</span>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const elegido = e.target.files?.[0] ?? null;
            const pesado = Boolean(elegido && elegido.size > 4 * 1024 * 1024);
            setArchivo(pesado ? null : elegido);
            setRespuesta(pesado ? { ok: false, mensaje: "El archivo pesa más de 4 MB. Sube una captura o un PDF más liviano." } : null);
          }}
          className="mt-1.5 block w-full text-sm text-tenue file:mr-3 file:rounded-md file:border-0 file:bg-panel-2 file:px-3 file:py-2 file:text-sm file:text-texto hover:file:bg-borde"
        />
      </label>
      <button type="submit" disabled={enviando || !archivo} className="btn-primario mt-4">
        {enviando ? "Enviando…" : `Solicitar ${dias} días gratis`}
      </button>
      {respuesta && !respuesta.ok && <p className="mt-2 text-sm text-red-400">{respuesta.mensaje}</p>}
      <p className="mt-3 text-xs text-tenue">
        ¿Problemas para subirlo?{" "}
        <a href={whatsapp} target="_blank" rel="noreferrer" className="text-acento hover:underline">
          Envíalo por WhatsApp
        </a>
        .
      </p>
    </form>
  );
}
