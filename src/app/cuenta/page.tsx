import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sitio, formatoSoles } from "@/config/sitio";
import { obtenerSesion } from "@/lib/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";
import { esAdmin } from "@/lib/entorno";

export const metadata: Metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

interface Intento {
  id: number;
  modo: "practica" | "examen";
  total: number;
  correctas: number;
  creado_en: string;
}

interface Pago {
  id: number;
  monto: number;
  metodo: string | null;
  estado: string;
  creado_en: string;
}

const ESTADOS_PAGO: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  in_process: "En proceso",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Contracargo",
};

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

export default async function Cuenta() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?next=/cuenta");

  const supabase = await clienteServidor();
  const [{ data: intentos }, { data: pagos }] = await Promise.all([
    supabase.from("intentos").select("id, modo, total, correctas, creado_en").order("creado_en", { ascending: false }).limit(20),
    supabase.from("pagos").select("id, monto, metodo, estado, creado_en").order("creado_en", { ascending: false }),
  ]);
  const lista = (intentos ?? []) as Intento[];
  const mejor = lista.reduce((m, i) => Math.max(m, Math.round((i.correctas / i.total) * 100)), 0);
  const nombre = sesion.perfil?.nombre || sesion.usuario.email.split("@")[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="etiqueta">Mi cuenta</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Hola, {nombre}</h1>
          <p className="mt-1 font-mono text-sm text-tenue">{sesion.usuario.email}</p>
        </div>
        <div className="flex gap-2">
          {esAdmin(sesion.usuario.email) && <Link href="/admin" className="btn-secundario">Panel admin</Link>}
          <form action="/auth/salir" method="post">
            <button className="btn-secundario">Cerrar sesión</button>
          </form>
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className={`tarjeta p-6 ${sesion.premium ? "border-acento/50" : ""}`}>
          <p className="font-mono text-xs uppercase tracking-widest text-tenue">Plan</p>
          <p className="mt-3 text-2xl font-semibold">{sesion.premium ? "Premium" : "Gratis"}</p>
          {sesion.premium ? (
            <p className="mt-1 text-sm text-tenue">Vence el {fecha(sesion.perfil!.premium_hasta!)}</p>
          ) : (
            <Link href="/comprar" className="btn-primario mt-4 w-full">
              Pasar a Premium · {formatoSoles(sitio.producto.precio)}
            </Link>
          )}
        </div>
        <div className="tarjeta p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-tenue">Intentos</p>
          <p className="mt-3 font-mono text-3xl font-semibold">{lista.length}</p>
          <p className="mt-1 text-sm text-tenue">simulacros y prácticas</p>
        </div>
        <div className="tarjeta p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-tenue">Mejor puntaje</p>
          <p className={`mt-3 font-mono text-3xl font-semibold ${mejor >= sitio.examen.porcentajeAprobacion ? "text-emerald-400" : ""}`}>
            {lista.length ? `${mejor}%` : "—"}
          </p>
          <p className="mt-1 text-sm text-tenue">meta: {sitio.examen.porcentajeAprobacion}% o más</p>
        </div>
      </div>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Historial de intentos</h2>
          <Link href="/simulador" className="text-sm text-acento hover:underline">Nuevo intento →</Link>
        </div>
        {lista.length === 0 ? (
          <div className="tarjeta mt-4 p-10 text-center text-sm text-tenue">
            Aún no tienes intentos. <Link href="/simulador" className="text-acento hover:underline">Haz tu primera práctica</Link>.
          </div>
        ) : (
          <div className="tarjeta mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-borde font-mono text-xs uppercase tracking-wider text-tenue">
                <tr>
                  <th className="px-5 py-3 text-left font-normal">Fecha</th>
                  <th className="px-5 py-3 text-left font-normal">Modo</th>
                  <th className="px-5 py-3 text-right font-normal">Correctas</th>
                  <th className="w-1/3 px-5 py-3 text-left font-normal">Puntaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {lista.map((i) => {
                  const pct = Math.round((i.correctas / i.total) * 100);
                  const ok = pct >= sitio.examen.porcentajeAprobacion;
                  return (
                    <tr key={i.id}>
                      <td className="px-5 py-3 font-mono text-tenue">{fecha(i.creado_en)}</td>
                      <td className="px-5 py-3 capitalize">{i.modo === "examen" ? "Examen" : "Práctica"}</td>
                      <td className="px-5 py-3 text-right font-mono">{i.correctas}/{i.total}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 rounded-full bg-panel-2">
                            <div className={`h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-acento"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-10 text-right font-mono">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(pagos ?? []).length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Pagos</h2>
          <div className="tarjeta mt-4 divide-y divide-borde text-sm">
            {(pagos as Pago[]).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <span className="font-mono text-tenue">{fecha(p.creado_en)}</span>
                <span className="capitalize">{p.metodo ?? "—"}</span>
                <span className="font-mono">{formatoSoles(Number(p.monto))}</span>
                <span className={p.estado === "approved" ? "text-emerald-400" : "text-tenue"}>
                  {ESTADOS_PAGO[p.estado] ?? "En revisión"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
