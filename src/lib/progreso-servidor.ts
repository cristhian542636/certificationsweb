import "server-only";
import type { Sesion } from "./sesion";
import { clienteServidor } from "./supabase/servidor";
import { preguntasGratis, todasLasPreguntas } from "./preguntas";
import { calcularProgreso, type Resumen } from "./progreso";
import type { Dominio, Pregunta } from "./tipos";

const VACIO: Resumen = { ultimas: [], dias: [], intentos: [] };

function contar(preguntas: Pregunta[]) {
  const conteo: Partial<Record<Dominio, number>> = {};
  for (const p of preguntas) conteo[p.dominio] = (conteo[p.dominio] ?? 0) + 1;
  return conteo;
}

/** Resumen del alumno con el dominio de cada respuesta tomado del banco vigente (por si una pregunta se reclasificó). */
export async function obtenerResumen(): Promise<Resumen> {
  const supabase = await clienteServidor();
  const [{ data, error }, banco] = await Promise.all([supabase.rpc("mi_resumen"), todasLasPreguntas()]);
  if (error || !data) return VACIO; // p. ej. migración 0003 aún no aplicada
  const dominioDe = new Map(banco.map((p) => [p.id, p.dominio]));
  const resumen = data as Resumen;
  return {
    ...resumen,
    ultimas: resumen.ultimas
      .filter((r) => dominioDe.has(r.pregunta_id))
      .map((r) => ({ ...r, dominio: dominioDe.get(r.pregunta_id)! })),
  };
}

export async function preguntasAccesibles(sesion: Sesion) {
  return sesion.premium ? todasLasPreguntas() : preguntasGratis();
}

export async function obtenerProgreso(sesion: Sesion) {
  const [resumen, todas, accesibles] = await Promise.all([obtenerResumen(), todasLasPreguntas(), preguntasAccesibles(sesion)]);
  return calcularProgreso(resumen, {
    total: contar(todas),
    disponibles: contar(accesibles),
    idsDisponibles: new Set(accesibles.map((p) => p.id)),
  });
}
