import { NextResponse } from "next/server";
import { obtenerNivel } from "@/config/sitio";
import { obtenerSesion } from "@/lib/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";
import { diasEntre, hoyLima } from "@/lib/progreso";

// Actualiza la meta del alumno: nivel, fecha de examen, resultado del examen real y enlace de su credencial.
export async function PATCH(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const c = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const cambios: Record<string, string | null> = {};

  if ("nivel" in c) {
    if (!obtenerNivel(c.nivel)) return NextResponse.json({ ok: false, error: "nivel inválido" }, { status: 400 });
    cambios.nivel = c.nivel as string;
  }
  if ("fecha_examen" in c) {
    const f = c.fecha_examen;
    if (f !== null && (typeof f !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(f) || Number.isNaN(Date.parse(f)))) {
      return NextResponse.json({ ok: false, error: "fecha inválida" }, { status: 400 });
    }
    if (typeof f === "string") {
      const dias = diasEntre(hoyLima(), f);
      // Al registrar un resultado, la fecha es la del examen ya rendido (hasta 90 días atrás); si no, una meta futura.
      const conResultado = typeof c.resultado_examen === "string";
      if (conResultado ? dias > 0 || dias < -90 : dias < 0 || dias > 730) {
        const error = conResultado
          ? "La fecha del examen debe ser de los últimos 90 días."
          : "La fecha debe ser desde hoy y dentro de los próximos 2 años.";
        return NextResponse.json({ ok: false, error }, { status: 400 });
      }
    }
    cambios.fecha_examen = f as string | null;
  }
  if ("resultado_examen" in c) {
    const r = c.resultado_examen;
    if (r !== null && r !== "aprobado" && r !== "no_aprobado") {
      return NextResponse.json({ ok: false, error: "resultado inválido" }, { status: 400 });
    }
    cambios.resultado_examen = r as string | null;
  }
  if ("insignia_url" in c) {
    const u = c.insignia_url;
    let valida = u === null;
    if (typeof u === "string" && u.length <= 300) {
      try {
        valida = new URL(u.trim()).protocol === "https:";
      } catch {
        valida = false;
      }
    }
    if (!valida) {
      return NextResponse.json({ ok: false, error: "Pega el enlace completo de tu credencial (empieza con https://)." }, { status: 400 });
    }
    cambios.insignia_url = typeof u === "string" ? u.trim() : null;
  }
  if (!Object.keys(cambios).length) return NextResponse.json({ ok: false, error: "sin cambios" }, { status: 400 });

  const supabase = await clienteServidor();
  const { error } = await supabase.from("perfiles").update(cambios).eq("id", sesion.usuario.id);
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
