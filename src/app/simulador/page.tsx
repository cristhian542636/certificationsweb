import type { Metadata } from "next";
import Simulador from "./Simulador";

export const metadata: Metadata = { title: "Simulador" };

export default function PaginaSimulador() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Simulador />
    </div>
  );
}
