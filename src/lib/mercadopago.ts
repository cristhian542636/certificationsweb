import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { obtenerCertificacion, type Certificacion } from "@/config/certificaciones";
import { alcanceDe, duracion, obtenerPase, precioConDescuento, sitio, type Pase } from "@/config/sitio";
import { AMBIENTE, SITE_URL, requerido } from "@/lib/entorno";
import { tieneDescuentoReferido } from "@/lib/precios";
import { clienteAdmin } from "@/lib/supabase/servidor";

// Integración con Mercado Pago (Perú) vía API REST:
// - Yape dentro del sitio (Checkout API: el navegador genera un token con el OTP de Yape).
// - Tarjetas y otros medios con redirección (Checkout Pro).
// - Webhook que confirma cualquier pago y activa el plan premium automáticamente.

const API = process.env.MP_API_URL ?? "https://api.mercadopago.com";

export interface PagoMP {
  id: number;
  status: string;
  status_detail: string | null;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string | null;
  external_reference: string | null;
  metadata?: Record<string, unknown>;
}

async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requerido("MP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Mercado Pago ${ruta} respondió ${res.status}: ${JSON.stringify(cuerpo)}`);
  }
  return cuerpo as T;
}

// En dev/qa Vercel pide iniciar sesión para ver el sitio; con "Protection Bypass for Automation" activado,
// Vercel define VERCEL_AUTOMATION_BYPASS_SECRET y este parámetro deja pasar el aviso de Mercado Pago.
const urlNotificacion = () => {
  const url = `${SITE_URL}/api/webhooks/mercadopago`;
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return bypass && AMBIENTE !== "produccion" ? `${url}?x-vercel-protection-bypass=${encodeURIComponent(bypass)}` : url;
};

// external_reference = "<usuario_id>:<pase_id>:<certificacion>" (certificacion "*" = todas).
// Mercado Pago lo devuelve intacto en cada consulta del pago.
interface Compra {
  usuarioId: string;
  email: string;
  pase: Pase;
  cert: Certificacion;
  /** Monto a cobrar (precio vigente, con descuento de referido si aplica). */
  monto: number;
}

const referencia = (c: Compra) => `${c.usuarioId}:${c.pase.id}:${alcanceDe(c.pase, c.cert)}`;
const producto = (c: Compra) => `${alcanceDe(c.pase, c.cert)}:${c.pase.id}`;
const descripcion = (c: Compra) =>
  `${sitio.nombre} · ${c.pase.nivel === "todas" ? c.pase.nombre : c.cert.nombreOficial} · ${duracion(c.pase)}`;

/** Cobra con Yape usando el token generado en el navegador con el celular + OTP del cliente. */
export function crearPagoYape(opts: Compra & { token: string }) {
  return llamar<PagoMP>("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      token: opts.token,
      transaction_amount: opts.monto,
      description: descripcion(opts),
      installments: 1,
      payment_method_id: "yape",
      payer: { email: opts.email },
      external_reference: referencia(opts),
      notification_url: urlNotificacion(),
      metadata: { usuario_id: opts.usuarioId, producto: producto(opts) },
    }),
  });
}

/** Crea una preferencia de Checkout Pro (tarjeta y otros medios) y devuelve la URL de pago. */
export async function crearPreferencia(opts: Compra) {
  const pref = await llamar<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: producto(opts),
          title: descripcion(opts),
          quantity: 1,
          unit_price: opts.monto,
          currency_id: sitio.moneda,
        },
      ],
      payer: { email: opts.email },
      external_reference: referencia(opts),
      metadata: { usuario_id: opts.usuarioId, producto: producto(opts) },
      notification_url: urlNotificacion(),
      back_urls: {
        success: `${SITE_URL}/pago/resultado`,
        pending: `${SITE_URL}/pago/resultado`,
        failure: `${SITE_URL}/pago/resultado`,
      },
      auto_return: "approved",
      statement_descriptor: sitio.nombre.toUpperCase().slice(0, 13),
    }),
  });
  return pref.init_point;
}

export function obtenerPago(id: string | number) {
  return llamar<PagoMP>(`/v1/payments/${encodeURIComponent(String(id))}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lee usuario, pase y alcance del external_reference; el pase queda vacío si no es coherente. */
export function leerReferencia(externalReference: string | null) {
  const [usuarioId = "", paseId, certId] = (externalReference ?? "").split(":");
  const pase = obtenerPase(paseId);
  const cert = obtenerCertificacion(certId);
  // El pase debe corresponder a la certificación: "*" solo con el pase que cubre todas.
  const alcance = !pase ? null : pase.nivel === "todas" ? (certId === "*" ? "*" : null) : cert?.nivel === pase.nivel ? cert.id : null;
  return { usuarioId: UUID.test(usuarioId) ? usuarioId : null, pase: alcance ? pase : undefined, alcance };
}

/**
 * Registra el pago en la base de datos y, si está aprobado y es válido, otorga el acceso.
 * Idempotente: se puede llamar varias veces con el mismo pago (respuesta directa + webhook).
 */
export async function procesarPago(pago: PagoMP) {
  const { usuarioId, pase, alcance } = leerReferencia(pago.external_reference);
  if (!usuarioId || !pase || !alcance) return { ok: false as const, motivo: "pago sin usuario o pase válido" };

  // El monto debe corresponder al pase indicado en la referencia (evita pagar el de 60 días y recibir el de 120).
  const minimo = precioConDescuento(pase, await tieneDescuentoReferido(usuarioId));
  const montoValido = pago.currency_id === sitio.moneda && pago.transaction_amount >= minimo - 0.001;
  // Un pago aprobado por un monto distinto se guarda, pero no otorga acceso (revisión manual).
  const estado = pago.status === "approved" && !montoValido ? "approved_monto_invalido" : pago.status;

  const { data, error } = await clienteAdmin().rpc("registrar_pago", {
    p_usuario_id: usuarioId,
    p_proveedor_pago_id: String(pago.id),
    p_producto: `${alcance}:${pase.id}`,
    p_monto: pago.transaction_amount,
    p_moneda: pago.currency_id,
    p_metodo: pago.payment_method_id,
    p_estado: estado,
    p_estado_detalle: pago.status_detail,
    p_certificacion: alcance,
    p_dias: pase.dias,
    p_dias_invitador: sitio.referidos.diasInvitador,
  });
  if (error) throw new Error(`registrar_pago: ${error.message}`);
  return { ok: true as const, accesoHasta: data as string | null };
}

/**
 * Valida la firma `x-signature` de los webhooks de Mercado Pago.
 * Manifest: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" firmado con HMAC-SHA256.
 */
export function firmaWebhookValida(opts: { firma: string | null; requestId: string | null; dataId: string }) {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) return true; // Sin secreto configurado no se valida (igual se consulta el pago a la API).
  if (!opts.firma) return false;

  const partes = Object.fromEntries(
    opts.firma.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string]),
  );
  if (!partes.ts || !partes.v1) return false;

  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  let manifest = `id:${id};`;
  if (opts.requestId) manifest += `request-id:${opts.requestId};`;
  manifest += `ts:${partes.ts};`;

  const esperada = Buffer.from(createHmac("sha256", secreto).update(manifest).digest("hex"));
  const recibida = Buffer.from(partes.v1);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

/** Traduce los motivos de rechazo más comunes a un mensaje entendible. */
export function mensajeRechazo(detalle: string | null) {
  switch (detalle) {
    case "cc_rejected_call_for_authorize":
    case "cc_rejected_insufficient_amount":
    case "cc_amount_rate_limit_exceeded":
      return "Yape rechazó el pago por el límite de tu cuenta o saldo insuficiente. Revisa tu app de Yape e inténtalo otra vez.";
    case "cc_rejected_bad_filled_security_code":
    case "cc_rejected_form_error":
      return "El código de aprobación no es válido o ya venció. Genera uno nuevo en Yape e inténtalo otra vez.";
    case "cc_rejected_max_attempts":
      return "Superaste el número de intentos permitidos. Espera unos minutos e inténtalo otra vez.";
    default:
      return "El pago no fue aprobado. Inténtalo otra vez o paga con tarjeta.";
  }
}
