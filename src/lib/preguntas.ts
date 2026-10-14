import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Pregunta } from "./tipos";

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
