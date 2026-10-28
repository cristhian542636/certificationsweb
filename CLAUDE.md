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
- Garantía (`sitio.garantia`): si no aprueba, +60 días una vez por certificación (2 simulacros completos antes del examen y solicitud dentro de 15 días); se aprueba en `/admin`. El alumno adjunta su reporte del examen (PDF o imagen, máx. 4 MB por el límite de Vercel) en `POST /api/garantia`: se valida el tipo por sus primeros bytes, se sube con service role al bucket privado `reportes` (`<usuario_id>/<uuid>.<ext>`) y `/admin` lo abre con URL firmada de 1 hora. Nunca hagas público ese bucket.
- Hora del examen (`perfiles.hora_examen`, hora de Lima, opcional, migración 0006): el resultado se puede registrar desde el inicio + `examen.minutos` (`examenTerminado` en `progreso.ts`); sin hora, desde el día siguiente. `/api/perfil` rechaza un resultado antes de tiempo y borra la hora si cambia la fecha sin ella. Para la garantía solo cuentan los simulacros hechos antes del inicio del examen.
- Mientras el alumno puede solicitar la garantía o la tiene pendiente (`garantiaDelAlumno` en `src/lib/garantia.ts`), no se le ofrece comprar ni renovar (panel, barra y menú); vuelve la oferta si se rechaza o vence el plazo.
- Resultado del examen: `RegistrarResultado` (en Mi cuenta) acepta una fecha pasada (hasta 90 días) aunque no haya fijado meta. Al aprobar, `CredencialAprobado` guarda `perfiles.insignia_url` (solo `https://`, ≤300 caracteres); `/admin` lo cuenta como aprobado verificable.
- Referidos (`sitio.referidos`): enlace `/?ref=<codigo>`; el proxy lo guarda y lo aplica con `aplicar_referido`; 10% de descuento en la primera compra del invitado y 30 días para quien invita.
- Contra cuentas compartidas (`sitio.seguridad`): máximo 2 dispositivos activos (`src/proxy.ts` + `registrar_dispositivo`), marca de agua con el correo en el simulador y límite de preguntas por día (`contar_preguntas`).
- Nunca confíes en el cuerpo del webhook: siempre consulta el pago a la API de Mercado Pago y valida monto, moneda y `external_reference` (usuario y plan).
- Argumento de venta honesto: cada intento del examen cuesta `examen.costoUsd` (USD 200) y, si no aprueba, se vuelve a pagar. No menciones plazos de espera ni datos del examen que el usuario no haya confirmado. Las preguntas frecuentes del examen (idioma y descuento del Learning Festival) están en `sitio.faqExamen`; no prometas fechas ni montos de cupones.
- No agregar PayPal, Izipay ni suscripciones recurrentes sin que el usuario lo pida.

## Estructura
- `src/config/sitio.ts`: textos, precio y contacto. Úsalo en lugar de escribir valores fijos.
- `src/lib/sesion.ts`: `obtenerSesion()` devuelve el usuario, su perfil y `premium`.
- `src/lib/supabase/`: `clienteServidor()` (con sesión, respeta RLS), `clienteAdmin()` (service role, solo servidor) y `clienteNavegador()`.
- `src/app/simulador/Simulador.tsx`: simulador en el cliente (modos: diagnostico, practica, dominio, repaso, examen); guarda intento + respuestas con `POST /api/intentos` → RPC `registrar_intento`.
- `/panel`: página principal del alumno. El progreso se calcula en `src/lib/progreso.ts` (funciones puras) a partir de la RPC `mi_resumen()`; `siguientePaso()` decide la única recomendación que se muestra.
- Insignia del alumno (`calcularRango` en `progreso.ts`, dibujada en `src/components/progreso/Insignia.tsx`): Bronce = diagnóstico completo; Plata = índice ≥50, 1 simulacro completo (Premium) y 5 días de práctica; Oro = índice ≥85, un simulacro aprobado (≥32/45) y las 7 secciones en Plata u Oro. El simulador celebra cuando sube (`subioDeRango`). Se calcula al vuelo, no se guarda.
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
  - Con cuenta (no Premium), la portada nunca pide crear cuenta: sus botones llevan a "Empezar mi diagnóstico" (sin práctica) o "Ir a mi panel" (con práctica).
  - Sin práctica (gratis o Premium): el panel es una sola tarjeta para empezar el diagnóstico.
  - Gratis con diagnóstico: su resultado, una oferta Premium basada en su sección más débil y sus secciones; arriba, el botón "Pasar a Premium"; menú de cuenta mínimo.
  - Ex-Premium (acceso vencido o práctica más allá del diagnóstico): "Tu progreso" (índice y preguntas practicadas) y "Retoma donde lo dejaste" → "Renovar mi acceso", nunca la oferta de primera compra. La garantía no se ofrece el día del examen ni después.
  - Premium: índice, "Tu práctica de hoy" (recién Premium: su primer simulacro completo; después, el simulacro siempre a un clic), secciones (cada fila lleva a practicar), racha e instructor. "Extender mi acceso" solo con 15 días o menos.
  - Premium nunca ve venta: su portada es `InicioPremium` (continuar, sus certificaciones, invitar, instructor y FAQ de uso), sin "Precio" en la barra ni en el pie, y la página de su certificación muestra "Ir a mi práctica" en lugar de pases. El objetivo es fidelizar y que recomiende.
- Mostrar progreso real (índice de preparación, Bronce → Plata → Oro, racha) y celebrar avances; con poca evidencia, mensajes de ánimo en vez de cifras desalentadoras.
- La venta a usuarios gratis es personalizada (su dominio débil), nunca genérica.
- Lenguaje neutro en género ("Hola, Ana", "te damos la bienvenida"); evita adjetivos como "listo/preparado" referidos al alumno.
- No inventar testimonios, cifras de alumnos ni tasas de aprobación.
- No mencionar marcas de otras plataformas de cursos ni compararse con ellas por nombre; Databricks se nombra solo para identificar sus certificaciones, con el aviso de que no hay afiliación.

## Reglas de contenido
- Las preguntas deben ser **originales**. Nunca copies preguntas de exámenes reales ni de "dumps".
- Todo el contenido visible para el alumno va en español neutro (con tuteo).
- Cada pregunta tiene 4 opciones, una sola correcta y una explicación. Las distractoras son alternativas reales que fallan en un requisito, con largo parecido al de la correcta y sin absolutos (`validar-preguntas` controla que la correcta no sea casi siempre la más larga).
- Modo inglés: el examen se rinde en inglés (`examen.idioma`). Cada pregunta tiene su traducción en `data/traducciones/en.json` (enunciado y opciones en el mismo orden; la explicación queda en español), que `preguntas.ts` agrega como `Pregunta.en` (server-only). El simulador tiene el selector ES/EN (preferencia en `localStorage`) y el panel Premium lo recomienda en las últimas 3 semanas antes del examen.
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
