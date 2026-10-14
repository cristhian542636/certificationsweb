"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { Aviso } from "@/components/MarcoAuth";
import BotonGoogle, { Separador } from "@/components/BotonGoogle";

export default function FormularioIngreso() {
  const router = useRouter();
  const params = useSearchParams();
  const siguiente = params.get("next");
  const destino = siguiente?.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/panel";

  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "enlace" ? "El enlace venció o ya fue usado. Ingresa con tu correo y contraseña." : null,
  );

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await clienteNavegador().auth.signInWithPassword({ email: email.trim(), password: clave });
    if (error) {
      setCargando(false);
      setError(
        error.message.includes("Email not confirmed")
          ? "Primero confirma tu correo con el enlace que te enviamos."
          : "Correo o contraseña incorrectos.",
      );
      return;
    }
    router.replace(destino);
    router.refresh();
  }

  return (
    <>
      <BotonGoogle destino={destino} />
      <Separador />
      <form onSubmit={ingresar} className="space-y-4">
        <label className="block text-sm">
          <span className="text-tenue">Correo electrónico</span>
          <input type="email" className="campo mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="block text-sm">
          <span className="flex justify-between text-tenue">
            Contraseña
            <Link href="/recuperar" className="text-xs text-acento hover:underline">¿La olvidaste?</Link>
          </span>
          <input
            type="password"
            className="campo mt-1.5"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <button type="submit" disabled={cargando} className="btn-primario w-full py-3">
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </>
  );
}
