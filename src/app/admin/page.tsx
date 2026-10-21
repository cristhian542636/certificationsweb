import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerCertificacion } from "@/config/certificaciones";
import { formatoSoles, obtenerPase, duracion } from "@/config/sitio";
import { esAdmin } from "@/lib/entorno";
import { obtenerSesion, vigente } from "@/lib/sesion";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { DOMINIOS, type Dominio } from "@/lib/tipos";
import AccionGarantia from "./AccionGarantia";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

interface Metricas {
  usuarios: number;
  usuarios_7d: number;
  activos_hoy: number;
  activos_7d: number;
  con_acceso: number;
  pagantes: number;
  ventas_mes: number;
  ingresos_mes: number;
  ingresos_mes_anterior: number;
  ingresos_total: number;
  reembolsos_30d: number;
  embudo_30d: { registrados: number; con_meta: number; diagnostico: number; compraron: number };
  ventas_por_pase: { producto: string; ventas: number; ingresos: number }[];
  serie_30d: { dia: string; registros: number; ventas: number; ingresos: number }[];
  pagos_por_revisar: { email: string; monto: number; estado: string; detalle: string | null; metodo: string | null; creado_en: string }[];
  vencen_7d: { email: string; nombre: string | null; certificacion: string; vence_en: string }[];
  examenes_proximos: { email: string; nombre: string | null; fecha_examen: string; acceso: boolean }[];
  resultados: { aprobados: number; no_aprobados: number };
  garantias_pendientes: { id: number; email: string; nombre: string | null; certificacion: string; fecha_examen: string; creado_en: string }[];
  alertas_dispositivos: { email: string; dispositivos: number; ciudades: number; revocados: number }[];
  uso_alto: { email: string; dia: string; preguntas: number }[];
  preguntas_dificiles: { pregunta_id: string; dominio: string; respuestas: number; error: number }[];
  referidos: { total: number; compraron: number; top: { email: string; invitados: number; compraron: number }[] };
  origenes: { origen: string; registros: number; pagantes: number }[];
}

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });
const fechaCorta = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", timeZone: iso.length === 10 ? "UTC" : "America/Lima" });
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

/** "dbx-de-associate:associate-120" → "Data Engineer Associate · 120 días" */
function nombreProducto(producto: string) {
  const [certId, paseId] = producto.split(":");
  const pase = obtenerPase(paseId);
  const cert = certId === "*" ? "Todas" : obtenerCertificacion(certId)?.nombre;
  return pase ? `${cert ?? certId} · ${duracion(pase)}` : producto;
}

export default async function Admin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.usuario.email)) notFound();

  const db = clienteAdmin();
  const [{ data, error }, ultimosUsuarios, ultimosPagos, accesos] = await Promise.all([
    db.rpc("admin_metricas"),
    db.from("perfiles").select("id, email, nombre, origen, creado_en").order("creado_en", { ascending: false }).limit(15),
    db.from("pagos").select("monto, metodo, estado, creado_en, producto, perfiles(email)").order("creado_en", { ascending: false }).limit(15),
    db.from("accesos").select("usuario_id, vence_en"),
  ]);

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <p className="etiqueta">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Panel del negocio</h1>
        <p className="tarjeta mt-8 p-6 text-sm text-tenue">
          Falta ejecutar la migración <code className="font-mono text-texto">0004_accesos_y_crecimiento.sql</code> en este
          proyecto de Supabase (SQL Editor → pegar → Run).
        </p>
      </div>
    );
  }

  const m = data as Metricas;
  const conAcceso = new Set((accesos.data ?? []).filter((a) => vigente(a.vence_en)).map((a) => a.usuario_id));
  const variacion = m.ingresos_mes_anterior ? Math.round(((m.ingresos_mes - m.ingresos_mes_anterior) / m.ingresos_mes_anterior) * 100) : null;
  const ventasTotales = m.ventas_por_pase.reduce((s, v) => s + v.ventas, 0);
  const reportados = m.resultados.aprobados + m.resultados.no_aprobados;
  const pendientes =
    m.garantias_pendientes.length + m.pagos_por_revisar.length + m.alertas_dispositivos.length + m.uso_alto.length;

  const kpis: [string, string, string][] = [
    ["Ingresos del mes", formatoSoles(Number(m.ingresos_mes)), variacion === null ? "sin datos del mes anterior" : `${variacion >= 0 ? "+" : ""}${variacion}% vs. mes anterior`],
    ["Ventas del mes", String(m.ventas_mes), `ticket promedio ${ventasTotales ? formatoSoles(Math.round((Number(m.ingresos_total) / ventasTotales) * 100) / 100) : "—"}`],
    ["Usuarios", String(m.usuarios), `+${m.usuarios_7d} en los últimos 7 días`],
    ["Con acceso activo", String(m.con_acceso), `${pct(m.pagantes, m.usuarios)} de usuarios ya compró`],
    ["Activos hoy", String(m.activos_hoy), "practicaron hoy"],
    ["Activos 7 días", String(m.activos_7d), `${pct(m.activos_7d, m.usuarios)} de usuarios`],
    ["Ingresos totales", formatoSoles(Number(m.ingresos_total)), "bruto, antes de comisiones"],
    ["Reembolsos 30 días", String(m.reembolsos_30d), "reembolsos y contracargos"],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="etiqueta">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Panel del negocio</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/preguntas" className="btn-primario">Revisar preguntas</a>
          <a href="/api/admin/usuarios.csv" className="btn-secundario">Exportar usuarios (CSV)</a>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <dl className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 [&>*]:min-w-0">
        {kpis.map(([titulo, valor, nota]) => (
          <div key={titulo} className="tarjeta p-5">
            <dt className="font-mono text-[11px] uppercase tracking-widest text-tenue">{titulo}</dt>
            <dd className="mt-2 font-mono text-2xl font-semibold md:text-3xl">{valor}</dd>
            <dd className="mt-1 text-xs text-tenue">{nota}</dd>
          </div>
        ))}
      </dl>

      {/* ── Para atender ─────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="font-semibold">Para atender {pendientes > 0 && <span className="ml-2 rounded-full bg-oro/20 px-2 py-0.5 font-mono text-xs text-oro">{pendientes}</span>}</h2>
        {pendientes === 0 ? (
          <p className="tarjeta mt-4 p-6 text-sm text-tenue">✓ Todo en orden: no hay garantías, pagos ni alertas pendientes.</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {m.garantias_pendientes.length > 0 && (
              <Bloque titulo="Garantías por revisar" nota="Pide el reporte de resultado por WhatsApp antes de aprobar.">
                {m.garantias_pendientes.map((g) => (
                  <Fila key={g.id}>
                    <div className="min-w-0">
                      <p className="truncate">{g.nombre ?? g.email}</p>
                      <p className="truncate font-mono text-xs text-tenue">{g.email} · examen {fechaCorta(g.fecha_examen)}</p>
                    </div>
                    <AccionGarantia id={g.id} />
                  </Fila>
                ))}
              </Bloque>
            )}
            {m.pagos_por_revisar.length > 0 && (
              <Bloque titulo="Pagos por revisar" nota="Pendientes, rechazados recientes o con monto que no coincide con el pase.">
                {m.pagos_por_revisar.map((p, i) => (
                  <Fila key={i}>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{p.email}</p>
                      <p className="text-xs text-tenue">{p.estado}{p.detalle ? ` · ${p.detalle}` : ""} · {fechaHora(p.creado_en)}</p>
                    </div>
                    <span className="font-mono text-sm">{formatoSoles(Number(p.monto))}</span>
                  </Fila>
                ))}
              </Bloque>
            )}
            {m.alertas_dispositivos.length > 0 && (
              <Bloque titulo="Posible cuenta compartida" nota="Muchos dispositivos o ciudades en 30 días. Escríbele antes de suspender.">
                {m.alertas_dispositivos.map((a) => (
                  <Fila key={a.email}>
                    <span className="truncate font-mono text-xs">{a.email}</span>
                    <span className="shrink-0 font-mono text-xs text-tenue">
                      {a.dispositivos} disp. · {a.ciudades} ciudades · {a.revocados} cerrados
                    </span>
                  </Fila>
                ))}
              </Bloque>
            )}
            {m.uso_alto.length > 0 && (
              <Bloque titulo="Uso muy alto" nota="200 o más preguntas en un día (el límite es 300).">
                {m.uso_alto.map((u, i) => (
                  <Fila key={i}>
                    <span className="truncate font-mono text-xs">{u.email}</span>
                    <span className="shrink-0 font-mono text-xs text-tenue">{u.preguntas} preguntas · {fechaCorta(u.dia)}</span>
                  </Fila>
                ))}
              </Bloque>
            )}
          </div>
        )}
      </section>

      {/* ── Tendencia ────────────────────────────────────── */}
      <section className="mt-12 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Barras titulo="Ingresos por día · últimos 30 días" serie={m.serie_30d.map((d) => ({ dia: d.dia, valor: Number(d.ingresos) }))} formato={formatoSoles} />
        <Barras titulo="Registros por día · últimos 30 días" serie={m.serie_30d.map((d) => ({ dia: d.dia, valor: d.registros }))} formato={String} />
      </section>

      {/* ── Embudo y resultados ──────────────────────────── */}
      <section className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <div className="tarjeta p-6">
          <h2 className="font-semibold">Embudo · registrados en los últimos 30 días</h2>
          <div className="mt-5 space-y-4">
            {(
              [
                ["Se registraron", m.embudo_30d.registrados],
                ["Definieron su meta", m.embudo_30d.con_meta],
                ["Hicieron el diagnóstico", m.embudo_30d.diagnostico],
                ["Compraron un pase", m.embudo_30d.compraron],
              ] as const
            ).map(([etapa, n]) => (
              <div key={etapa}>
                <div className="flex justify-between text-sm">
                  <span>{etapa}</span>
                  <span className="font-mono text-tenue">
                    {n} · {pct(n, m.embudo_30d.registrados)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-panel-2">
                  <div className="h-2 rounded-full bg-acento" style={{ width: pct(n, m.embudo_30d.registrados) === "—" ? "0%" : pct(n, m.embudo_30d.registrados) }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-tenue">La etapa con la mayor caída es la que conviene mejorar primero.</p>
        </div>
        <div className="tarjeta p-6">
          <h2 className="font-semibold">Resultados de examen reportados</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-tenue">Aprobaron</dt>
              <dd className="mt-1 font-mono text-3xl font-semibold text-emerald-400">{m.resultados.aprobados}</dd>
            </div>
            <div>
              <dt className="text-xs text-tenue">No aprobaron</dt>
              <dd className="mt-1 font-mono text-3xl font-semibold">{m.resultados.no_aprobados}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-tenue">
            {reportados
              ? `Tasa entre quienes reportaron: ${pct(m.resultados.aprobados, reportados)} (${reportados} reportes). Es un dato interno: no lo publiques hasta tener una muestra representativa.`
              : "Aún no hay resultados reportados."}
          </p>
        </div>
      </section>

      {/* ── Oportunidades ────────────────────────────────── */}
      <section className="mt-12 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Bloque titulo="Exámenes en los próximos 14 días" nota="Quien no tiene acceso activo es una buena oportunidad de contacto." vacio="Nadie tiene examen en las próximas dos semanas.">
          {m.examenes_proximos.map((e) => (
            <Fila key={e.email}>
              <div className="min-w-0">
                <p className="truncate">{e.nombre ?? e.email}</p>
                <p className="truncate font-mono text-xs text-tenue">{e.email}</p>
              </div>
              <span className="shrink-0 text-right font-mono text-xs">
                {fechaCorta(e.fecha_examen)}
                <span className={`block ${e.acceso ? "text-acento" : "text-oro"}`}>{e.acceso ? "PRO" : "sin pase"}</span>
              </span>
            </Fila>
          ))}
        </Bloque>
        <Bloque titulo="Accesos que vencen en 7 días" nota="Recuérdales que pueden extender su pase si aún no rinden el examen." vacio="Ningún acceso vence esta semana.">
          {m.vencen_7d.map((v) => (
            <Fila key={`${v.email}-${v.certificacion}`}>
              <div className="min-w-0">
                <p className="truncate">{v.nombre ?? v.email}</p>
                <p className="truncate font-mono text-xs text-tenue">{v.email}</p>
              </div>
              <span className="shrink-0 font-mono text-xs">{fechaCorta(v.vence_en)}</span>
            </Fila>
          ))}
        </Bloque>
      </section>

      {/* ── Ventas, origen y referidos ───────────────────── */}
      <section className="mt-12 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Bloque titulo="Ventas por pase" vacio="Aún no hay ventas.">
          {m.ventas_por_pase.map((v) => (
            <Fila key={v.producto}>
              <span className="min-w-0 text-sm">{nombreProducto(v.producto)}</span>
              <span className="shrink-0 text-right font-mono text-xs">
                {v.ventas} · {formatoSoles(Number(v.ingresos))}
              </span>
            </Fila>
          ))}
        </Bloque>
        <Bloque titulo="Origen de usuarios" nota="Según utm_source; ‘directo’ si no llegó con uno.">
          {m.origenes.map((o) => (
            <Fila key={o.origen}>
              <span className="truncate text-sm">{o.origen}</span>
              <span className="shrink-0 font-mono text-xs text-tenue">
                {o.registros} · {o.pagantes} compraron ({pct(o.pagantes, o.registros)})
              </span>
            </Fila>
          ))}
        </Bloque>
        <Bloque
          titulo="Referidos"
          nota={`${m.referidos.total} invitados · ${m.referidos.compraron} compraron`}
          vacio="Nadie ha usado un enlace de invitación todavía."
        >
          {m.referidos.top.map((r) => (
            <Fila key={r.email}>
              <span className="truncate font-mono text-xs">{r.email}</span>
              <span className="shrink-0 font-mono text-xs text-tenue">
                {r.invitados} inv. · {r.compraron} compras
              </span>
            </Fila>
          ))}
        </Bloque>
      </section>

      {/* ── Contenido ────────────────────────────────────── */}
      <section className="mt-12">
        <Bloque
          titulo="Preguntas con más errores"
          nota="Mínimo 5 respuestas. Un error muy alto puede indicar una pregunta confusa o una respuesta mal marcada: revísala."
          vacio="Aún no hay suficientes respuestas para medirlo."
        >
          {m.preguntas_dificiles.map((q) => (
            <Fila key={q.pregunta_id}>
              <span className="min-w-0 truncate text-sm">
                <a href={`/admin/preguntas#${q.pregunta_id}`} className="font-mono text-acento hover:underline">
                  {q.pregunta_id}
                </a>{" "}
                <span className="text-tenue">{DOMINIOS[q.dominio as Dominio] ?? q.dominio}</span>
              </span>
              <span className="shrink-0 font-mono text-xs">
                {Math.round(Number(q.error) * 100)}% error · {q.respuestas} resp.
              </span>
            </Fila>
          ))}
        </Bloque>
      </section>

      {/* ── Últimos movimientos ──────────────────────────── */}
      <section className="mt-12 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Bloque titulo="Últimos registros">
          {(ultimosUsuarios.data ?? []).map((u) => (
            <Fila key={u.email}>
              <div className="min-w-0">
                <p className="truncate">{u.nombre ?? "—"}</p>
                <p className="truncate font-mono text-xs text-tenue">
                  {u.email}
                  {u.origen ? ` · ${u.origen}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-right font-mono text-xs text-tenue">
                {conAcceso.has(u.id) ? <span className="rounded bg-acento/15 px-1.5 py-0.5 text-acento">PRO</span> : "free"}
                <span className="block">{fechaHora(u.creado_en)}</span>
              </span>
            </Fila>
          ))}
        </Bloque>
        <Bloque titulo="Últimos pagos" vacio="Aún no hay pagos.">
          {(ultimosPagos.data ?? []).map((p, i) => {
            const perfil = p.perfiles as unknown as { email: string } | null;
            return (
              <Fila key={i}>
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{perfil?.email}</p>
                  <p className="truncate text-xs text-tenue">
                    {nombreProducto(p.producto)} · <span className="capitalize">{p.metodo}</span> · {fechaHora(p.creado_en)}
                  </p>
                </div>
                <span className="shrink-0 text-right font-mono text-sm">
                  {formatoSoles(Number(p.monto))}
                  <span className={`block text-xs ${p.estado === "approved" ? "text-emerald-400" : "text-tenue"}`}>{p.estado}</span>
                </span>
              </Fila>
            );
          })}
        </Bloque>
      </section>
    </div>
  );
}

function Bloque({ titulo, nota, vacio, children }: { titulo: string; nota?: string; vacio?: string; children: React.ReactNode }) {
  const hijos = Array.isArray(children) ? children.flat().filter(Boolean) : [children].filter(Boolean);
  return (
    <div className="tarjeta p-6">
      <h2 className="font-semibold">{titulo}</h2>
      {nota && <p className="mt-1 text-xs text-tenue">{nota}</p>}
      {hijos.length ? <div className="mt-4 divide-y divide-borde">{children}</div> : <p className="mt-4 text-sm text-tenue">{vacio ?? "Sin datos."}</p>}
    </div>
  );
}

function Fila({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 py-2.5 text-sm">{children}</div>;
}

// Barras verticales de una sola serie; el detalle de cada día aparece al pasar el cursor y en la tabla accesible.
function Barras({ titulo, serie, formato }: { titulo: string; serie: { dia: string; valor: number }[]; formato: (n: number) => string }) {
  const maximo = Math.max(...serie.map((d) => d.valor), 0);
  const total = serie.reduce((s, d) => s + d.valor, 0);
  return (
    <figure className="tarjeta p-6">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{titulo}</span>
        <span className="font-mono text-sm text-tenue">{formato(total)}</span>
      </figcaption>
      <div className="mt-6 flex h-32 items-end gap-[2px] border-b border-borde" aria-hidden>
        {serie.map((d) => (
          <div key={d.dia} className="group relative flex h-full flex-1 items-end" title={`${fechaCorta(d.dia)}: ${formato(d.valor)}`}>
            <div
              className="w-full rounded-t-[4px] bg-acento/80 transition group-hover:bg-acento"
              style={{ height: maximo ? `${Math.max((d.valor / maximo) * 100, d.valor > 0 ? 3 : 0)}%` : "0%" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-tenue">
        <span>{serie[0] && fechaCorta(serie[0].dia)}</span>
        <span>{serie.at(-1) && fechaCorta(serie.at(-1)!.dia)}</span>
      </div>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <tbody>
          {serie.map((d) => (
            <tr key={d.dia}>
              <th scope="row">{d.dia}</th>
              <td>{formato(d.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
