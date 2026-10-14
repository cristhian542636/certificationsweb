import type { Metadata } from "next";
import PaginaLegal from "@/components/PaginaLegal";
import { sitio } from "@/config/sitio";

export const metadata: Metadata = { title: "Libro de reclamaciones" };

// Pendiente: reemplazar por un Libro de Reclamaciones virtual conforme al D.S. N.º 011-2011-PCM
// (formulario con hoja numerada y copia automática al correo del consumidor).
export default function LibroReclamaciones() {
  const asunto = encodeURIComponent("Libro de Reclamaciones");
  return (
    <PaginaLegal titulo="Libro de reclamaciones" actualizado="octubre 2026">
      <p>
        Conforme al Código de Protección y Defensa del Consumidor, puedes registrar un reclamo (disconformidad con el
        servicio) o una queja (malestar en la atención).
      </p>
      <p>
        Envía un correo a{" "}
        <a href={`mailto:${sitio.contacto.email}?subject=${asunto}`} className="text-acento hover:underline">
          {sitio.contacto.email}
        </a>{" "}
        indicando tu nombre completo, DNI, domicilio, correo, teléfono, el detalle del reclamo o queja y tu pedido. Te
        responderemos en un plazo máximo de 15 días hábiles.
      </p>
    </PaginaLegal>
  );
}
