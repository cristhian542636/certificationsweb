"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="text-sm text-acento hover:underline">
        {texto}
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        if (await guardarPerfil({ fecha_examen: valor || null })) {
          setAbierto(false);
          router.refresh();
        }
        setGuardando(false);
      }}
    >
      <input
        type="date"
        value={valor}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(e) => setValor(e.target.value)}
        className="campo w-auto py-1.5"
        aria-label="Fecha de tu examen"
      />
      <button disabled={guardando} className="btn-primario py-1.5">
        Guardar
      </button>
      <button type="button" onClick={() => setAbierto(false)} className="text-sm text-tenue hover:text-texto">
        Cancelar
      </button>
    </form>
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
