import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { sitio } from "@/config/sitio";
import FormularioPago from "./FormularioPago";

export const metadata: Metadata = { title: `Comprar · ${sitio.nombre}` };

export default function Comprar() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Comprar acceso completo</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        {sitio.producto.nombre} · {sitio.producto.duracionAccesoMeses} meses de acceso
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase text-purple-700 dark:text-purple-400">Paga con Yape</p>
          <p className="mt-1 text-4xl font-extrabold">S/ {sitio.producto.precioSoles}</p>
          <Image
            src={sitio.pago.qrImagen}
            alt="Código QR de Yape"
            width={280}
            height={280}
            className="mx-auto mt-6 rounded-lg bg-white"
            unoptimized
          />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Verifica que el titular sea <strong>{sitio.pago.titularYape}</strong>
          </p>
        </div>

        <div>
          <ol className="space-y-4">
            <Paso n={1} titulo="Escanea el QR desde tu app de Yape">
              Paga exactamente S/ {sitio.producto.precioSoles}.
            </Paso>
            <Paso n={2} titulo="Toma una captura del pago">
              Debe verse el número de operación.
            </Paso>
            <Paso n={3} titulo="Envíanos tus datos por WhatsApp">
              Completa el formulario de abajo y adjunta la captura en el chat.
            </Paso>
            <Paso n={4} titulo="Recibe tu código y actívalo">
              Te respondemos con tu código. Pégalo en{" "}
              <Link href="/activar" className="text-orange-600 hover:underline">
                Activar código
              </Link>
              .
            </Paso>
          </ol>
          <FormularioPago />
        </div>
      </div>
    </div>
  );
}

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 font-bold text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">{children}</p>
      </div>
    </li>
  );
}
