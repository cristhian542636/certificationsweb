import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Dominio, Pregunta } from "./tipos";

const DIR = path.join(process.cwd(), "data", "preguntas");
const TRADUCCIONES = path.join(process.cwd(), "data", "traducciones", "en.json");

// Traducción al inglés (id → enunciado y opciones). Es parte del contenido premium: solo se lee en el servidor.
let traducciones: Promise<Record<string, Pregunta["en"]>> | undefined;
function leerTraducciones() {
  traducciones ??= readFile(TRADUCCIONES, "utf8")
    .then((t) => JSON.parse(t) as Record<string, Pregunta["en"]>)
    .catch(() => ({}));
  return traducciones;
}

async function leer(archivo: string): Promise<Pregunta[]> {
  const [contenido, en] = await Promise.all([readFile(path.join(DIR, archivo), "utf8"), leerTraducciones()]);
  return (JSON.parse(contenido) as Pregunta[]).map((p) => (en[p.id] ? { ...p, en: en[p.id] } : p));
}

export function preguntasGratis() {
  return leer("gratis.json");
}

export async function todasLasPreguntas() {
  const [gratis, premium] = await Promise.all([leer("gratis.json"), leer("premium.json")]);
  return [...gratis, ...premium];
}

function contarPorDominio(preguntas: Pregunta[]) {
  const conteo = {} as Record<Dominio, number>;
  for (const p of preguntas) conteo[p.dominio] = (conteo[p.dominio] ?? 0) + 1;
  return conteo;
}

/** Conteos reales del banco para mostrarlos en la web (no exponen el contenido premium). */
export async function estadisticasBanco() {
  const [gratis, todas] = await Promise.all([preguntasGratis(), todasLasPreguntas()]);
  return {
    total: todas.length,
    gratis: gratis.length,
    porDominio: contarPorDominio(todas),
    gratisPorDominio: contarPorDominio(gratis),
  };
}
