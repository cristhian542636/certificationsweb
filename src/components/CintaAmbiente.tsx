import { AMBIENTE, RAMA } from "@/lib/entorno";

// Franja visible solo fuera de producción, para no confundir dev/qa con la web real.
const ESTILOS = {
  dev: { texto: "DEV", clase: "bg-amber-400 text-fondo" },
  qa: { texto: "QA", clase: "bg-violet-400 text-fondo" },
  preview: { texto: "PREVIEW", clase: "bg-sky-400 text-fondo" },
  local: { texto: "LOCAL", clase: "bg-panel-2 text-tenue" },
} as const;

export default function CintaAmbiente() {
  if (AMBIENTE === "produccion") return null;
  const { texto, clase } = ESTILOS[AMBIENTE];
  return (
    <div className={`px-4 py-1 text-center font-mono text-[11px] font-semibold tracking-wide ${clase}`}>
      {texto}
      <span className="font-normal">
        {" "}
        · datos de prueba{RAMA && AMBIENTE === "preview" ? ` · rama ${RAMA}` : ""}
      </span>
    </div>
  );
}
