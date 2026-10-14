import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las preguntas premium se leen en el servidor desde /data y nunca se empaquetan en el cliente.
  outputFileTracingIncludes: {
    "/api/preguntas": ["./data/preguntas/**/*"],
  },
};

export default nextConfig;
