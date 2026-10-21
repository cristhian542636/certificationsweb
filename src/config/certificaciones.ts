// Catálogo de certificaciones. Solo las publicadas se muestran en la web.
// Hoy el banco (data/preguntas/) y las secciones (src/lib/tipos.ts) son los de CERT_ACTUAL; al publicar una segunda
// certificación hay que separarlos por id (ver docs/ambientes.md → "Agregar una certificación").

export type NivelCertificacion = "associate" | "professional";

export interface Certificacion {
  id: string;
  proveedor: string;
  nombre: string;
  nombreOficial: string;
  nivel: NivelCertificacion;
  slug: string;
  publicada: boolean;
  /** Versión de la guía oficial del examen en la que se basa el banco. */
  guia: string;
  descripcion: string;
  examen: { preguntas: number; minutos: number; correctasAprobacion: number; porcentajeAprobacion: number; costoUsd: number };
}

export const CERTIFICACIONES: readonly Certificacion[] = [
  {
    id: "dbx-de-associate",
    proveedor: "Databricks",
    nombre: "Data Engineer Associate",
    nombreOficial: "Databricks Certified Data Engineer Associate",
    nivel: "associate",
    slug: "databricks-data-engineer-associate",
    publicada: true,
    guia: "versión del 4 de mayo de 2026",
    descripcion:
      "Ingesta con Auto Loader y Lakeflow Connect, transformación con Spark y pipelines declarativos, Lakeflow Jobs, CI/CD con bundles y gobierno con Unity Catalog.",
    examen: { preguntas: 45, minutos: 90, correctasAprobacion: 32, porcentajeAprobacion: 71, costoUsd: 200 },
  },
];

export const PUBLICADAS = CERTIFICACIONES.filter((c) => c.publicada);

/** Certificación con la que trabaja el alumno. Con más de una publicada, la elegirá en su panel. */
export const CERT_ACTUAL = PUBLICADAS[0];

export const NIVELES_CERTIFICACION: Record<NivelCertificacion, string> = {
  associate: "Associate",
  professional: "Professional",
};

export function obtenerCertificacion(id: unknown) {
  return CERTIFICACIONES.find((c) => c.id === id);
}

export function certificacionPorSlug(slug: string) {
  return PUBLICADAS.find((c) => c.slug === slug);
}
