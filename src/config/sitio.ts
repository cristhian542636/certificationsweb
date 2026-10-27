// Configuración central del sitio. Edita estos valores antes de publicar.

import { CERT_ACTUAL, PUBLICADAS, type Certificacion } from "./certificaciones";

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
  moneda: "PEN",
  // Precio de lanzamiento: mientras sea true se cobra precioLanzamiento y se muestra el precio normal tachado.
  lanzamiento: true,
  // Pases de pago único por certificación (sin renovación automática: Yape no admite cobros recurrentes).
  // nivel: a qué certificaciones aplica ("todas" = todas las publicadas; se muestra desde minimoCertificaciones).
  pases: [
    {
      id: "associate-60",
      nombre: "Pase 60 días",
      nivel: "associate",
      dias: 60,
      precio: 79,
      precioLanzamiento: 59,
      nota: "para repasar antes del examen",
    },
    {
      id: "associate-120",
      nombre: "Pase 120 días",
      nivel: "associate",
      dias: 120,
      precio: 119,
      precioLanzamiento: 89,
      nota: "cubre todo tu ciclo de estudio",
      destacado: true,
    },
    {
      id: "professional-120",
      nombre: "Pase 120 días",
      nivel: "professional",
      dias: 120,
      precio: 159,
      nota: "cubre todo tu ciclo de estudio",
      destacado: true,
    },
    {
      id: "todo-databricks",
      nombre: "Todo Databricks",
      nivel: "todas",
      dias: 365,
      precio: 299,
      nota: "todas las certificaciones publicadas",
      minimoCertificaciones: 3,
    },
  ],
  // Si no apruebas, extendemos tu acceso una vez por certificación (gratis), con estas condiciones.
  garantia: { dias: 60, minimoSimulacros: 2, plazoDias: 15 },
  // Programa de referidos: quien invita recibe días gratis cuando su invitado compra; el invitado, un descuento.
  referidos: { diasInvitador: 30, descuento: 0.1 },
  // Protección contra cuentas compartidas.
  seguridad: { maxDispositivos: 2, preguntasPorDia: 300 },
  contacto: {
    // Número de WhatsApp con código de país, sin "+" ni espacios. Ej: 51987654321
    whatsapp: "51913464926",
    email: "natividad289@gmail.com",
    // Enlace a tu Libro de Reclamaciones virtual (obligatorio en Perú para negocios en línea).
    libroReclamaciones: "/libro-de-reclamaciones",
  },
  // Datos del examen de la certificación actual (ver src/config/certificaciones.ts).
  examen: {
    preguntasReales: CERT_ACTUAL.examen.preguntas,
    minutosReales: CERT_ACTUAL.examen.minutos,
    correctasAprobacion: CERT_ACTUAL.examen.correctasAprobacion,
    porcentajeAprobacion: CERT_ACTUAL.examen.porcentajeAprobacion,
    costoUsd: CERT_ACTUAL.examen.costoUsd,
    idioma: CERT_ACTUAL.examen.idioma,
  },
  // Preguntas frecuentes sobre el examen oficial (portada y portada Premium). Los descuentos los define Databricks:
  // no prometas fechas ni montos que no estén en su comunidad oficial.
  faqExamen: [
    {
      p: "¿El examen es en español?",
      r: `No: el examen oficial no se ofrece en español, así que lo rendirás en ${CERT_ACTUAL.examen.idioma}. Aquí aprendes en español y, con un clic (ES/EN), ves cada pregunta en ${CERT_ACTUAL.examen.idioma} para practicar como el día del examen. Las explicaciones siempre están en español.`,
    },
    {
      p: "¿Puedo conseguir descuento para el examen?",
      r: "Databricks organiza varias veces al año un Learning Festival: si completas una ruta de aprendizaje gratuita de Databricks Academy dentro de las fechas del evento, puedes recibir un cupón de 50% para un examen. Las fechas y condiciones las define Databricks y cambian, así que revísalas en su comunidad oficial. Un buen plan: completa la ruta mientras practicas aquí y agenda tu examen con el cupón.",
    },
  ],
  acompanamiento: {
    // Los alumnos Premium pueden escribirte por WhatsApp sobre una pregunta concreta del simulador.
    // Es una promesa de servicio: ponla en false si un día no puedes sostenerla.
    dudasPorWhatsapp: true,
    tiempoRespuesta: "en menos de 24 horas",
  },
  // Nivel inicial del alumno (onboarding) y semanas de estudio sugeridas para cada uno.
  niveles: [
    { id: "nuevo", nombre: "Recién empiezo", detalle: "Nunca he usado Databricks", semanas: 8 },
    { id: "basico", nombre: "Lo he usado poco", detalle: "Algunos notebooks o cursos", semanas: 6 },
    { id: "intermedio", nombre: "Lo uso en mi trabajo", detalle: "Pipelines, SQL, Spark", semanas: 4 },
    { id: "avanzado", nombre: "Lo uso a diario", detalle: "Solo quiero practicar el examen", semanas: 2 },
  ],
} as const;

export type Pase = (typeof sitio.pases)[number];
export type PaseId = Pase["id"];

export function obtenerPase(id: unknown): Pase | undefined {
  return sitio.pases.find((p) => p.id === id);
}

/** Pases que se venden para una certificación. */
export function pasesPara(cert: Certificacion): Pase[] {
  return sitio.pases.filter((p) =>
    p.nivel === "todas" ? PUBLICADAS.length >= ("minimoCertificaciones" in p ? p.minimoCertificaciones : 1) : p.nivel === cert.nivel,
  );
}

/** Lo que se cobra hoy (precio de lanzamiento si está vigente). */
export function precioVigente(pase: Pase) {
  return sitio.lanzamiento && "precioLanzamiento" in pase ? pase.precioLanzamiento : pase.precio;
}

/** Precio tachado que se muestra durante el lanzamiento. */
export function precioAnterior(pase: Pase) {
  return precioVigente(pase) < pase.precio ? pase.precio : null;
}

/** Precio con el descuento de referido, redondeado a 10 céntimos. */
export function precioConDescuento(pase: Pase, conDescuento: boolean) {
  const base = precioVigente(pase);
  return conDescuento ? Math.round(base * (1 - sitio.referidos.descuento) * 10) / 10 : base;
}

/** Certificación que otorga un pase: "*" (todas) o la elegida. */
export function alcanceDe(pase: Pase, cert: Certificacion) {
  return pase.nivel === "todas" ? "*" : cert.id;
}

export function esDestacado(pase: Pase) {
  return "destacado" in pase && pase.destacado === true;
}

export const PASES_ACTUALES = pasesPara(CERT_ACTUAL);
export const PASE_DESTACADO: Pase = PASES_ACTUALES.find(esDestacado) ?? PASES_ACTUALES[0];
export const PRECIO_DESDE = Math.min(...PASES_ACTUALES.map(precioVigente));

/** Duración legible: "60 días", "12 meses". */
export function duracion(pase: Pase) {
  return pase.dias === 365 ? "12 meses" : `${pase.dias} días`;
}

export function formatoSoles(monto: number) {
  return `S/ ${Number.isInteger(monto) ? monto : monto.toFixed(2)}`;
}

export function enlaceWhatsApp(mensaje: string) {
  return `https://wa.me/${sitio.contacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export type NivelAlumno = (typeof sitio.niveles)[number]["id"];

export function obtenerNivel(id: unknown) {
  return sitio.niveles.find((n) => n.id === id);
}

/** Mensaje de WhatsApp para consultar al instructor sobre una pregunta del simulador. */
export function enlaceDuda(preguntaId: string, tema: string) {
  return enlaceWhatsApp(
    `Hola ${sitio.instructor.nombre.split(" ")[0]}, tengo Premium en ${sitio.nombre}. Tengo una duda sobre la pregunta ${preguntaId} (${tema}): `,
  );
}
