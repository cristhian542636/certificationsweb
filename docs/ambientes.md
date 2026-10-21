# Ambientes: dev, qa y producción

Tres ambientes con planes gratuitos (GitHub, Vercel Hobby y Supabase Free).

| Ambiente | Rama de GitHub | Vercel | Supabase | Mercado Pago | Dirección |
|---|---|---|---|---|---|
| **DEV** | `dev` | Preview | `datacert-nonprod` | credenciales de prueba | `certificationsweb-git-dev-datacert.vercel.app` |
| **QA** | `qa` | Preview | `datacert-nonprod` | credenciales de prueba | `certificationsweb-git-qa-datacert.vercel.app` |
| **PRD** | `main` | Production | proyecto de producción | credenciales reales | `certificationsweb.vercel.app` |

Supabase Free permite 2 proyectos activos, por eso dev y qa comparten `datacert-nonprod`.

## Flujo de trabajo

```
cambios ──► dev ──(pull request)──► qa ──(pull request)──► main = producción
```

1. Todo cambio se sube a `dev`. Vercel lo publica solo en la dirección de DEV.
2. Cuando DEV está bien, crea un pull request de `dev` → `qa` y lo apruebas.
3. Pruebas en QA. Si todo está bien, creas un pull request de `qa` → `main`. Al aprobarlo, se publica en producción.

Cada push a `dev` y cada pull request hacia `dev`, `qa` o `main` ejecuta la revisión automática (`.github/workflows/ci.yml`): valida el banco de preguntas, corre las pruebas (`npm test`), los tipos y el build. Si sale en rojo, no apruebes el pull request.

## Cómo sabe la web en qué ambiente está

`src/lib/entorno.ts` lo deduce de las variables de sistema de Vercel (`NEXT_PUBLIC_VERCEL_ENV` y la rama). Para eso, en Vercel → Settings → Environments debe seguir marcada la casilla **Enable access to System Environment Variables**.

Fuera de producción la web:
- muestra una franja **DEV** (amarilla), **QA** (violeta) o **LOCAL** arriba de todo;
- antepone `[DEV]` o `[QA]` al título de la pestaña;
- pide a los buscadores no indexarla (`noindex`);
- usa la dirección de su propia rama como `SITE_URL` (no hace falta configurar `NEXT_PUBLIC_SITE_URL` en Preview).

## Variables de entorno en Vercel

| Variable | Production | Preview (dev y qa) |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://certificationsweb.vercel.app` (o tu dominio) | no se configura |
| `NEXT_PUBLIC_SUPABASE_URL` | proyecto de producción | `datacert-nonprod` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | proyecto de producción | `datacert-nonprod` |
| `SUPABASE_SERVICE_ROLE_KEY` (Secret) | proyecto de producción | `datacert-nonprod` |
| `ADMIN_EMAILS` | tu correo | tu correo |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | credencial real | credencial de prueba |
| `MP_ACCESS_TOKEN` (Secret) | credencial real | credencial de prueba |
| `MP_WEBHOOK_SECRET` (Secret) | clave de producción | clave de prueba |

Las variables `NEXT_PUBLIC_*` van como **Config** (son públicas por diseño). Si agregas o cambias una variable, haz **Redeploy** de la rama para que la tome.

## Supabase `datacert-nonprod`

- Authentication → URL Configuration:
  - Site URL: `https://certificationsweb-git-dev-datacert.vercel.app`
  - Redirect URLs: `https://certificationsweb-git-dev-datacert.vercel.app/auth/confirmar`, `https://certificationsweb-git-qa-datacert.vercel.app/auth/confirmar` y `http://localhost:3000/auth/confirmar`
- Sign In / Providers: Email con **Confirm email** apagado; Google activado con el mismo Client ID y Secret de producción.
- En Google Cloud, el cliente OAuth tiene las dos *Authorized redirect URIs*: la de producción y la de `datacert-nonprod` (`https://<ref>.supabase.co/auth/v1/callback`).

Supabase Free **pausa un proyecto tras 7 días sin actividad**. Si DEV o QA dejan de funcionar después de unos días sin uso, entra al proyecto en Supabase y presiona **Restore**.

## Cambios en la base de datos (migraciones)

1. Crea un archivo nuevo en `supabase/migrations/` (nunca edites uno ya aplicado).
2. Ejecútalo en el SQL Editor de `datacert-nonprod` y prueba en DEV y QA.
3. **Antes** de aprobar el pull request `qa` → `main`, ejecútalo en el proyecto de producción. Así el código nuevo encuentra la base de datos lista.

### Migración 0004 (accesos por certificación, garantía, referidos y dispositivos)

Ejecuta `supabase/migrations/0004_accesos_y_crecimiento.sql` en `datacert-nonprod` antes de probar esta versión en DEV, y en el proyecto de producción **antes** de aprobar el pull request `qa` → `main`. Copia el premium vigente a la tabla `accesos`, así que nadie pierde su acceso.

## Agregar una certificación

1. Agrégala en `src/config/certificaciones.ts` con `publicada: false` mientras preparas el contenido.
2. Separa el banco por certificación (`data/preguntas/<id>/gratis.json` y `premium.json`) y lleva las secciones y pesos de `src/lib/tipos.ts` a la configuración de cada certificación. Hoy ambos corresponden a la única certificación publicada.
3. Filtra por `certificacion` las lecturas de `intentos`, `respuestas` y `mi_resumen()` (las columnas ya existen desde la migración 0004).
4. Si es de un nivel nuevo, agrega su pase en `sitio.pases`. Con 3 o más publicadas aparece el pase "Todo Databricks".
5. Cambia a `publicada: true`: aparece en la portada y en `/certificaciones/<slug>`.

## Pagos de prueba en DEV y QA

Vercel pide iniciar sesión con tu cuenta para ver las direcciones de Preview (Deployment Protection). Tú puedes entrar, pero el aviso (webhook) de Mercado Pago no. Para probar pagos con tarjeta en DEV o QA:

1. Vercel → Settings → **Deployment Protection** → **Protection Bypass for Automation** → genera el secreto.
2. Haz Redeploy de la rama. Vercel crea la variable `VERCEL_AUTOMATION_BYPASS_SECRET` y la web la agrega sola a la dirección del webhook (solo fuera de producción).

Los pagos con Yape se confirman al momento, sin depender del webhook.

## Límites de los planes gratuitos

- **Vercel Hobby** es para uso no comercial. Cuando empieces a vender, pasa el proyecto a Vercel Pro.
- **Supabase Free**: 2 proyectos, 500 MB de base de datos y pausa por inactividad.
- **GitHub Actions**: minutos ilimitados en repositorios públicos y 2 000 minutos al mes en privados; cada revisión toma unos 2 minutos.
