"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { Aviso } from "@/components/MarcoAuth";
import BotonGoogle, { Separador } from "@/components/BotonGoogle";

export default function FormularioRegistro() {
  const router = useRouter();
  const params = useSearchParams();
  const siguiente = params.get("next");
  const destino = siguiente?.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/simulador";
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { data, error } = await clienteNavegador().auth.signUp({
      email: email.trim(),
      password: clave,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmar?next=${encodeURIComponent(destino)}`,
        data: { nombre: nombre.trim(), origen: params.get("utm_source") ?? undefined },
      },
    });
    if (error) {
      setCargando(false);
      setError(
        error.message.includes("already registered")
          ? "Ese correo ya tiene una cuenta. Ingresa o recupera tu contraseña."
          : "No pudimos crear tu cuenta. Revisa los datos e inténtalo otra vez.",
      );
      return;
    }
    // Si la confirmación por correo está desactivada en Supabase, la sesión ya existe: pasa directo.
    if (data.session) {
      router.replace(destino);
      router.refresh();
      return;
    }
    setCargando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="space-y-4 text-sm">
        <Aviso tipo="ok">¡Listo! Te enviamos un correo a {email} para confirmar tu cuenta.</Aviso>
        <p className="text-tenue">Abre el enlace del correo y empezarás a practicar. Revisa también tu carpeta de spam.</p>
      </div>
    );
  }

  return (
    <>
      <BotonGoogle destino={destino} origen={params.get("utm_source")} />
      <p className="mt-3 text-center text-xs text-tenue">
        Al continuar con Google aceptas los{" "}
        <Link href="/terminos" className="text-acento hover:underline">términos</Link> y la{" "}
        <Link href="/privacidad" className="text-acento hover:underline">política de privacidad</Link>.
      </p>
      <Separador />
      <form onSubmit={registrar} className="space-y-4">
        <label className="block text-sm">
          <span className="text-tenue">Nombre</span>
          <input className="campo mt-1.5" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" required />
        </label>
        <label className="block text-sm">
          <span className="text-tenue">Correo electrónico</span>
          <input
            type="email"
            className="campo mt-1.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-tenue">Contraseña</span>
          <input
            type="password"
            className="campo mt-1.5"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <span className="mt-1 block text-xs text-tenue">Mínimo 8 caracteres.</span>
        </label>
        <label className="flex items-start gap-2.5 text-xs text-tenue">
          <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 accent-acento" required />
          <span>
            Acepto los{" "}
            <Link href="/terminos" className="text-acento hover:underline">términos</Link> y la{" "}
            <Link href="/privacidad" className="text-acento hover:underline">política de privacidad</Link>.
          </span>
        </label>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <button type="submit" disabled={cargando || !acepta} className="btn-primario w-full py-3">
          {cargando ? "Creando cuenta…" : "Crear cuenta gratis"}
        </button>
      </form>
    </>
  );
}
