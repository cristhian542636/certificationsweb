export const DOMINIOS = {
  plataforma: "Databricks Intelligence Platform",
  ingesta: "Desarrollo e ingesta",
  transformacion: "Procesamiento y transformación de datos",
  produccion: "Pipelines en producción",
  gobierno: "Gobierno y calidad de datos",
} as const;

export type Dominio = keyof typeof DOMINIOS;

export const TEMAS: Record<Dominio, string[]> = {
  plataforma: ["Lakehouse y Delta Lake", "Time travel, OPTIMIZE y VACUUM", "SQL warehouses y cómputo", "Asset Bundles y Git folders"],
  ingesta: ["Auto Loader y evolución de esquema", "COPY INTO", "Structured Streaming y checkpoints", "Triggers availableNow"],
  transformacion: ["MERGE INTO y upserts", "Funciones de ventana y deduplicación", "Arrays: explode, TRANSFORM, FILTER", "Tablas administradas vs. externas"],
  produccion: ["Lakeflow Declarative Pipelines", "Expectations de calidad", "AUTO CDC / SCD tipo 2", "Lakeflow Jobs y repair run"],
  gobierno: ["Unity Catalog y privilegios", "Column masks y row filters", "Linaje de datos", "Delta Sharing"],
};

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
  modo: Modo;
  dominio?: Dominio;
}

export const MODOS = ["practica", "examen", "diagnostico", "dominio", "repaso"] as const;
export type Modo = (typeof MODOS)[number];

export function esModo(m: unknown): m is Modo {
  return typeof m === "string" && (MODOS as readonly string[]).includes(m);
}
