#!/usr/bin/env node
// Valida la estructura del banco de preguntas. Uso: npm run validar-preguntas

import { readFileSync, readdirSync } from "node:fs";

const DOMINIOS = ["plataforma", "ingesta", "transformacion", "produccion", "gobierno"];
const errores = [];
const ids = new Set();
const conteo = Object.fromEntries(DOMINIOS.map((d) => [d, 0]));
const respuestas = [0, 0, 0, 0];

for (const archivo of readdirSync("data/preguntas").filter((f) => f.endsWith(".json"))) {
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
    conteo[p.dominio] = (conteo[p.dominio] ?? 0) + 1;
    respuestas[p.correcta] = (respuestas[p.correcta] ?? 0) + 1;
  }
}

console.log(`Total: ${ids.size} preguntas`);
console.log("Por dominio:", conteo);
console.log("Distribución de respuestas correctas (A-D):", respuestas.join(" / "));
if (errores.length) {
  console.error(`\n${errores.length} error(es):\n- ${errores.join("\n- ")}`);
  process.exit(1);
}
console.log("OK");
