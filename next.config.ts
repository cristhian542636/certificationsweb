import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las preguntas y su traducción se leen en el servidor desde /data (nunca se empaquetan en el cliente); se incluyen en todas las rutas.
  outputFileTracingIncludes: {
    "/**/*": ["./data/preguntas/**/*", "./data/traducciones/**/*"],
  },
};

export default nextConfig;
