import Logo from "./Logo";

export default function MarcoAuth({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="reticula pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex max-w-md flex-col px-4 py-16 md:py-24">
        <div className="tarjeta p-8 shadow-2xl shadow-black/40">
          <div className="mb-6 md:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-sm text-tenue">{subtitulo}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={tipo === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2.5 text-sm ${
        tipo === "error" ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {children}
    </p>
  );
}
