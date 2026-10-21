import "server-only";
import { precioConDescuento, type Pase } from "@/config/sitio";
import { clienteAdmin } from "@/lib/supabase/servidor";

/** Quien llegó con el enlace de otro alumno tiene descuento en su primera compra. */
export async function tieneDescuentoReferido(usuarioId: string) {
  const db = clienteAdmin();
  const [{ data: referido, error }, { count }] = await Promise.all([
    db.from("referidos").select("referido_id").eq("referido_id", usuarioId).maybeSingle(),
    db.from("pagos").select("id", { count: "exact", head: true }).eq("usuario_id", usuarioId).eq("estado", "approved"),
  ]);
  return !error && Boolean(referido) && !count;
}

/** Precio que se le cobra a este alumno por el pase. */
export async function precioParaUsuario(usuarioId: string, pase: Pase) {
  return precioConDescuento(pase, await tieneDescuentoReferido(usuarioId));
}
