"use client";

import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { Aviso } from "./MarcoAuth";

/**
 * Inicia sesión o crea la cuenta con Google (OAuth vía Supabase).
 * Si es la primera vez, Supabase crea el usuario y el trigger `crear_perfil` lo agrega a `perfiles`.
 */
export default function BotonGoogle({ destino, origen }: { destino: string; origen?: string | null }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  async function continuar() {
    setCargando(true);
    setError(false);
    // El canal de captación (utm_source) no viaja por Google: lo guardamos en una cookie de corta duración
    // y /auth/confirmar lo registra en el perfil.
    if (origen) document.cookie = `origen=${encodeURIComponent(origen)}; path=/; max-age=600; samesite=lax`;

    const { error } = await clienteNavegador().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/confirmar?next=${encodeURIComponent(destino)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setCargando(false);
      setError(true);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={continuar}
        disabled={cargando}
        className="btn w-full border border-borde-fuerte bg-white py-3 text-[#1f1f1f] hover:bg-slate-100"
      >
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {cargando ? "Conectando con Google…" : "Continuar con Google"}
      </button>
      {error && <Aviso tipo="error">No pudimos conectar con Google. Inténtalo otra vez o usa tu correo.</Aviso>}
    </div>
  );
}

export function Separador() {
  return (
    <div className="my-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-tenue">
      <span className="h-px flex-1 bg-borde" />o con tu correo
      <span className="h-px flex-1 bg-borde" />
    </div>
  );
}
