"use client";

import { useState } from "react";
import MarcoAuth, { Aviso } from "@/components/MarcoAuth";
import { clienteNavegador } from "@/lib/supabase/navegador";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    await clienteNavegador().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirmar?next=/cuenta/nueva-clave`,
    });
    // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
    setCargando(false);
    setEnviado(true);
  }

  return (
    <MarcoAuth titulo="Recupera tu contraseña" subtitulo="Te enviaremos un enlace para crear una nueva.">
      {enviado ? (
        <Aviso tipo="ok">Si {email} tiene una cuenta, recibirás un correo en unos minutos.</Aviso>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <label className="block text-sm">
            <span className="text-tenue">Correo electrónico</span>
            <input type="email" className="campo mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" disabled={cargando} className="btn-primario w-full py-3">
            {cargando ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}
    </MarcoAuth>
  );
}
