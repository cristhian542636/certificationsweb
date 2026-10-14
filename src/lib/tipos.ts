export const DOMINIOS = {
  plataforma: "Databricks Intelligence Platform",
  ingesta: "Desarrollo e ingesta",
  transformacion: "Procesamiento y transformación de datos",
  produccion: "Pipelines en producción",
  gobierno: "Gobierno y calidad de datos",
} as const;

export type Dominio = keyof typeof DOMINIOS;

export interface Pregunta {
  id: string;
  dominio: Dominio;
  enunciado: string;
  /** Bloque de código opcional que acompaña al enunciado. */
  codigo?: string;
  opciones: string[];
  /** Índice (base 0) de la opción correcta. */
  correcta: number;
  explicacion: string;
  /** Enlace a la documentación oficial que respalda la respuesta. */
  referencia?: string;
}

export interface RespuestaPreguntas {
  premium: boolean;
  preguntas: Pregunta[];
}
