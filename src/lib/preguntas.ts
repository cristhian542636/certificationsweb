import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Dominio, Pregunta } from "./tipos";

const DIR = path.join(process.cwd(), "data", "preguntas");

async function leer(archivo: string): Promise<Pregunta[]> {
  const contenido = await readFile(path.join(DIR, archivo), "utf8");
  return JSON.parse(contenido) as Pregunta[];
}

export function preguntasGratis() {
  return leer("gratis.json");
}

export async function todasLasPreguntas() {
  const [gratis, premium] = await Promise.all([leer("gratis.json"), leer("premium.json")]);
  return [...gratis, ...premium];
}

/** Conteos reales del banco para mostrarlos en la web (no exponen el contenido premium). */
export async function estadisticasBanco() {
  const [gratis, todas] = await Promise.all([preguntasGratis(), todasLasPreguntas()]);
  const porDominio = {} as Record<Dominio, number>;
  for (const p of todas) porDominio[p.dominio] = (porDominio[p.dominio] ?? 0) + 1;
  return { total: todas.length, gratis: gratis.length, porDominio };
}
