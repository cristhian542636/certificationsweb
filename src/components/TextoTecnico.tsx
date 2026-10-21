// Muestra el texto de una pregunta resaltando como código lo que va entre comillas invertidas (`así`).
export default function TextoTecnico({ texto }: { texto: string }) {
  const partes = texto.split("`");
  // Con un número impar de comillas no hay pares completos: se muestra tal cual.
  if (partes.length < 3 || partes.length % 2 === 0) return <>{texto}</>;
  return (
    <>
      {partes.map((parte, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-fondo px-1 py-0.5 font-mono text-[0.9em] text-texto">
            {parte}
          </code>
        ) : (
          parte
        ),
      )}
    </>
  );
}
