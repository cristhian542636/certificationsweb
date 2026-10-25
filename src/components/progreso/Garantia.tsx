"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sitio, enlaceWhatsApp } from "@/config/sitio";

export type EstadoGarantia = "pendiente" | "aprobada" | "rechazada" | null;

// Tras no aprobar: el alumno sube el reporte de su examen y solicita la extensión gratuita de su acceso.
export default function Garantia({ estado }: { estado: EstadoGarantia }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState<{ ok: boolean; mensaje: string } | null>(null);
  // Archivo recibido: abre la confirmación para que no quede duda de que se subió.
  const [recibido, setRecibido] = useState<{ nombre: string; tamano: number } | null>(null);
  const { dias, minimoSimulacros } = sitio.garantia;
  const whatsapp = enlaceWhatsApp(
    `Hola ${sitio.instructor.nombre.split(" ")[0]}, quiero solicitar la garantía de acompañamiento en ${sitio.nombre}. Te envío el reporte de mi examen.`,
  );

  if (estado === "aprobada") {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
        <p className="font-semibold text-emerald-400">✓ Garantía aprobada</p>
        <p className="mt-1 text-sm text-tenue">Sumamos {dias} días a tu acceso. ¡Vamos por el siguiente intento!</p>
      </div>
    );
  }
  if (estado === "rechazada") {
    return <p className="text-sm text-tenue">Revisamos tu solicitud de garantía y no aplicaba esta vez. Escríbenos si tienes dudas.</p>;
  }
  if (estado === "pendiente" || respuesta?.ok) {
    return (
      <>
        <div className="flex gap-4 rounded-lg border border-acento/50 bg-acento/5 p-4">
          <IconoCheck />
          <div>
            <p className="font-semibold">Solicitud recibida · en revisión</p>
            <p className="mt-1 text-sm leading-relaxed text-tenue">
              Tenemos tu reporte. Lo revisamos {sitio.acompanamiento.tiempoRespuesta} y, al aprobarlo, sumamos {dias} días a tu
              acceso. Lo verás aquí en tu panel.
            </p>
          </div>
        </div>
        {recibido && <Confirmacion archivo={recibido} onCerrar={() => setRecibido(null)} />}
      </>
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
    if (r.ok) {
      setRecibido({ nombre: archivo.name, tamano: archivo.size });
      router.refresh();
    }
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

function IconoCheck() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-acento/15 text-acento" aria-hidden>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

const pesoLegible = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** Ventana de confirmación tras subir el reporte: deja claro que llegó y qué sigue. */
function Confirmacion({ archivo, onCerrar }: { archivo: { nombre: string; tamano: number }; onCerrar: () => void }) {
  const ventana = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ventana.current?.showModal();
  }, []);
  const { dias } = sitio.garantia;

  return (
    <dialog
      ref={ventana}
      onClose={onCerrar}
      aria-labelledby="garantia-recibida"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-borde-fuerte bg-panel p-0 text-texto shadow-2xl backdrop:bg-black/70"
    >
      <div className="p-6 text-center sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-acento/15 text-acento" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <h2 id="garantia-recibida" className="mt-4 text-2xl font-semibold tracking-tight">
          ¡Solicitud recibida!
        </h2>
        <p className="mt-2 text-sm text-tenue">Tu reporte se subió correctamente.</p>
        <p className="mx-auto mt-4 flex max-w-full items-center justify-center gap-2 rounded-lg border border-borde bg-fondo px-3 py-2 font-mono text-xs">
          <span className="text-acento">✓</span>
          <span className="min-w-0 truncate">{archivo.nombre}</span>
          <span className="shrink-0 text-tenue">· {pesoLegible(archivo.tamano)}</span>
        </p>
        <ol className="mt-6 space-y-3 text-left text-sm">
          <li className="flex gap-3">
            <span className="font-mono text-acento">1</span>
            <span className="text-tenue">Revisamos tu reporte {sitio.acompanamiento.tiempoRespuesta}.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-acento">2</span>
            <span className="text-tenue">Al aprobarlo, sumamos {dias} días a tu acceso. Lo verás en tu panel.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-acento">3</span>
            <span className="text-tenue">Mientras tanto, repasa tus errores y define tu nueva fecha.</span>
          </li>
        </ol>
        <form method="dialog">
          <button className="btn-primario mt-8 w-full py-3" autoFocus>
            Entendido
          </button>
        </form>
      </div>
    </dialog>
  );
}
