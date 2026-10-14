import { createHmac, timingSafeEqual } from "node:crypto";

// Códigos de acceso firmados (sin base de datos).
// Formato: DBX-<payload base64url>.<firma base64url>
// payload = { e: correo, p: producto, x: expiración (epoch en segundos) }

export const COOKIE_ACCESO = "acceso_premium";

export interface DatosAcceso {
  e: string;
  p: string;
  x: number;
}

function secreto(): string {
  const s = process.env.ACCESS_CODE_SECRET;
  if (!s || s.length < 32) {
    throw new Error("ACCESS_CODE_SECRET no está configurado (mínimo 32 caracteres).");
  }
  return s;
}

function firmar(payload: string): string {
  return createHmac("sha256", secreto()).update(payload).digest("base64url").slice(0, 22);
}

export function crearCodigo(datos: DatosAcceso): string {
  const payload = Buffer.from(JSON.stringify(datos)).toString("base64url");
  return `DBX-${payload}.${firmar(payload)}`;
}

export function verificarCodigo(codigo: string, producto: string): DatosAcceso | null {
  const limpio = codigo.trim().replace(/^DBX-/, "");
  const [payload, firma] = limpio.split(".");
  if (!payload || !firma) return null;

  const esperada = Buffer.from(firmar(payload));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;

  try {
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString()) as DatosAcceso;
    if (datos.p !== producto) return null;
    if (datos.x * 1000 < Date.now()) return null;
    return datos;
  } catch {
    return null;
  }
}
