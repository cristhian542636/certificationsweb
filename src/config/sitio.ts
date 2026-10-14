// Configuración central del sitio. Edita estos valores antes de publicar.

export const sitio = {
  nombre: "DataCert Academy",
  eslogan: "Certifícate en Databricks con casos reales, en español",
  instructor: {
    nombre: "Tu Nombre",
    titulo: "Data Engineer · Docente en la UNI",
    bio: "Más de 7 años construyendo plataformas de datos con Databricks, AWS y Spark. Hoy lidero pipelines Medallion con CDC en un proyecto real del sector seguros y enseño ingeniería de datos en la UNI.",
    linkedin: "https://www.linkedin.com/in/tu-usuario",
  },
  producto: {
    id: "dbx-associate",
    nombre: "Simulador Databricks Data Engineer Associate",
    precioSoles: 59,
    precioAnteriorSoles: 99,
    duracionAccesoMeses: 12,
  },
  pago: {
    // Número de WhatsApp con código de país, sin "+" ni espacios. Ej: 51987654321
    whatsapp: "51900000000",
    // Nombre que aparece al escanear tu QR de Yape (para que el alumno confirme que es correcto).
    titularYape: "Tu Nombre A.",
    // Reemplaza public/yape-qr.png con la imagen de tu QR de Yape.
    qrImagen: "/yape-qr.png",
  },
  examen: {
    preguntasReales: 45,
    minutosReales: 90,
    porcentajeAprobacion: 70,
  },
} as const;

export function enlaceWhatsApp(mensaje: string) {
  return `https://wa.me/${sitio.pago.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
