import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { esAdmin } from "@/lib/entorno";
import { obtenerSesion } from "@/lib/sesion";
import { preguntasGratis, todasLasPreguntas } from "@/lib/preguntas";
import { DOMINIOS, PESOS, type Dominio } from "@/lib/tipos";
import ListaRevision from "./ListaRevision";

export const metadata: Metadata = { title: "Revisión de preguntas", robots: { index: false } };
export const dynamic = "force-dynamic";

// Revisión del banco completo por el instructor. Solo para ADMIN_EMAILS: muestra respuestas y contenido premium.
export default async function RevisionPreguntas({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.usuario.email)) notFound();

  const { seccion } = await searchParams;
  const filtro = seccion && seccion in DOMINIOS ? (seccion as Dominio) : undefined;
  const [todas, gratis] = await Promise.all([todasLasPreguntas(), preguntasGratis()]);
  const idsGratis = new Set(gratis.map((p) => p.id));
  const lista = (filtro ? todas.filter((p) => p.dominio === filtro) : todas).map((p) => ({ ...p, gratis: idsGratis.has(p.id) }));

  const conteo = (d: Dominio) => todas.filter((p) => p.dominio === d).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <Link href="/admin" className="text-sm text-acento hover:underline">← Panel admin</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Revisión de preguntas</h1>
      <p className="mt-2 text-sm text-tenue">
        {todas.length} preguntas ({gratis.length} del diagnóstico gratis). Marca cada una como revisada; si algo está mal,
        anota su id (por ejemplo, <span className="font-mono">job-04</span>) y lo corregimos.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filtrar por sección">
        <Link href="/admin/preguntas" className={!filtro ? "btn-primario" : "btn-secundario"}>
          Todas ({todas.length})
        </Link>
        {(Object.keys(DOMINIOS) as Dominio[]).map((d) => (
          <Link key={d} href={`/admin/preguntas?seccion=${d}`} className={filtro === d ? "btn-primario" : "btn-secundario"}>
            {DOMINIOS[d]} · {conteo(d)} <span className="font-mono text-xs opacity-70">({PESOS[d]}%)</span>
          </Link>
        ))}
      </nav>

      <ListaRevision preguntas={lista} />
    </div>
  );
}
