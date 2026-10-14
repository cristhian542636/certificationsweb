import Link from "next/link";
import { sitio, enlaceWhatsApp } from "@/config/sitio";

/** Momento posterior al pago: refuerza la decisión y muestra qué hacer primero. */
export default function BienvenidaPremium({ detalle }: { detalle?: string }) {
  const desbloqueado = [
    ["📚", "Banco completo", "Todas las preguntas, en todos los dominios."],
    ["⏱", "Simulacros reales", `${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos.`],
    ...(sitio.acompanamiento.dudasPorWhatsapp
      ? [["💬", "Acompañamiento", `Consulta tus dudas con ${sitio.instructor.nombre.split(" ")[0]} por WhatsApp.`]]
      : []),
  ];
  return (
    <div className="tarjeta relative overflow-hidden p-8 text-center md:p-10">
      <div className="resplandor pointer-events-none absolute inset-0" />
      <div className="relative">
        <p className="text-4xl" aria-hidden>🎉</p>
        <h2 className="mt-4 text-2xl font-semibold">¡Ya eres Premium!</h2>
        <p className="mt-2 text-tenue">{detalle ?? "Tu acceso ya está activo."} Esto es lo que acabas de desbloquear:</p>
        <ul className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          {desbloqueado.map(([icono, titulo, texto]) => (
            <li key={titulo} className="rounded-lg border border-borde bg-fondo p-4">
              <p className="text-xl" aria-hidden>{icono}</p>
              <p className="mt-2 text-sm font-semibold">{titulo}</p>
              <p className="mt-1 text-xs text-tenue">{texto}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/panel" className="btn-primario px-6 py-3">Ver mi plan →</Link>
          {sitio.acompanamiento.dudasPorWhatsapp && (
            <a
              href={enlaceWhatsApp(`¡Hola ${sitio.instructor.nombre.split(" ")[0]}! Acabo de unirme a ${sitio.nombre} Premium. `)}
              target="_blank"
              rel="noreferrer"
              className="btn-secundario px-6 py-3"
            >
              Saludar al instructor
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
