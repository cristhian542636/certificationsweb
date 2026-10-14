import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { sitio } from "@/config/sitio";

export const metadata: Metadata = {
  title: `${sitio.nombre} · Databricks Data Engineer Associate en español`,
  description: sitio.eslogan,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased flex flex-col">
        <header className="border-b border-slate-200 dark:border-slate-800">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="font-bold text-lg">
              {sitio.nombre}
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/simulador" className="hover:underline">
                Simulador
              </Link>
              <Link href="/activar" className="hover:underline">
                Activar código
              </Link>
              <Link
                href="/comprar"
                className="rounded-lg bg-orange-600 px-3 py-2 font-semibold text-white hover:bg-orange-700"
              >
                Comprar
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div className="mx-auto max-w-5xl px-4 py-6 space-y-2">
            <p>
              © {new Date().getFullYear()} {sitio.nombre}. Las preguntas son originales y con fines de
              práctica; no son preguntas reales del examen.
            </p>
            <p>
              Sitio independiente, no afiliado ni respaldado por Databricks, Inc. &quot;Databricks&quot; es una
              marca registrada de su respectivo propietario.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
