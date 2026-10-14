// Configuración central del sitio. Edita estos valores antes de publicar.

export const sitio = {
  nombre: "DataCert",
  dominio: "datacert.pe",
  eslogan: "Certifícate en Databricks practicando como en producción",
  instructor: {
    nombre: "Tu Nombre",
    titulo: "Senior Data Engineer · Docente en la UNI",
    bio: "Más de 7 años construyendo plataformas de datos con Databricks, AWS y Spark. Hoy diseño pipelines Medallion con CDC para el sector seguros y enseño ingeniería de datos en la UNI.",
    linkedin: "https://www.linkedin.com/in/tu-usuario",
    iniciales: "TN",
  },
  producto: {
    id: "dbx-associate",
    nombre: "Databricks Data Engineer Associate · Premium",
    descripcion: "Simulador completo Databricks Data Engineer Associate (12 meses)",
    precio: 29.9,
    precioAnterior: 59.9,
    moneda: "PEN",
    mesesAcceso: 12,
  },
  contacto: {
    // Número de WhatsApp con código de país, sin "+" ni espacios. Ej: 51987654321
    whatsapp: "51900000000",
    email: "hola@datacert.pe",
    // Enlace a tu Libro de Reclamaciones virtual (obligatorio en Perú para negocios en línea).
    libroReclamaciones: "/libro-de-reclamaciones",
  },
  examen: {
    preguntasReales: 45,
    minutosReales: 90,
    porcentajeAprobacion: 70,
  },
} as const;

export function formatoSoles(monto: number) {
  return `S/ ${monto.toFixed(2)}`;
}

export function enlaceWhatsApp(mensaje: string) {
  return `https://wa.me/${sitio.contacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
