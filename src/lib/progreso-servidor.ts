import "server-only";
import type { Sesion } from "./sesion";
import { clienteServidor } from "./supabase/servidor";
import { estadisticasBanco } from "./preguntas";
import { calcularProgreso, type Resumen } from "./progreso";

const VACIO: Resumen = { ultimas: [], dias: [], intentos: [] };

export async function obtenerResumen(): Promise<Resumen> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("mi_resumen");
  if (error || !data) return VACIO; // p. ej. migración 0003 aún no aplicada
  return data as Resumen;
}

export async function obtenerProgreso(sesion: Sesion) {
  const [resumen, banco] = await Promise.all([obtenerResumen(), estadisticasBanco()]);
  return calcularProgreso(resumen, {
    total: banco.porDominio,
    disponibles: sesion.premium ? banco.porDominio : banco.gratisPorDominio,
  });
}
