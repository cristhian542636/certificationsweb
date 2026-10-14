import type { Metadata } from "next";
import { DOMINIOS, esModo, type Dominio } from "@/lib/tipos";
import Simulador from "./Simulador";

export const metadata: Metadata = { title: "Simulador" };

export default async function PaginaSimulador({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; dominio?: string }>;
}) {
  const { modo, dominio } = await searchParams;
  const d = dominio && dominio in DOMINIOS ? (dominio as Dominio) : undefined;
  const m = esModo(modo) && (modo !== "dominio" || d) ? modo : undefined;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Simulador key={`${m ?? "menu"}-${d ?? ""}`} modoInicial={m} dominioInicial={d} />
    </div>
  );
}
