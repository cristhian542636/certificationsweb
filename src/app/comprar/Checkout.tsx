"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  sitio,
  formatoSoles,
  duracion,
  obtenerPase,
  precioAnterior,
  precioConDescuento,
  PASES_ACTUALES,
  type PaseId,
} from "@/config/sitio";
import { Aviso } from "@/components/MarcoAuth";
import { AMBIENTE } from "@/lib/entorno";
import BienvenidaPremium from "@/components/BienvenidaPremium";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale?: string }) => {
      yape: (datos: { otp: string; phoneNumber: string }) => { create: () => Promise<{ id: string } | string> };
    };
  }
}

type Metodo = "yape" | "tarjeta";
type Estado = { tipo: "inicial" } | { tipo: "error"; texto: string } | { tipo: "aprobado" } | { tipo: "pendiente" };

export default function Checkout({
  email,
  publicKey,
  paseInicial,
  descuento,
}: {
  email: string;
  publicKey: string;
  paseInicial: PaseId;
  /** Descuento de referido en la primera compra. */
  descuento: boolean;
}) {
  const router = useRouter();
  const [paseId, setPaseId] = useState<PaseId>(paseInicial);
  const pase = obtenerPase(paseId) ?? PASES_ACTUALES[0];
  const monto = precioConDescuento(pase, descuento);
  const [metodo, setMetodo] = useState<Metodo>("yape");
  const [celular, setCelular] = useState("");
  const [otp, setOtp] = useState("");
  const [cargando, setCargando] = useState(false);
  const [sdkListo, setSdkListo] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });
  const [vencimientoPrevio, setVencimientoPrevio] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/cuenta/estado")
      .then((r) => r.json())
      .then((r) => setVencimientoPrevio(r.accesoHasta ?? null))
      .catch(() => setVencimientoPrevio(null));
  }, []);

  // Si el pago quedó pendiente, consultamos cada 4 s hasta que el webhook lo confirme.
  useEffect(() => {
    if (estado.tipo !== "pendiente") return;
    const intervalo = setInterval(async () => {
      const r = await fetch("/api/cuenta/estado").then((r) => r.json()).catch(() => null);
      if (r?.premium && r.accesoHasta !== vencimientoPrevio) setEstado({ tipo: "aprobado" });
    }, 4000);
    return () => clearInterval(intervalo);
  }, [estado.tipo, vencimientoPrevio]);

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
        body: JSON.stringify({ pase: pase.id, token: typeof token === "string" ? token : token.id }),
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
    const res = await fetch("/api/pagos/tarjeta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pase: pase.id }),
    });
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
      <BienvenidaPremium
        detalle={`Pago aprobado: tu pase de ${duracion(pase)} está activo y el comprobante llegó a ${email}.`}
      />
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

      <p className="text-sm font-medium">1. Elige tu pase</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Pase">
        {PASES_ACTUALES.map((p) => {
          const activo = p.id === paseId;
          const anterior = precioAnterior(p);
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={activo}
              onClick={() => {
                setPaseId(p.id);
                setEstado({ tipo: "inicial" });
              }}
              className={`relative rounded-lg border p-4 text-left transition ${
                activo ? "border-acento bg-acento/10" : "border-borde hover:border-borde-fuerte"
              }`}
            >
              {"destacado" in p && p.destacado && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-acento px-2 py-0.5 font-mono text-[10px] font-semibold text-fondo">
                  más elegido
                </span>
              )}
              <span className="block text-sm text-tenue">{p.nombre}</span>
              <span className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-xl font-semibold">{formatoSoles(precioConDescuento(p, descuento))}</span>
                {anterior && <span className="font-mono text-xs text-tenue line-through">{formatoSoles(anterior)}</span>}
              </span>
              <span className="mt-0.5 block text-xs text-tenue">
                ≈ {formatoSoles(Math.round((precioConDescuento(p, descuento) / p.dias) * 100) / 100)} al día · {p.nota}
              </span>
            </button>
          );
        })}
      </div>
      {(descuento || sitio.lanzamiento) && (
        <p className="mt-3 text-xs text-tenue">
          {sitio.lanzamiento && "Precio de lanzamiento. "}
          {descuento && (
            <span className="text-acento">
              Incluye {Math.round(sitio.referidos.descuento * 100)}% de descuento por invitación en tu primera compra.
            </span>
          )}
        </p>
      )}

      <p className="mt-7 text-sm font-medium">2. Elige cómo pagar</p>
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
              placeholder={AMBIENTE === "produccion" ? "9XXXXXXXX" : "Celular de prueba (9 dígitos)"}
              value={celular}
              onChange={(e) => setCelular(e.target.value.replace(/\D/g, "").slice(0, 9))}
              // Fuera de producción se aceptan los celulares de prueba de Mercado Pago, que no empiezan con 9.
              pattern={AMBIENTE === "produccion" ? "9\\d{8}" : "\\d{9}"}
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
            {cargando ? "Procesando pago…" : `Pagar ${formatoSoles(monto)} con Yape`}
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
            {cargando ? "Redirigiendo…" : `Pagar ${formatoSoles(monto)} con Mercado Pago →`}
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-tenue">
        Pago único por {duracion(pase)}, sin renovación automática. Al pagar aceptas los <Link href="/terminos" className="underline hover:text-texto">términos y condiciones</Link>.
        Comprobante enviado a {email}.
      </p>
    </div>
  );
}
