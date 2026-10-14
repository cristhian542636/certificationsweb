import type { Metadata } from "next";
import PaginaLegal from "@/components/PaginaLegal";
import { sitio, formatoSoles, duracion } from "@/config/sitio";

export const metadata: Metadata = { title: "Términos y condiciones" };

// Plantilla base: revísala con un abogado y completa tus datos (nombre o razón social, RUC/DNI, domicilio).
export default function Terminos() {
  return (
    <PaginaLegal titulo="Términos y condiciones" actualizado="octubre 2026">
      <p>
        Estos términos regulan el uso de {sitio.dominio} (en adelante, “{sitio.nombre}”), operado por{" "}
        <strong>{sitio.instructor.nombre}</strong>. Al crear una cuenta o realizar una compra aceptas estas condiciones.
      </p>

      <h2>1. El servicio</h2>
      <p>
        {sitio.nombre} ofrece un simulador de preguntas de práctica para la certificación Databricks Data Engineer
        Associate. Las preguntas son originales y tienen fines exclusivamente educativos; no son preguntas reales del
        examen ni garantizan su aprobación. {sitio.nombre} no está afiliado a Databricks, Inc.
      </p>

      <h2>2. Cuenta</h2>
      <p>
        Eres responsable de la confidencialidad de tu contraseña. La cuenta es personal e intransferible: no está
        permitido compartirla ni reproducir, copiar o redistribuir el contenido del simulador.
      </p>

      <h2>3. Precio y pago</h2>
      <p>
        El acceso Premium se vende en pases de pago único (precios con impuestos incluidos):{" "}
        {sitio.planes.map((p) => `${p.nombre} por ${formatoSoles(p.precio)}`).join(" y ")}. Cada pase otorga acceso
        durante {sitio.planes.map((p) => duracion(p)).join(" o ")} desde la compra; si ya tienes un pase activo, el nuevo
        tiempo se suma al vigente. No es una suscripción y no se realizan cobros recurrentes. Los pagos son procesados por Mercado Pago; {sitio.nombre} no almacena datos de tarjetas.
      </p>

      <h2>4. Activación y reembolsos</h2>
      <p>
        El acceso se activa automáticamente al confirmarse el pago. Si tienes un problema con tu compra, escríbenos a{" "}
        {sitio.contacto.email} dentro de los 7 días posteriores y lo revisaremos. También puedes registrar un reclamo en
        nuestro Libro de Reclamaciones.
      </p>

      <h2>5. Cambios</h2>
      <p>
        Podemos actualizar el contenido del simulador y estos términos. Los cambios relevantes se comunicarán por correo
        electrónico.
      </p>

      <h2>6. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República del Perú, incluido el Código de Protección y Defensa del
        Consumidor (Ley N.º 29571).
      </p>
    </PaginaLegal>
  );
}
