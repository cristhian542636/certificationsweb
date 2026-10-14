// Cálculo del progreso del alumno a partir de mi_resumen() (funciones puras, sin acceso a datos).

import { DOMINIOS, type Dominio } from "./tipos";

export interface UltimaRespuesta {
  pregunta_id: string;
  dominio: Dominio;
  correcta: boolean;
  veces: number;
}

export interface IntentoResumen {
  modo: string;
  total: number;
  correctas: number;
  creado_en: string;
}

export interface Resumen {
  ultimas: UltimaRespuesta[];
  dias: string[]; // fechas YYYY-MM-DD (hora de Lima), más reciente primero
  intentos: IntentoResumen[]; // más antiguo primero
}

export type Nivel = "sin_empezar" | "bronce" | "plata" | "oro";

export interface ProgresoDominio {
  dominio: Dominio;
  respondidas: number;
  correctas: number;
  disponibles: number; // preguntas del dominio a las que el alumno tiene acceso
  totalBanco: number; // preguntas del dominio en el banco completo
  precision: number; // 0–1, sobre la última respuesta de cada pregunta
  confianza: number; // 0–1, cuánta evidencia hay (cobertura del dominio)
  puntaje: number; // precision × confianza
  nivel: Nivel;
}

export interface Progreso {
  indice: number; // 0–100
  etiqueta: string;
  dominios: ProgresoDominio[];
  respondidas: number;
  errores: string[]; // preguntas cuya última respuesta fue incorrecta
  racha: number;
  diasActivos: Set<string>;
  intentos: IntentoResumen[];
}

/** Preguntas por dominio que se consideran evidencia suficiente para medir el dominio. */
const META_POR_DOMINIO = 10;

export const NIVELES: Record<Nivel, { nombre: string; color: string }> = {
  sin_empezar: { nombre: "Sin empezar", color: "var(--color-borde-fuerte)" },
  bronce: { nombre: "Bronce", color: "var(--color-bronce)" },
  plata: { nombre: "Plata", color: "var(--color-plata)" },
  oro: { nombre: "Oro", color: "var(--color-oro)" },
};

export function etiquetaIndice(indice: number) {
  if (indice >= 85) return "Nivel de examen alcanzado";
  if (indice >= 70) return "Muy cerca del nivel de examen";
  if (indice >= 40) return "Avanzando";
  return "Construyendo bases";
}

function nivelDominio(respondidas: number, precision: number, confianza: number): Nivel {
  if (respondidas === 0) return "sin_empezar";
  if (precision >= 0.8 && confianza >= 0.8) return "oro";
  if (precision >= 0.6 && confianza >= 0.5) return "plata";
  return "bronce";
}

/** Días consecutivos practicando, contando desde hoy (o desde ayer si hoy aún no practicó). */
export function calcularRacha(dias: string[], hoy: string) {
  const activos = new Set(dias);
  const cursor = new Date(`${hoy}T12:00:00Z`);
  if (!activos.has(hoy)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let racha = 0;
  while (activos.has(cursor.toISOString().slice(0, 10))) {
    racha++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return racha;
}

/** Fecha de hoy en Lima (YYYY-MM-DD). */
export function hoyLima(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(fecha);
}

export function diasEntre(desde: string, hasta: string) {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 864e5);
}

export function calcularProgreso(
  resumen: Resumen,
  banco: { disponibles: Partial<Record<Dominio, number>>; total: Partial<Record<Dominio, number>> },
  hoy = hoyLima(),
): Progreso {
  const dominios = (Object.keys(DOMINIOS) as Dominio[]).map((dominio) => {
    const propias = resumen.ultimas.filter((r) => r.dominio === dominio);
    const respondidas = propias.length;
    const correctas = propias.filter((r) => r.correcta).length;
    const totalBanco = banco.total[dominio] ?? 0;
    const precision = respondidas ? correctas / respondidas : 0;
    const meta = Math.max(1, Math.min(META_POR_DOMINIO, totalBanco));
    const confianza = Math.min(1, respondidas / meta);
    return {
      dominio,
      respondidas,
      correctas,
      disponibles: banco.disponibles[dominio] ?? 0,
      totalBanco,
      precision,
      confianza,
      puntaje: precision * confianza,
      nivel: nivelDominio(respondidas, precision, confianza),
    };
  });

  // Todos los dominios pesan igual: el alumno debe estar listo en cada uno.
  const indice = Math.round((dominios.reduce((s, d) => s + d.puntaje, 0) / dominios.length) * 100);

  // Con poca evidencia el índice es bajo por definición: el mensaje reconoce el buen comienzo en vez de desanimar.
  const respondidas = resumen.ultimas.length;
  const aciertoGlobal = respondidas ? resumen.ultimas.filter((r) => r.correcta).length / respondidas : 0;
  const etiqueta =
    respondidas > 0 && respondidas < 20
      ? aciertoGlobal >= 0.7
        ? "¡Buen comienzo! Sigue practicando"
        : "Primeros pasos: cada práctica suma"
      : etiquetaIndice(indice);

  return {
    indice,
    etiqueta,
    dominios,
    respondidas: resumen.ultimas.length,
    errores: resumen.ultimas.filter((r) => !r.correcta).map((r) => r.pregunta_id),
    racha: calcularRacha(resumen.dias, hoy),
    diasActivos: new Set(resumen.dias),
    intentos: resumen.intentos,
  };
}

export interface Paso {
  titulo: string;
  texto: string;
  cta: string;
  href: string;
  tipo: "accion" | "premium";
}

/** Una sola recomendación clara: lo más útil que el alumno puede hacer ahora. */
export function siguientePaso(p: Progreso, premium: boolean, nombresDominio = DOMINIOS): Paso {
  if (p.respondidas === 0) {
    return {
      titulo: "Haz tu diagnóstico",
      texto: "10 preguntas, dos por cada dominio del examen. En 10 minutos sabrás desde dónde partes.",
      cta: "Empezar diagnóstico",
      href: "/simulador?modo=diagnostico",
      tipo: "accion",
    };
  }

  if (p.errores.length >= 3) {
    return {
      titulo: `Repasa tus ${p.errores.length} errores`,
      texto: "Volver sobre lo que fallaste es la forma más rápida de subir tu índice.",
      cta: "Repasar errores",
      href: "/simulador?modo=repaso",
      tipo: "accion",
    };
  }

  const pendientes = p.dominios
    .filter((d) => d.puntaje < 0.8)
    .sort((a, b) => a.puntaje - b.puntaje);
  const debil = pendientes[0];

  if (debil) {
    const nombre = nombresDominio[debil.dominio];
    const agotado = debil.respondidas >= debil.disponibles;
    if (agotado && !premium && debil.totalBanco > debil.disponibles) {
      return {
        titulo: `Tu punto débil: ${nombre}`,
        texto: `Ya respondiste todas las preguntas gratis de este tema. Premium tiene ${debil.totalBanco - debil.disponibles} más para que lo domines.`,
        cta: "Desbloquear Premium",
        href: "/comprar",
        tipo: "premium",
      };
    }
    if (!agotado) {
      return {
        titulo: `Refuerza ${nombre}`,
        texto: "Es el tema donde hoy tienes menos dominio. Una práctica corta aquí es la que más mueve tu índice.",
        cta: `Practicar ${nombre}`,
        href: `/simulador?modo=dominio&dominio=${debil.dominio}`,
        tipo: "accion",
      };
    }
  }

  if (!premium) {
    return {
      titulo: "Pon a prueba todo lo aprendido",
      texto: "Con Premium accedes al banco completo y a simulacros cronometrados como el examen real.",
      cta: "Ver Premium",
      href: "/comprar",
      tipo: "premium",
    };
  }

  return {
    titulo: "Haz un simulacro completo",
    texto: "Mídete con 45 preguntas en 90 minutos, igual que el día del examen.",
    cta: "Empezar simulacro",
    href: "/simulador?modo=examen",
    tipo: "accion",
  };
}
