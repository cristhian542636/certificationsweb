import type { Metadata } from "next";
import PaginaLegal from "@/components/PaginaLegal";
import { PUBLICADAS } from "@/config/certificaciones";
import { sitio, formatoSoles, duracion, pasesPara, precioVigente } from "@/config/sitio";

export const metadata: Metadata = { title: "Términos y condiciones" };

// Operado como persona natural. Al obtener RUC, agrega el número y el domicilio fiscal aquí y en /privacidad.
export default function Terminos() {
  return (
    <PaginaLegal titulo="Términos y condiciones" actualizado="octubre 2026">
      <p>
        Estos términos regulan el uso del sitio web de {sitio.nombre} (en adelante, “{sitio.nombre}”), operado por{" "}
        <strong>{sitio.instructor.nombre}</strong>, persona natural, con correo de contacto {sitio.contacto.email}. Al crear una cuenta o realizar una compra aceptas estas condiciones.
      </p>

      <h2>1. El servicio</h2>
      <p>
        {sitio.nombre} ofrece simuladores de preguntas de práctica para certificaciones de Databricks (actualmente:{" "}
        {PUBLICADAS.map((c) => c.nombreOficial).join(", ")}). Las preguntas son originales y tienen fines exclusivamente
        educativos; no son preguntas reales del examen ni garantizan su aprobación. {sitio.nombre} no está afiliado a
        Databricks, Inc.
      </p>

      <h2>2. Cuenta</h2>
      <p>
        Eres responsable de la confidencialidad de tu contraseña. La cuenta es personal e intransferible: no está
        permitido compartirla ni reproducir, copiar o redistribuir el contenido del simulador. Puedes usarla en hasta{" "}
        {sitio.seguridad.maxDispositivos} dispositivos a la vez; al iniciar sesión en uno nuevo se cierra la sesión del
        dispositivo usado hace más tiempo. Para proteger el contenido, el simulador muestra tu correo como marca de agua y
        limita la cantidad de preguntas por día a un volumen muy superior al de un uso normal. Si detectamos que una
        cuenta se comparte o se usa para extraer el contenido, podemos suspenderla sin reembolso.
      </p>

      <h2>3. Precio y pago</h2>
      <p>
        El acceso Premium se vende en pases de pago único por certificación (precios con impuestos incluidos):{" "}
        {PUBLICADAS.map(
          (c) =>
            `${c.nombreOficial}: ${pasesPara(c)
              .map((p) => `${duracion(p)} por ${formatoSoles(precioVigente(p))}`)
              .join(" o ")}`,
        ).join("; ")}
        . Cada pase otorga acceso a la certificación elegida desde la compra; si ya tienes un pase activo, el nuevo
        tiempo se suma al vigente. No es una suscripción y no se realizan cobros recurrentes. Los pagos son procesados
        por Mercado Pago; {sitio.nombre} no almacena datos de tarjetas.
      </p>

      <h2>4. Activación y reembolsos</h2>
      <p>
        El acceso se activa automáticamente al confirmarse el pago. Si tienes un problema con tu compra, escríbenos a{" "}
        {sitio.contacto.email} dentro de los 7 días posteriores y lo revisaremos. También puedes registrar un reclamo en
        nuestro Libro de Reclamaciones.
      </p>

      <h2>5. Garantía de acompañamiento</h2>
      <p>
        Si rindes el examen oficial y no lo apruebas, extendemos tu acceso {sitio.garantia.dias} días sin costo, una vez
        por certificación, siempre que: (a) hayas tenido un pase pagado de esa certificación; (b) hayas completado al
        menos {sitio.garantia.minimoSimulacros} simulacros de {sitio.examen.preguntasReales} preguntas antes de la fecha
        de tu examen; y (c) registres tu resultado en tu panel y lo solicites dentro de los {sitio.garantia.plazoDias}{" "}
        días siguientes a esa fecha, enviándonos el reporte de resultado del examen si te lo pedimos. La garantía no es
        un reembolso ni una promesa de aprobación.
      </p>

      <h2>6. Programa de referidos</h2>
      <p>
        Cada alumno tiene un enlace de invitación. Quien crea su cuenta con ese enlace obtiene{" "}
        {Math.round(sitio.referidos.descuento * 100)}% de descuento en su primera compra, y quien lo invitó recibe{" "}
        {sitio.referidos.diasInvitador} días adicionales de acceso cuando esa compra se confirma. Si la compra se
        reembolsa, el beneficio se revierte. No se permite invitarse a uno mismo ni crear cuentas para obtener
        beneficios.
      </p>

      <h2>7. Cambios</h2>
      <p>
        Podemos actualizar el contenido del simulador y estos términos. Los cambios relevantes se comunicarán por correo
        electrónico.
      </p>

      <h2>8. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República del Perú, incluido el Código de Protección y Defensa del
        Consumidor (Ley N.º 29571).
      </p>
    </PaginaLegal>
  );
}
