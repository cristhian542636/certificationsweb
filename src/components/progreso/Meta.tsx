"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SelectorFecha from "@/components/SelectorFecha";

async function guardarPerfil(cambios: Record<string, string | null>) {
  const res = await fetch("/api/perfil", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
  return res.ok;
}

/** Cambia (o define) la fecha del examen desde el panel. */
export function EditarFecha({ fecha, texto = "Cambiar fecha" }: { fecha: string | null; texto?: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState(fecha ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="text-sm text-acento hover:underline">
        {texto}
      </button>
    );
  }

  async function guardar(nueva: string) {
    setGuardando(true);
    setError(false);
    if (await guardarPerfil({ fecha_examen: nueva || null })) {
      setAbierto(false);
      router.refresh();
    } else {
      setError(true);
    }
    setGuardando(false);
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <div className="w-full sm:w-80">
        <SelectorFecha valor={valor} onCambio={setValor} />
      </div>
      <button onClick={() => guardar(valor)} disabled={guardando || valor === (fecha ?? "")} className="btn-primario py-2">
        {valor ? "Guardar" : "Quitar fecha"}
      </button>
      <button
        type="button"
        onClick={() => {
          setValor(fecha ?? "");
          setAbierto(false);
        }}
        className="text-sm text-tenue hover:text-texto"
      >
        Cancelar
      </button>
      {error && <span className="w-full text-xs text-red-400">No se pudo guardar. Elige una fecha desde hoy en adelante.</span>}
    </div>
  );
}

/** Tras la fecha del examen: el alumno cuenta cómo le fue. */
export function PreguntarResultado() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function responder(resultado: "aprobado" | "no_aprobado") {
    setEnviando(true);
    await guardarPerfil({ resultado_examen: resultado });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button disabled={enviando} onClick={() => responder("aprobado")} className="btn bg-emerald-500 text-fondo hover:bg-emerald-400">
        🎉 ¡Aprobé!
      </button>
      <button disabled={enviando} onClick={() => responder("no_aprobado")} className="btn-secundario">
        Esta vez no
      </button>
    </div>
  );
}

/** Permite reiniciar el ciclo: nueva fecha tras no aprobar o para la siguiente certificación. */
export function ReiniciarMeta() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await guardarPerfil({ resultado_examen: null, fecha_examen: null });
        router.refresh();
      }}
      className="btn-secundario"
    >
      Definir nueva fecha
    </button>
  );
}
