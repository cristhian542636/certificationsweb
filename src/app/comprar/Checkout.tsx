"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sitio, formatoSoles } from "@/config/sitio";
import { Aviso } from "@/components/MarcoAuth";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale?: string }) => {
      yape: (datos: { otp: string; phoneNumber: string }) => { create: () => Promise<{ id: string } | string> };
    };
  }
}

type Metodo = "yape" | "tarjeta";
type Estado = { tipo: "inicial" } | { tipo: "error"; texto: string } | { tipo: "aprobado" } | { tipo: "pendiente" };

export default function Checkout({ email, publicKey }: { email: string; publicKey: string }) {
  const router = useRouter();
  const [metodo, setMetodo] = useState<Metodo>("yape");
  const [celular, setCelular] = useState("");
  const [otp, setOtp] = useState("");
  const [cargando, setCargando] = useState(false);
  const [sdkListo, setSdkListo] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });

  // Si el pago quedó pendiente, consultamos cada 4 s hasta que el webhook lo confirme.
  useEffect(() => {
    if (estado.tipo !== "pendiente") return;
    const intervalo = setInterval(async () => {
      const r = await fetch("/api/cuenta/estado").then((r) => r.json()).catch(() => null);
      if (r?.premium) setEstado({ tipo: "aprobado" });
    }, 4000);
    return () => clearInterval(intervalo);
  }, [estado.tipo]);

  async function pagarConYape(e: React.FormEvent) {
    e.preventDefault();
    if (!window.MercadoPago || !publicKey) {
      setEstado({ tipo: "error", texto: "El pago con Yape no está disponible en este momento. Intenta con tarjeta." });
      return;
    }
    setCargando(true);
    setEstado({ tipo: "inicial" });
    try {
      const mp = new window.MercadoPago(publicKey, { locale: "es-PE" });
      const token = await mp.yape({ otp, phoneNumber: celular }).create();
      const res = await fetch("/api/pagos/yape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: typeof token === "string" ? token : token.id }),
      });
      const datos = (await res.json()) as { ok: boolean; estado?: string; error?: string };
      if (datos.ok && datos.estado === "aprobado") {
        setEstado({ tipo: "aprobado" });
        router.refresh();
      } else if (datos.ok) {
        setEstado({ tipo: "pendiente" });
      } else {
        setEstado({ tipo: "error", texto: datos.error ?? "El pago no fue aprobado." });
        setOtp("");
      }
    } catch {
      setEstado({
        tipo: "error",
        texto: "No pudimos validar tu Yape. Revisa tu número y genera un nuevo código de aprobación.",
      });
      setOtp("");
    } finally {
      setCargando(false);
    }
  }

  async function pagarConTarjeta() {
    setCargando(true);
    setEstado({ tipo: "inicial" });
    const res = await fetch("/api/pagos/tarjeta", { method: "POST" });
    const datos = (await res.json()) as { ok: boolean; url?: string; error?: string };
    if (datos.ok && datos.url) {
      window.location.href = datos.url;
      return;
    }
    setCargando(false);
    setEstado({ tipo: "error", texto: datos.error ?? "No pudimos iniciar el pago." });
  }

  if (estado.tipo === "aprobado") {
    return (
      <div className="tarjeta flex flex-col items-center justify-center p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-400">✓</span>
        <h2 className="mt-5 text-2xl font-semibold">¡Pago aprobado!</h2>
        <p className="mt-2 text-tenue">Tu cuenta ya es Premium. Te enviamos el comprobante de Mercado Pago a {email}.</p>
        <Link href="/simulador" className="btn-primario mt-8 px-6 py-3">Empezar simulacro completo →</Link>
      </div>
    );
  }

  if (estado.tipo === "pendiente") {
    return (
      <div className="tarjeta flex flex-col items-center justify-center p-10 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-borde-fuerte border-t-acento" />
        <h2 className="mt-5 text-xl font-semibold">Confirmando tu pago…</h2>
        <p className="mt-2 text-sm text-tenue">
          Mercado Pago está validando la operación. Tu acceso se activará automáticamente; puedes quedarte en esta
          página o volver más tarde.
        </p>
      </div>
    );
  }

  return (
    <div className="tarjeta p-6 md:p-8">
      <Script src="https://sdk.mercadopago.com/js/v2" onReady={() => setSdkListo(true)} />

      <p className="text-sm font-medium">Elige cómo pagar</p>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-borde bg-fondo p-1">
        {(
          [
            ["yape", "Yape"],
            ["tarjeta", "Tarjeta / otros"],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => {
              setMetodo(valor);
              setEstado({ tipo: "inicial" });
            }}
            className={`rounded-md py-2 text-sm font-medium transition ${
              metodo === valor ? "bg-panel-2 text-texto shadow" : "text-tenue hover:text-texto"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {metodo === "yape" ? (
        <form onSubmit={pagarConYape} className="mt-6 space-y-4">
          <ol className="space-y-1.5 rounded-lg border border-borde bg-fondo p-4 text-xs text-tenue">
            <li>1. Abre tu app de Yape y toca <strong className="text-texto">“Código de aprobación”</strong> en el menú.</li>
            <li>2. Ingresa aquí tu celular y el código de 6 dígitos (vence en 2 minutos).</li>
            <li>3. Confirma y tu acceso se activa al instante.</li>
          </ol>
          <label className="block text-sm">
            <span className="text-tenue">Celular registrado en Yape</span>
            <input
              className="campo mt-1.5 font-mono"
              inputMode="numeric"
              placeholder="9XXXXXXXX"
              value={celular}
              onChange={(e) => setCelular(e.target.value.replace(/\D/g, "").slice(0, 9))}
              pattern="9\d{8}"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-tenue">Código de aprobación</span>
            <input
              className="campo mt-1.5 font-mono tracking-[0.5em]"
              inputMode="numeric"
              placeholder="······"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              pattern="\d{6}"
              autoComplete="one-time-code"
              required
            />
          </label>
          {estado.tipo === "error" && <Aviso tipo="error">{estado.texto}</Aviso>}
          <button
            type="submit"
            disabled={cargando || !sdkListo || celular.length !== 9 || otp.length !== 6}
            className="btn w-full bg-[#742284] py-3 text-white hover:bg-[#5e1b6b]"
          >
            {cargando ? "Procesando pago…" : `Pagar ${formatoSoles(sitio.producto.precio)} con Yape`}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-tenue">
            Te llevaremos a la página segura de Mercado Pago para pagar con tarjeta de crédito o débito (Visa,
            Mastercard, Amex, Diners) u otros medios disponibles. Al terminar, volverás aquí con tu acceso activo.
          </p>
          {estado.tipo === "error" && <Aviso tipo="error">{estado.texto}</Aviso>}
          <button onClick={pagarConTarjeta} disabled={cargando} className="btn-primario w-full py-3">
            {cargando ? "Redirigiendo…" : `Pagar ${formatoSoles(sitio.producto.precio)} con Mercado Pago →`}
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-tenue">
        Al pagar aceptas los <Link href="/terminos" className="underline hover:text-texto">términos y condiciones</Link>.
        Comprobante enviado a {email}.
      </p>
    </div>
  );
}
