"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MarcoAuth, { Aviso } from "@/components/MarcoAuth";
import { clienteNavegador } from "@/lib/supabase/navegador";

export default function NuevaClave() {
  const router = useRouter();
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    const { error } = await clienteNavegador().auth.updateUser({ password: clave });
    setCargando(false);
    if (error) {
      setError("No se pudo actualizar la contraseña. Solicita un nuevo enlace.");
      return;
    }
    router.replace("/cuenta");
    router.refresh();
  }

  return (
    <MarcoAuth titulo="Crea una nueva contraseña">
      <form onSubmit={guardar} className="space-y-4">
        <label className="block text-sm">
          <span className="text-tenue">Nueva contraseña</span>
          <input
            type="password"
            className="campo mt-1.5"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <button type="submit" disabled={cargando} className="btn-primario w-full py-3">
          {cargando ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </MarcoAuth>
  );
}
