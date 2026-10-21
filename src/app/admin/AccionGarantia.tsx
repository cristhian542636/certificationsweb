"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccionGarantia({ id }: { id: number }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function resolver(aprobar: boolean) {
    if (!aprobar && !confirm("¿Rechazar esta solicitud de garantía?")) return;
    setEnviando(true);
    await fetch("/api/admin/garantias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, aprobar }),
    }).catch(() => null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button disabled={enviando} onClick={() => resolver(true)} className="btn bg-emerald-500 px-3 py-1.5 text-xs text-fondo hover:bg-emerald-400">
        Aprobar
      </button>
      <button disabled={enviando} onClick={() => resolver(false)} className="btn-secundario px-3 py-1.5 text-xs">
        Rechazar
      </button>
    </div>
  );
}
