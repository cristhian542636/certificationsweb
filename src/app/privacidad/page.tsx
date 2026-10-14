import type { Metadata } from "next";
import PaginaLegal from "@/components/PaginaLegal";
import { sitio } from "@/config/sitio";

export const metadata: Metadata = { title: "Política de privacidad" };

// Conforme a la Ley N.º 29733. Operado como persona natural; al obtener RUC, agrega el número y el domicilio.
export default function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="octubre 2026">
      <p>
        En {sitio.nombre} protegemos tus datos personales conforme a la Ley N.º 29733, Ley de Protección de Datos
        Personales, y su reglamento. El responsable del tratamiento es <strong>{sitio.instructor.nombre}</strong> (persona natural), contacto: {sitio.contacto.email}.
      </p>

      <h2>Qué datos recopilamos</h2>
      <ul>
        <li>Datos de registro: nombre y correo electrónico.</li>
        <li>Datos de uso: resultados de tus prácticas y simulacros.</li>
        <li>
          Datos de compra: monto, fecha, medio de pago y estado. Los datos de tu tarjeta o cuenta Yape los procesa
          Mercado Pago y nunca llegan a nuestros servidores.
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Darte acceso al simulador y mostrarte tu progreso.</li>
        <li>Gestionar tus pagos y comprobantes.</li>
        <li>Enviarte comunicaciones sobre el servicio y, si lo aceptas, novedades y nuevos cursos.</li>
      </ul>

      <h2>Con quién los compartimos</h2>
      <p>
        Solo con proveedores necesarios para operar el servicio: Supabase (base de datos y autenticación), Vercel
        (hosting) y Mercado Pago (pagos). No vendemos ni cedemos tus datos a terceros.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (ARCO) escribiendo a{" "}
        {sitio.contacto.email}. Atenderemos tu solicitud en los plazos que establece la ley.
      </p>
    </PaginaLegal>
  );
}
