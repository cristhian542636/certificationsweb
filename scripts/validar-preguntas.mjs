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

// Traducción al inglés (modo EN del simulador): cada pregunta debe tener enunciado y 4 opciones distintas.
const en = JSON.parse(readFileSync("data/traducciones/en.json", "utf8"));
for (const id of ids) {
  const t = en[id];
  if (!t?.enunciado?.trim()) errores.push(`traducciones/en.json ${id}: falta la traducción`);
  else if (!Array.isArray(t.opciones) || t.opciones.length !== 4 || new Set(t.opciones).size !== 4)
    errores.push(`traducciones/en.json ${id}: debe tener 4 opciones distintas`);
}
for (const id of Object.keys(en)) if (!ids.has(id)) errores.push(`traducciones/en.json ${id}: no existe en el banco`);

// Pistas en las opciones: que la correcta sea casi siempre la más larga (o casi nunca) permite acertar sin saber.
// En el examen oficial las cuatro opciones son plausibles y de largo parecido.
const MAX_CORRECTA_MAS_LARGA = 0.35;
const MIN_CORRECTA_MAS_LARGA = 0.08;
const ABSOLUTOS = /\b(always|never|any|only)\b/i;
const pistas = [];
const todas = readdirSync("data/preguntas")
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(readFileSync(`data/preguntas/${f}`, "utf8")));
for (const [idioma, opcionesDe] of [
  ["español", (p) => p.opciones],
  ["inglés", (p) => en[p.id]?.opciones ?? p.opciones],
]) {
  let masLarga = 0;
  for (const p of todas) {
    const largos = opcionesDe(p).map((o) => o.length);
    const max = Math.max(...largos);
    if (largos[p.correcta] === max && largos.filter((l) => l === max).length === 1) masLarga++;
  }
  const proporcion = masLarga / todas.length;
  const texto = `correcta = opción más larga en ${idioma}: ${(proporcion * 100).toFixed(0)}% (ideal ~25%)`;
  console.log(texto);
  if (proporcion > MAX_CORRECTA_MAS_LARGA) errores.push(`${texto}: iguala el largo de las opciones o alarga las distractoras`);
  else if (proporcion < MIN_CORRECTA_MAS_LARGA) pistas.push(`${texto}: la correcta casi nunca es la más larga`);
}
const absolutos = todas.filter((p) => (en[p.id]?.opciones ?? []).some((o, i) => i !== p.correcta && ABSOLUTOS.test(o.replace(/`[^`]*`/g, ""))));
if (absolutos.length > 25) pistas.push(`${absolutos.length} preguntas tienen absolutos (always/never/any/only) en distractoras en inglés: ${absolutos.map((p) => p.id).join(", ")}`);

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
if (pistas.length) console.warn(`\nAvisos:\n- ${pistas.join("\n- ")}`);
if (errores.length) {
  console.error(`\n${errores.length} error(es):\n- ${errores.join("\n- ")}`);
  process.exit(1);
}
console.log(`Traducidas al inglés: ${Object.keys(en).length}`);
console.log("OK");
