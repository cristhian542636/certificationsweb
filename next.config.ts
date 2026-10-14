import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las preguntas se leen en el servidor desde /data (nunca se empaquetan en el cliente); se incluyen en todas las rutas.
  outputFileTracingIncludes: {
    "/**/*": ["./data/preguntas/**/*"],
  },
};

export default nextConfig;
