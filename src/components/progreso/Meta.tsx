"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SelectorFecha from "@/components/SelectorFecha";
import { hoyLima } from "@/lib/progreso";

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

/** Para quien ya rindió su examen sin haber registrado la fecha (o lo adelantó): fecha + resultado en un paso. */
export function RegistrarResultado() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hoy = hoyLima();
  const minimo = (() => {
    const d = new Date(`${hoy}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 90);
    return d.toISOString().slice(0, 10);
  })();

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="text-sm text-acento hover:underline">
        ¿Ya diste tu examen? Cuéntanos
      </button>
    );
  }

  async function responder(resultado: "aprobado" | "no_aprobado") {
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha_examen: fecha, resultado_examen: resultado }),
    });
    const datos = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setEnviando(false);
    if (datos.ok) router.refresh();
    else setError(datos.error ?? "No se pudo guardar. Inténtalo otra vez.");
  }

  return (
    <div className="mt-3 w-full rounded-lg border border-borde bg-panel p-4">
      <p className="text-sm font-medium text-texto">¿Cuándo diste tu examen?</p>
      <div className="mt-2 sm:w-80">
        <SelectorFecha valor={fecha} onCambio={setFecha} min={minimo} max={hoy} etiqueta="Fecha en que diste el examen" textoVacio="Elegir la fecha" />
      </div>
      <p className="mt-4 text-sm font-medium text-texto">¿Cómo te fue?</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <button disabled={enviando || !fecha} onClick={() => responder("aprobado")} className="btn bg-emerald-500 text-fondo hover:bg-emerald-400">
          🎉 ¡Aprobé!
        </button>
        <button disabled={enviando || !fecha} onClick={() => responder("no_aprobado")} className="btn-secundario">
          Esta vez no
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-sm text-tenue hover:text-texto">
          Cancelar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

/** Al aprobar: enlace público de su credencial digital, para verificar el logro. */
export function CredencialAprobado({ enlace }: { enlace: string | null }) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (enlace) {
    return (
      <p className="text-sm text-emerald-400">
        ✓ Credencial registrada.{" "}
        <a href={enlace} target="_blank" rel="noreferrer nofollow" className="underline">
          Ver credencial
        </a>
      </p>
    );
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insignia_url: valor }),
    });
    const datos = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setEnviando(false);
    if (datos.ok) router.refresh();
    else setError(datos.error ?? "No se pudo guardar. Inténtalo otra vez.");
  }

  return (
    <form onSubmit={guardar} className="w-full max-w-xl">
      <label className="block text-sm">
        <span className="text-tenue">
          Pega el enlace público de tu credencial (el que te llegó por correo para compartir tu badge) y la verificamos:
        </span>
        <div className="mt-2 flex min-w-0 gap-2">
          <input
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="campo min-w-0 flex-1"
            required
          />
          <button disabled={enviando || !valor.trim()} className="btn-secundario shrink-0">
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </label>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </form>
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
