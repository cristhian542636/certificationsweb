# CLAUDE.md

Plataforma de preparación para la certificación **Databricks Data Engineer Associate**, en español, orientada a LatAm (Perú primero).

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript estricto + Tailwind CSS 4. En Next 16 el middleware se llama `src/proxy.ts`.
- **Supabase**: autenticación (correo + contraseña y Google OAuth con PKCE; retorno en `/auth/confirmar`) y Postgres. Esquema en `supabase/migrations/` (perfiles, pagos, intentos, vista `metricas_diarias`) con RLS activado.
- **Mercado Pago** (API REST, sin SDK de Node): Yape vía Checkout API (token generado en el navegador con `mp.yape`) y tarjeta vía Checkout Pro. Webhook en `/api/webhooks/mercadopago`.
- Despliegue: Vercel. Variables documentadas en `.env.example`.

## Ramas y ambientes
- `dev` → DEV, `qa` → QA (ambos Preview en Vercel, Supabase `datacert-nonprod`), `main` → producción. Detalle en `docs/ambientes.md`.
- **Haz todos los cambios en la rama `dev`.** Nunca hagas push a `qa` ni a `main`: el usuario promueve con pull requests `dev` → `qa` → `main`.
- `src/lib/entorno.ts` detecta el ambiente (`AMBIENTE`) con las variables de sistema de Vercel; fuera de producción hay franja DEV/QA, `noindex` y `SITE_URL` = URL de la rama.

## Modelo de cobro
- Catálogo en `src/config/certificaciones.ts` (`CERT_ACTUAL` = la única publicada hoy). La web se presenta como plataforma de certificaciones: no escribas textos que digan que solo hay una, ni "próximamente".
- Pases de pago único **por certificación** en `sitio.pases` (`src/config/sitio.ts`), con precio por nivel (associate/professional) y `precioLanzamiento` mientras `sitio.lanzamiento` sea true (Associate: 60 días S/ 59 → 79, 120 días S/ 89 → 119). "Todo Databricks" (`nivel: "todas"`) solo se muestra con 3+ certificaciones publicadas. Usa `pasesPara`, `precioVigente` y `precioConDescuento`; no escribas precios fijos.
- `external_reference` de Mercado Pago = `"<usuario_id>:<pase_id>:<certificacion|*>"`; `procesarPago` valida que pase y certificación sean coherentes y que el monto cubra el precio (con descuento de referido si aplica).
- El acceso vive en la tabla `accesos` (usuario, certificación o `*`, `vence_en`); `obtenerSesion()` expone `accesoHasta` y `premium`. **Solo** lo modifica `extender_acceso`, llamada por las funciones SQL `registrar_pago` (idempotente, con service role), `resolver_garantia` y la recompensa de referidos. `perfiles.premium_hasta` está obsoleta.
- Garantía (`sitio.garantia`): si no aprueba, +60 días una vez por certificación (2 simulacros completos antes del examen y solicitud dentro de 15 días); se aprueba en `/admin`.
- Referidos (`sitio.referidos`): enlace `/?ref=<codigo>`; el proxy lo guarda y lo aplica con `aplicar_referido`; 10% de descuento en la primera compra del invitado y 30 días para quien invita.
- Contra cuentas compartidas (`sitio.seguridad`): máximo 2 dispositivos activos (`src/proxy.ts` + `registrar_dispositivo`), marca de agua con el correo en el simulador y límite de preguntas por día (`contar_preguntas`).
- Nunca confíes en el cuerpo del webhook: siempre consulta el pago a la API de Mercado Pago y valida monto, moneda y `external_reference` (usuario y plan).
- No agregar PayPal, Izipay ni suscripciones recurrentes sin que el usuario lo pida.

## Estructura
- `src/config/sitio.ts`: textos, precio y contacto. Úsalo en lugar de escribir valores fijos.
- `src/lib/sesion.ts`: `obtenerSesion()` devuelve el usuario, su perfil y `premium`.
- `src/lib/supabase/`: `clienteServidor()` (con sesión, respeta RLS), `clienteAdmin()` (service role, solo servidor) y `clienteNavegador()`.
- `src/app/simulador/Simulador.tsx`: simulador en el cliente (modos: diagnostico, practica, dominio, repaso, examen); guarda intento + respuestas con `POST /api/intentos` → RPC `registrar_intento`.
- `/panel`: página principal del alumno. El progreso se calcula en `src/lib/progreso.ts` (funciones puras) a partir de la RPC `mi_resumen()`; `siguientePaso()` decide la única recomendación que se muestra.
- `/bienvenida`: onboarding (nivel + fecha de examen) para usuarios nuevos; luego diagnóstico.
- `/admin`: panel del negocio (RPC `admin_metricas()`: KPIs, embudo, pagos por revisar, garantías, alertas de cuentas compartidas, preguntas con más errores, referidos, origen), restringido a `ADMIN_EMAILS`.
- `/certificaciones/[slug]`: página de cada certificación (temario y pases).

## Diseño
- Tema oscuro único. Tokens en `src/app/globals.css` (`@theme`: fondo, panel, borde, tenue, acento, bronce/plata/oro).
- Utilidades propias: `btn-primario`, `btn-secundario`, `tarjeta`, `campo`, `etiqueta`. Úsalas en vez de repetir clases.
- Tipografía Geist Sans y Geist Mono (paquete `geist`, sin Google Fonts). Usa la mono para datos, código y métricas.
- Verifica en móvil (390 px) que no haya scroll horizontal: en grids con código usa `min-w-0` en los hijos.

## Experiencia del alumno (principios)
- Siempre **un solo siguiente paso** claro; nada de menús abrumadores.
- Mostrar solo lo que sirve en cada etapa (no agregar botones ni bloques "por si acaso"):
  - Visitante: primero elige su certificación ("Elige tu certificación" → catálogo) y desde ahí "Haz tu diagnóstico gratis" (`enlaceDiagnostico`), que pide crear la cuenta.
  - Sin práctica (gratis o Premium): el panel es una sola tarjeta para empezar el diagnóstico.
  - Gratis con diagnóstico: su resultado, una oferta Premium basada en su sección más débil y sus secciones; arriba, el botón "Pasar a Premium"; menú de cuenta mínimo.
  - Premium: índice, "Tu práctica de hoy", secciones (cada fila lleva a practicar), racha e instructor. "Extender mi acceso" solo con 15 días o menos.
- Mostrar progreso real (índice de preparación, Bronce → Plata → Oro, racha) y celebrar avances; con poca evidencia, mensajes de ánimo en vez de cifras desalentadoras.
- La venta a usuarios gratis es personalizada (su dominio débil), nunca genérica.
- Lenguaje neutro en género ("Hola, Ana", "te damos la bienvenida"); evita adjetivos como "listo/preparado" referidos al alumno.
- No inventar testimonios, cifras de alumnos ni tasas de aprobación.
- No mencionar marcas de otras plataformas de cursos ni compararse con ellas por nombre; Databricks se nombra solo para identificar sus certificaciones, con el aviso de que no hay afiliación.

## Reglas de contenido
- Las preguntas deben ser **originales**. Nunca copies preguntas de exámenes reales ni de "dumps".
- Todo el contenido visible para el alumno va en español neutro (con tuteo).
- Cada pregunta tiene 4 opciones, una sola correcta y una explicación.
- El temario sigue la guía oficial del examen (versión 4 de mayo de 2026): 7 secciones con pesos en `PESOS` (`src/lib/tipos.ts`). Se aprueba con 32/45.
- Usa la terminología vigente de Databricks (Lakeflow Spark Declarative Pipelines, Declarative Automation Bundles, Git folders, Lakeflow Jobs, Lakeflow Connect, Unity Catalog, AUTO CDC) y menciona el nombre anterior cuando ayude.
- `gratis.json` = diagnóstico fijo de 15 preguntas (mismas para todos). Premium = banco completo. La selección (`src/lib/seleccion.ts`) prioriza preguntas nunca vistas, luego falladas, y respeta las cuotas por sección en práctica y simulacro.
- Las preguntas premium nunca deben importarse desde componentes del cliente; solo se leen en `src/lib/preguntas.ts` (server-only).

## Comandos
- `npm run dev`: servidor local.
- `npm run typecheck`, `npm test` y `npm run build`: ejecútalos antes de hacer commit (la CI de GitHub los repite).
- `npm test`: pruebas de la lógica pura (`tests/`). Agrega pruebas cuando cambies `progreso.ts`, `seleccion.ts` o `entorno.ts`.
- `npm run validar-preguntas`: obligatorio después de editar el banco de preguntas.
- Si cambias la migración SQL, crea un archivo nuevo en `supabase/migrations/` (no edites uno ya aplicado).
