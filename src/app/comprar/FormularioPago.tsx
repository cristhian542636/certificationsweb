"use client";

import { useState } from "react";
import { sitio, enlaceWhatsApp } from "@/config/sitio";

export default function FormularioPago() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [operacion, setOperacion] = useState("");

  const valido = nombre.trim() && /\S+@\S+\.\S+/.test(email) && operacion.trim();

  const mensaje =
    `Hola, acabo de pagar S/ ${sitio.producto.precioSoles} por Yape por el ${sitio.producto.nombre}.\n\n` +
    `Nombre: ${nombre.trim()}\nCorreo: ${email.trim()}\nN° de operación Yape: ${operacion.trim()}\n\n` +
    `Adjunto la captura del pago.`;

  const campo =
    "mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700";

  return (
    <form
      className="mt-8 space-y-4 rounded-xl border border-slate-200 p-6 dark:border-slate-800"
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) window.open(enlaceWhatsApp(mensaje), "_blank", "noopener");
      }}
    >
      <label className="block text-sm">
        Nombre completo
        <input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </label>
      <label className="block text-sm">
        Correo electrónico (aquí quedará asociado tu acceso)
        <input
          type="email"
          className={campo}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        N° de operación de Yape
        <input className={campo} value={operacion} onChange={(e) => setOperacion(e.target.value)} required />
      </label>
      <button
        type="submit"
        disabled={!valido}
        className="w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        Enviar comprobante por WhatsApp
      </button>
    </form>
  );
}
