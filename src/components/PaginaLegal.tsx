export default function PaginaLegal({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <p className="etiqueta">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-2 font-mono text-xs text-tenue">Última actualización: {actualizado}</p>
      <div className="mt-10 space-y-6 leading-relaxed text-tenue [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-texto [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-texto">
        {children}
      </div>
    </article>
  );
}
