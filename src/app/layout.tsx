import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { sitio } from "@/config/sitio";
import { SITE_URL } from "@/lib/entorno";
import Navegacion from "@/components/Navegacion";
import PiePagina from "@/components/PiePagina";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${sitio.nombre} · Simulador Databricks Data Engineer Associate en español`,
    template: `%s · ${sitio.nombre}`,
  },
  description: `${sitio.eslogan}. Preguntas originales, modo examen cronometrado y resultados por dominio.`,
  openGraph: { type: "website", locale: "es_PE", siteName: sitio.nombre },
};

export const viewport: Viewport = { themeColor: "#07090e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <Navegacion />
        <main className="flex-1">{children}</main>
        <PiePagina />
      </body>
    </html>
  );
}
