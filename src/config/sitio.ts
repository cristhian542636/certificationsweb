// Configuración central del sitio. Edita estos valores antes de publicar.

export const sitio = {
  nombre: "DataCert",
  eslogan: "Certifícate en Databricks practicando como en producción",
  instructor: {
    nombre: "Cristhian Natividad",
    titulo: "Tech Leader Data",
    bio: "Ingeniero de sistemas con más de 7 años construyendo plataformas de datos en banca y seguros, donde hoy me desempeño como Tech Leader. Como instructor de Data en instituciones educativas de todo el país, enseño Data Engineering como se aplica en proyectos reales: AWS, Databricks y Spark, de la teoría a producción.",
    linkedin: "https://www.linkedin.com/in/cristhian-alexis-natividad-pe%C3%B1a/",
    iniciales: "CN",
  },
  producto: {
    id: "dbx-associate",
    nombre: "Simulador Databricks Data Engineer Associate",
    moneda: "PEN",
  },
  // Pases de pago único (sin renovación automática: Yape no admite cobros recurrentes).
  planes: [
    {
      id: "mensual",
      nombre: "Pase 1 mes",
      precio: 29.9,
      meses: 1,
      nota: "ideal para repasar antes del examen",
    },
    {
      id: "trimestral",
      nombre: "Pase 3 meses",
      precio: 59.9,
      meses: 3,
      nota: "cubre todo tu ciclo de estudio",
      destacado: true,
    },
  ],
  contacto: {
    // Número de WhatsApp con código de país, sin "+" ni espacios. Ej: 51987654321
    whatsapp: "51913464926",
    email: "natividad289@gmail.com",
    // Enlace a tu Libro de Reclamaciones virtual (obligatorio en Perú para negocios en línea).
    libroReclamaciones: "/libro-de-reclamaciones",
  },
  examen: {
    preguntasReales: 45,
    minutosReales: 90,
    porcentajeAprobacion: 70,
  },
} as const;

export type Plan = (typeof sitio.planes)[number];
export type PlanId = Plan["id"];

export const PLAN_DESTACADO: Plan = sitio.planes.find((p) => "destacado" in p && p.destacado) ?? sitio.planes[0];
export const PRECIO_DESDE = Math.min(...sitio.planes.map((p) => p.precio));

export function obtenerPlan(id: unknown): Plan | undefined {
  return sitio.planes.find((p) => p.id === id);
}

/** Precio equivalente por mes, para mostrar el ahorro del pase largo. */
export function precioMensual(plan: Plan) {
  return plan.precio / plan.meses;
}

/** Duración legible: "1 mes", "3 meses". */
export function duracion(plan: Plan) {
  return plan.meses === 1 ? "1 mes" : `${plan.meses} meses`;
}

export function formatoSoles(monto: number) {
  return `S/ ${monto.toFixed(2)}`;
}

export function enlaceWhatsApp(mensaje: string) {
  return `https://wa.me/${sitio.contacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
