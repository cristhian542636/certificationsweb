// Selección de preguntas para cada sesión del simulador (funciones puras).
//
// Reglas:
// 1. Primero las preguntas que el alumno nunca respondió, luego las que falló y al final las que ya acertó
//    (entre estas, las que respondió menos veces). Así cada simulacro trae la mayor cantidad posible de
//    preguntas nuevas y, cuando el banco se agota, repite primero lo que más necesita repasar.
// 2. En práctica libre y simulacro, la cantidad por dominio sigue los pesos oficiales del examen.

import { DOMINIOS, PESOS, type Dominio, type Modo, type Pregunta } from "./tipos";

export const LIMITE: Record<Modo, number> = {
  diagnostico: 15,
  dominio: 10,
  repaso: 15,
  practica: 15,
  examen: 45,
};

export interface Historial {
  correcta: boolean;
  veces: number;
}

/** Reparte n preguntas entre dominios según los pesos (mayor resto), sin superar lo disponible. */
export function cuotasPorDominio(n: number, disponibles: Partial<Record<Dominio, number>>): Record<Dominio, number> {
  const dominios = Object.keys(DOMINIOS) as Dominio[];
  const cuotas = Object.fromEntries(dominios.map((d) => [d, 0])) as Record<Dominio, number>;
  const totalDisponible = dominios.reduce((s, d) => s + (disponibles[d] ?? 0), 0);
  let restantes = Math.min(n, totalDisponible);

  while (restantes > 0) {
    const activos = dominios.filter((d) => cuotas[d] < (disponibles[d] ?? 0));
    const pesoActivo = activos.reduce((s, d) => s + PESOS[d], 0);
    const ideal = activos.map((d) => ({ d, valor: (restantes * PESOS[d]) / pesoActivo }));
    let asignados = 0;
    for (const { d, valor } of ideal) {
      const extra = Math.min(Math.floor(valor), (disponibles[d] ?? 0) - cuotas[d]);
      cuotas[d] += extra;
      asignados += extra;
    }
    // Reparte lo que falte por mayor resto (y desempata por peso).
    const porResto = ideal
      .filter(({ d }) => cuotas[d] < (disponibles[d] ?? 0))
      .sort((a, b) => b.valor - Math.floor(b.valor) - (a.valor - Math.floor(a.valor)) || PESOS[b.d] - PESOS[a.d]);
    for (const { d } of porResto) {
      if (asignados >= restantes) break;
      cuotas[d]++;
      asignados++;
    }
    if (asignados === 0) break;
    restantes -= asignados;
  }
  return cuotas;
}

function prioridad(historial: Historial | undefined) {
  if (!historial) return 0; // nunca vista
  if (!historial.correcta) return 1; // la falló la última vez
  return 2 + historial.veces; // acertada: primero las menos vistas
}

function mezclar<T>(arr: T[], azar: () => number): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function ordenarPorPrioridad(preguntas: Pregunta[], historial: Map<string, Historial>, azar: () => number) {
  // Mezcla primero para que, a igual prioridad, el orden sea aleatorio.
  return mezclar(preguntas, azar).sort((a, b) => prioridad(historial.get(a.id)) - prioridad(historial.get(b.id)));
}

export interface Seleccion {
  preguntas: Pregunta[];
  nuevas: number; // cuántas nunca había respondido el alumno
}

export function seleccionarPreguntas(
  banco: Pregunta[],
  historial: Map<string, Historial>,
  modo: Modo,
  azar: () => number = Math.random,
): Seleccion {
  const limite = LIMITE[modo];
  let elegidas: Pregunta[];

  if (modo === "practica" || modo === "examen") {
    const porDominio = new Map<Dominio, Pregunta[]>();
    for (const p of banco) porDominio.set(p.dominio, [...(porDominio.get(p.dominio) ?? []), p]);
    const disponibles = Object.fromEntries([...porDominio].map(([d, ps]) => [d, ps.length])) as Partial<Record<Dominio, number>>;
    const cuotas = cuotasPorDominio(limite, disponibles);
    elegidas = [...porDominio].flatMap(([d, ps]) => ordenarPorPrioridad(ps, historial, azar).slice(0, cuotas[d]));
  } else {
    elegidas = ordenarPorPrioridad(banco, historial, azar).slice(0, limite);
  }

  return {
    preguntas: mezclar(elegidas, azar),
    nuevas: elegidas.filter((p) => !historial.has(p.id)).length,
  };
}
