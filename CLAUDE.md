# CLAUDE.md

Plataforma de preparación para la certificación **Databricks Data Engineer Associate**, en español, orientada a LatAm (Perú primero).

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript estricto + Tailwind CSS 4. En Next 16 el middleware se llama `src/proxy.ts`.
- **Supabase**: autenticación (correo + contraseña) y Postgres. Esquema en `supabase/migrations/` (perfiles, pagos, intentos, vista `metricas_diarias`) con RLS activado.
- **Mercado Pago** (API REST, sin SDK de Node): Yape vía Checkout API (token generado en el navegador con `mp.yape`) y tarjeta vía Checkout Pro. Webhook en `/api/webhooks/mercadopago`.
- Despliegue: Vercel. Variables documentadas en `.env.example`.

## Modelo de cobro
- Pago único de S/ 29.90 por 12 meses (`src/config/sitio.ts`). No es suscripción.
- El acceso premium es `perfiles.premium_hasta > now()`. **Solo** lo modifica la función SQL `registrar_pago` (idempotente, ejecutada con service role), llamada desde `procesarPago` en `src/lib/mercadopago.ts`.
- Nunca confíes en el cuerpo del webhook: siempre consulta el pago a la API de Mercado Pago y valida monto, moneda y `external_reference` (id del usuario).
- No agregar PayPal, Izipay ni suscripciones recurrentes sin que el usuario lo pida.

## Estructura
- `src/config/sitio.ts`: textos, precio y contacto. Úsalo en lugar de escribir valores fijos.
- `src/lib/sesion.ts`: `obtenerSesion()` devuelve el usuario, su perfil y `premium`.
- `src/lib/supabase/`: `clienteServidor()` (con sesión, respeta RLS), `clienteAdmin()` (service role, solo servidor) y `clienteNavegador()`.
- `src/app/simulador/Simulador.tsx`: simulador en el cliente; guarda los intentos con `POST /api/intentos`.
- `/admin`: panel del negocio, restringido a `ADMIN_EMAILS`.

## Diseño
- Tema oscuro único. Tokens en `src/app/globals.css` (`@theme`: fondo, panel, borde, tenue, acento, bronce/plata/oro).
- Utilidades propias: `btn-primario`, `btn-secundario`, `tarjeta`, `campo`, `etiqueta`. Úsalas en vez de repetir clases.
- Tipografía Geist Sans y Geist Mono (paquete `geist`, sin Google Fonts). Usa la mono para datos, código y métricas.
- Verifica en móvil (390 px) que no haya scroll horizontal: en grids con código usa `min-w-0` en los hijos.

## Reglas de contenido
- Las preguntas deben ser **originales**. Nunca copies preguntas de exámenes reales ni de "dumps".
- Todo el contenido visible para el alumno va en español neutro (con tuteo).
- Cada pregunta tiene 4 opciones, una sola correcta y una explicación.
- Usa la terminología vigente de Databricks (Lakeflow Declarative Pipelines, Lakeflow Jobs, Unity Catalog, AUTO CDC) y menciona el nombre anterior cuando ayude.
- Las preguntas premium nunca deben importarse desde componentes del cliente; solo se leen en `src/lib/preguntas.ts` (server-only).

## Comandos
- `npm run dev`: servidor local.
- `npm run typecheck` y `npm run build`: ejecútalos antes de hacer commit.
- `npm run validar-preguntas`: obligatorio después de editar el banco de preguntas.
- Si cambias la migración SQL, crea un archivo nuevo en `supabase/migrations/` (no edites uno ya aplicado).
