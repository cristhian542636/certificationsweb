// Secciones de la guía oficial del examen (versión vigente desde el 4 de mayo de 2026) y su peso.
export const DOMINIOS = {
  plataforma: "Databricks Intelligence Platform",
  ingesta: "Ingesta y carga de datos",
  transformacion: "Transformación y modelado de datos",
  jobs: "Trabajo con Lakeflow Jobs",
  cicd: "Implementación de CI/CD",
  optimizacion: "Troubleshooting, monitoreo y optimización",
  gobierno: "Gobierno y seguridad",
} as const;

export type Dominio = keyof typeof DOMINIOS;

/** Peso de cada sección en el examen real (suma 100). */
export const PESOS: Record<Dominio, number> = {
  plataforma: 6,
  ingesta: 21,
  transformacion: 22,
  jobs: 16,
  cicd: 10,
  optimizacion: 10,
  gobierno: 15,
};

export const TEMAS: Record<Dominio, string[]> = {
  plataforma: ["Delta Lake y Unity Catalog", "Arquitectura y planos de cómputo", "Tipos de cómputo y costos"],
  ingesta: ["Auto Loader y evolución de esquema", "COPY INTO", "Lakeflow Connect", "JDBC y APIs REST", "JSON y datos anidados"],
  transformacion: ["Limpieza bronze → silver", "Joins, union y deduplicación", "Tuning básico de Spark", "Vistas materializadas y streaming tables", "Calidad con expectations"],
  jobs: ["Tareas y DAG", "Reintentos, If/else y For each", "Triggers: programados, llegada de archivos, actualización de tablas"],
  cicd: ["Git folders", "Declarative Automation Bundles", "Databricks CLI"],
  optimizacion: ["Spark UI: skew, shuffle y spill", "Liquid Clustering y Predictive Optimization", "Fallas de clúster, librerías y memoria", "Historial de ejecuciones"],
  gobierno: ["Tablas administradas vs. externas", "GRANT y REVOKE", "Column masks y row filters", "Políticas ABAC"],
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
  nuevas: number; // preguntas que el alumno nunca había respondido
  accesibles: number; // preguntas totales a las que tiene acceso con su plan
}

export const MODOS = ["practica", "examen", "diagnostico", "dominio", "repaso"] as const;
export type Modo = (typeof MODOS)[number];

export function esModo(m: unknown): m is Modo {
  return typeof m === "string" && (MODOS as readonly string[]).includes(m);
}
