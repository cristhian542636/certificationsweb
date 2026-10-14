"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Activar() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState<{ tipo: "error" | "ok"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function activar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setEstado(null);
    const res = await fetch("/api/activar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    const datos = (await res.json()) as { ok: boolean; error?: string; email?: string };
    setCargando(false);
    if (datos.ok) {
      setEstado({ tipo: "ok", texto: `¡Listo! Acceso activado para ${datos.email}. Redirigiendo…` });
      setTimeout(() => router.push("/simulador"), 1200);
    } else {
      setEstado({ tipo: "error", texto: datos.error ?? "No se pudo activar el código." });
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-bold">Activar acceso completo</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Pega el código que recibiste por WhatsApp después de tu pago. El acceso queda guardado en este navegador;
        si cambias de dispositivo, vuelve a pegar el mismo código.
      </p>
      <form onSubmit={activar} className="mt-8 space-y-4">
        <textarea
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="DBX-..."
          rows={3}
          className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-slate-700"
          required
        />
        <button
          type="submit"
          disabled={cargando || !codigo.trim()}
          className="w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {cargando ? "Verificando…" : "Activar"}
        </button>
      </form>
      {estado && (
        <p className={`mt-4 text-sm ${estado.tipo === "ok" ? "text-green-600" : "text-red-600"}`}>{estado.texto}</p>
      )}
    </div>
  );
}
