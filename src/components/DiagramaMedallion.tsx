// Diagrama del hero: fuentes → Bronze → Silver → Gold, con datos fluyendo entre capas.

const capas = [
  { x: 150, nombre: "bronze", detalle: "raw · append", color: "var(--color-bronce)" },
  { x: 290, nombre: "silver", detalle: "clean · CDC", color: "var(--color-plata)" },
  { x: 430, nombre: "gold", detalle: "agg · BI", color: "var(--color-oro)" },
];

const fuentes = ["kafka", "s3://raw", "postgres"];

export default function DiagramaMedallion() {
  return (
    <svg viewBox="0 0 540 210" className="w-full" role="img" aria-label="Arquitectura Medallion: Bronze, Silver y Gold">
      {fuentes.map((f, i) => {
        const y = 45 + i * 60;
        return (
          <g key={f}>
            <rect x="8" y={y - 15} width="82" height="30" rx="6" fill="#0d1117" stroke="#2d3846" />
            <text x="49" y={y + 4} textAnchor="middle" fontSize="11" fill="#8b98a9" fontFamily="var(--font-mono)">
              {f}
            </text>
            <path d={`M90 ${y} C 115 ${y}, 115 105, 140 105`} fill="none" stroke="#2d3846" strokeWidth="1.5" />
            <path
              d={`M90 ${y} C 115 ${y}, 115 105, 140 105`}
              fill="none"
              stroke="var(--color-acento)"
              strokeWidth="1.5"
              className="flujo"
              opacity="0.8"
            />
          </g>
        );
      })}

      {capas.map((c, i) => (
        <g key={c.nombre}>
          {i > 0 && (
            <>
              <line x1={capas[i - 1].x + 50} y1="105" x2={c.x - 50} y2="105" stroke="#2d3846" strokeWidth="1.5" />
              <line
                x1={capas[i - 1].x + 50}
                y1="105"
                x2={c.x - 50}
                y2="105"
                stroke={c.color}
                strokeWidth="1.5"
                className="flujo"
              />
            </>
          )}
          <rect x={c.x - 50} y="70" width="100" height="70" rx="10" fill="#0d1117" stroke={c.color} strokeWidth="1.5" />
          <circle cx={c.x - 34} cy="88" r="4" fill={c.color} />
          <text x={c.x - 24} y="92" fontSize="13" fontWeight="600" fill="#e6edf3" fontFamily="var(--font-mono)">
            {c.nombre}
          </text>
          <text x={c.x - 38} y="122" fontSize="10.5" fill="#8b98a9" fontFamily="var(--font-mono)">
            {c.detalle}
          </text>
        </g>
      ))}

      <text x="290" y="178" textAnchor="middle" fontSize="10.5" fill="#8b98a9" fontFamily="var(--font-mono)">
        unity_catalog.seguros.* · lakeflow pipelines
      </text>
    </svg>
  );
}
