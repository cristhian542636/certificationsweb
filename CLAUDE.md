# CLAUDE.md

Plataforma de preparación para la certificación **Databricks Data Engineer Associate**, en español, orientada a LatAm (Perú primero).

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript estricto + Tailwind CSS 4.
- Sin base de datos: las preguntas viven en `data/preguntas/*.json` y el acceso premium usa códigos firmados con HMAC (`src/lib/acceso.ts`).
- Despliegue previsto: Vercel, con la variable de entorno `ACCESS_CODE_SECRET`.

## Modelo de cobro (MVP)
- Pago único con **QR de Yape**, sin pasarela. El alumno envía su comprobante por WhatsApp; el instructor lo verifica y genera un código con `npm run generar-codigo -- correo@alumno.com`.
- No agregar pasarelas de pago, suscripciones ni PayPal/Izipay sin que el usuario lo pida.

## Estructura
- `src/config/sitio.ts`: todos los textos y valores configurables (precio, WhatsApp, instructor). Úsalo en lugar de escribir valores fijos en las páginas.
- `src/app/simulador/Simulador.tsx`: simulador (modo práctica y modo examen) en el cliente.
- `src/app/api/preguntas`: devuelve las preguntas gratis o todas, según la cookie de acceso.
- `src/app/api/activar`: valida el código y crea la cookie httpOnly.
- `scripts/generar-codigo.mjs` replica la lógica de firma de `src/lib/acceso.ts`. **Si cambias una, cambia la otra.**

## Reglas de contenido
- Las preguntas deben ser **originales**. Nunca copies preguntas de exámenes reales ni de "dumps".
- Todo el contenido visible para el alumno va en español neutro (con tuteo).
- Cada pregunta tiene 4 opciones, una sola correcta y una explicación de por qué es correcta y por qué las otras no.
- Usa la terminología vigente de Databricks (Lakeflow Declarative Pipelines, Lakeflow Jobs, Unity Catalog) y menciona el nombre anterior cuando ayude (por ejemplo, Delta Live Tables).
- Las preguntas premium nunca deben importarse desde componentes del cliente; solo se leen en `src/lib/preguntas.ts` (server-only).

## Comandos
- `npm run dev`: servidor local.
- `npm run typecheck` y `npm run build`: ejecútalos antes de hacer commit.
- `npm run validar-preguntas`: obligatorio después de editar el banco de preguntas.
