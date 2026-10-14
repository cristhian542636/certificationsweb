#!/usr/bin/env node
// Genera un código de acceso premium después de verificar un pago de Yape.
// Uso: npm run generar-codigo -- correo@alumno.com [meses]
// Requiere ACCESS_CODE_SECRET en .env.local (la misma clave configurada en Vercel).
// Mantener sincronizado con src/lib/acceso.ts.

import { createHmac } from "node:crypto";
import { readFileSync, existsSync, appendFileSync } from "node:fs";

const PRODUCTO = "dbx-associate";

function cargarSecreto() {
  if (process.env.ACCESS_CODE_SECRET) return process.env.ACCESS_CODE_SECRET;
  for (const archivo of [".env.local", ".env"]) {
    if (!existsSync(archivo)) continue;
    const linea = readFileSync(archivo, "utf8")
      .split("\n")
      .find((l) => l.startsWith("ACCESS_CODE_SECRET="));
    if (linea) return linea.slice("ACCESS_CODE_SECRET=".length).trim();
  }
  return "";
}

const [email, mesesArg] = process.argv.slice(2);
const meses = Number(mesesArg ?? 12);
const secreto = cargarSecreto();

if (!email || !/\S+@\S+\.\S+/.test(email) || !Number.isFinite(meses) || meses <= 0) {
  console.error("Uso: npm run generar-codigo -- correo@alumno.com [meses]");
  process.exit(1);
}
if (secreto.length < 32) {
  console.error("Falta ACCESS_CODE_SECRET (mínimo 32 caracteres) en .env.local");
  process.exit(1);
}

const expira = new Date();
expira.setMonth(expira.getMonth() + meses);
const datos = { e: email.toLowerCase(), p: PRODUCTO, x: Math.floor(expira.getTime() / 1000) };
const payload = Buffer.from(JSON.stringify(datos)).toString("base64url");
const firma = createHmac("sha256", secreto).update(payload).digest("base64url").slice(0, 22);
const codigo = `DBX-${payload}.${firma}`;

// Registro local de ventas (ignorado por git).
appendFileSync("ventas.csv", `${new Date().toISOString()},${datos.e},${PRODUCTO},${expira.toISOString()}\n`);

console.log(`\nCódigo para ${datos.e} (vence ${expira.toLocaleDateString("es-PE")}):\n\n${codigo}\n`);
