import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatoSoles } from "@/config/sitio";
import { esAdmin } from "@/lib/entorno";
import { esPremium, obtenerSesion } from "@/lib/sesion";
import { clienteAdmin } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function Admin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.usuario.email)) notFound();

  const db = clienteAdmin();
  const hace7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const [usuarios, nuevos, premium, ventas, ultimosUsuarios, ultimosPagos] = await Promise.all([
    db.from("perfiles").select("id", { count: "exact", head: true }),
    db.from("perfiles").select("id", { count: "exact", head: true }).gte("creado_en", hace7),
    db.from("perfiles").select("id", { count: "exact", head: true }).gt("premium_hasta", new Date().toISOString()),
    db.from("pagos").select("monto").eq("estado", "approved"),
    db.from("perfiles").select("email, nombre, premium_hasta, origen, creado_en").order("creado_en", { ascending: false }).limit(25),
    db.from("pagos").select("monto, metodo, estado, creado_en, perfiles(email)").order("creado_en", { ascending: false }).limit(25),
  ]);

  const ingresos = (ventas.data ?? []).reduce((s, p) => s + Number(p.monto), 0);
  const conversion = usuarios.count ? ((premium.count ?? 0) / usuarios.count) * 100 : 0;

  const kpis = [
    ["Usuarios", String(usuarios.count ?? 0), `+${nuevos.count ?? 0} últimos 7 días`],
    ["Premium activos", String(premium.count ?? 0), `${conversion.toFixed(1)}% conversión`],
    ["Ventas", String(ventas.data?.length ?? 0), "pagos aprobados"],
    ["Ingresos", formatoSoles(ingresos), "bruto, antes de comisiones"],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="etiqueta">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Panel del negocio</h1>
        </div>
        <a href="/api/admin/usuarios.csv" className="btn-secundario">Exportar usuarios (CSV)</a>
      </div>

      <dl className="mt-10 grid gap-4 md:grid-cols-4">
        {kpis.map(([titulo, valor, nota]) => (
          <div key={titulo} className="tarjeta p-6">
            <dt className="font-mono text-xs uppercase tracking-widest text-tenue">{titulo}</dt>
            <dd className="mt-3 font-mono text-3xl font-semibold">{valor}</dd>
            <dd className="mt-1 text-xs text-tenue">{nota}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-semibold">Últimos registros</h2>
          <div className="tarjeta mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-borde">
                {(ultimosUsuarios.data ?? []).map((u) => (
                  <tr key={u.email}>
                    <td className="px-4 py-2.5">
                      <p>{u.nombre ?? "—"}</p>
                      <p className="font-mono text-xs text-tenue">{u.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-tenue">{u.origen ?? ""}</td>
                    <td className="px-4 py-2.5 text-right">
                      {esPremium(u) ? (
                        <span className="rounded bg-acento/15 px-2 py-0.5 font-mono text-xs text-acento">PRO</span>
                      ) : (
                        <span className="font-mono text-xs text-tenue">free</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs text-tenue">{fecha(u.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-semibold">Últimos pagos</h2>
          <div className="tarjeta mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-borde">
                {(ultimosPagos.data ?? []).map((p, i) => {
                  const perfil = p.perfiles as unknown as { email: string } | null;
                  return (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-mono text-xs">{perfil?.email}</td>
                      <td className="px-4 py-2.5 text-xs capitalize text-tenue">{p.metodo}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatoSoles(Number(p.monto))}</td>
                      <td className={`px-4 py-2.5 text-xs ${p.estado === "approved" ? "text-emerald-400" : "text-tenue"}`}>
                        {p.estado}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs text-tenue">{fecha(p.creado_en)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(ultimosPagos.data ?? []).length === 0 && <p className="p-6 text-center text-sm text-tenue">Aún no hay pagos.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
