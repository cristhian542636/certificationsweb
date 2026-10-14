#!/usr/bin/env node
// Valida la estructura del banco de preguntas y compara su distribución con los pesos del examen.
// Uso: npm run validar-preguntas

import { readFileSync, readdirSync } from "node:fs";

// Mantener sincronizado con PESOS en src/lib/tipos.ts (guía oficial, mayo 2026).
const PESOS = { plataforma: 6, ingesta: 21, transformacion: 22, jobs: 16, cicd: 10, optimizacion: 10, gobierno: 15 };
const DOMINIOS = Object.keys(PESOS);
const errores = [];
const ids = new Set();
const conteo = Object.fromEntries(DOMINIOS.map((d) => [d, { gratis: 0, premium: 0 }]));
const respuestas = [0, 0, 0, 0];

for (const archivo of readdirSync("data/preguntas").filter((f) => f.endsWith(".json"))) {
  const tipo = archivo.startsWith("gratis") ? "gratis" : "premium";
  const preguntas = JSON.parse(readFileSync(`data/preguntas/${archivo}`, "utf8"));
  for (const p of preguntas) {
    const donde = `${archivo} ${p.id ?? "(sin id)"}`;
    if (!p.id || ids.has(p.id)) errores.push(`${donde}: id vacío o duplicado`);
    ids.add(p.id);
    if (!DOMINIOS.includes(p.dominio)) errores.push(`${donde}: dominio inválido "${p.dominio}"`);
    if (!p.enunciado?.trim()) errores.push(`${donde}: enunciado vacío`);
    if (!Array.isArray(p.opciones) || p.opciones.length !== 4) errores.push(`${donde}: debe tener 4 opciones`);
    if (new Set(p.opciones).size !== p.opciones?.length) errores.push(`${donde}: opciones repetidas`);
    if (!Number.isInteger(p.correcta) || p.correcta < 0 || p.correcta >= (p.opciones?.length ?? 0))
      errores.push(`${donde}: índice de respuesta correcta inválido`);
    if (!p.explicacion?.trim()) errores.push(`${donde}: falta la explicación`);
    if (conteo[p.dominio]) conteo[p.dominio][tipo]++;
    respuestas[p.correcta] = (respuestas[p.correcta] ?? 0) + 1;
  }
}

const total = ids.size;
console.log(`Total: ${total} preguntas\n`);
console.log("Dominio".padEnd(16), "Gratis", "Premium", "Total", " % banco", " % examen");
for (const d of DOMINIOS) {
  const { gratis, premium } = conteo[d];
  const pct = (((gratis + premium) / total) * 100).toFixed(0);
  console.log(d.padEnd(16), String(gratis).padStart(6), String(premium).padStart(7), String(gratis + premium).padStart(5), `${pct}%`.padStart(8), `${PESOS[d]}%`.padStart(9));
}
const simulacros = Math.floor(total / 45);
console.log(`\nSimulacros completos (45) sin repetir preguntas: ${simulacros}`);
console.log("Distribución de respuestas correctas (A-D):", respuestas.join(" / "));
if (errores.length) {
  console.error(`\n${errores.length} error(es):\n- ${errores.join("\n- ")}`);
  process.exit(1);
}
console.log("OK");
