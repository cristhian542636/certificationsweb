import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { sitio } from "@/config/sitio";
import { AMBIENTE, SITE_URL } from "@/lib/entorno";
import Navegacion from "@/components/Navegacion";
import PiePagina from "@/components/PiePagina";
import CintaAmbiente from "@/components/CintaAmbiente";

const produccion = AMBIENTE === "produccion";
// En dev/qa la pestaña lo dice ("[DEV] …") y los buscadores no indexan.
const prefijo = produccion ? "" : `[${AMBIENTE.toUpperCase()}] `;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${prefijo}${sitio.nombre} · Simulador Databricks Data Engineer Associate en español`,
    template: `${prefijo}%s · ${sitio.nombre}`,
  },
  description: `${sitio.eslogan}. Preguntas originales, modo examen cronometrado y resultados por dominio.`,
  openGraph: { type: "website", locale: "es_PE", siteName: sitio.nombre },
  ...(produccion ? {} : { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = { themeColor: "#07090e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <CintaAmbiente />
        <Navegacion />
        <main className="flex-1">{children}</main>
        <PiePagina />
      </body>
    </html>
  );
}
