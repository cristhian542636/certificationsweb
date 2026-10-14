import { NextResponse } from "next/server";
import { firmaWebhookValida, obtenerPago, procesarPago } from "@/lib/mercadopago";

// Mercado Pago avisa aquí cada vez que se crea un pago o cambia su estado.
// Nunca confiamos en el contenido del aviso: consultamos el pago a la API y recién ahí lo registramos.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const cuerpo = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };

  const tipo = cuerpo.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") ?? String(cuerpo.data?.id ?? url.searchParams.get("id") ?? "");

  if (tipo !== "payment" || !dataId) return NextResponse.json({ ok: true, ignorado: true });

  const valida = firmaWebhookValida({
    firma: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    dataId,
  });
  if (!valida) return NextResponse.json({ ok: false, error: "firma inválida" }, { status: 401 });

  try {
    const pago = await obtenerPago(dataId);
    const resultado = await procesarPago(pago);
    return NextResponse.json({ estado: pago.status, ...resultado });
  } catch (e) {
    console.error("Webhook Mercado Pago:", e);
    // 500 hace que Mercado Pago reintente la notificación más tarde.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
