# Guía paso a paso: Supabase

Tiempo estimado: 20–30 minutos. Necesitas tener el repositorio publicado en Vercel (o saber qué dirección tendrá), porque Supabase pide la URL de tu web.

> Los nombres de los menús de Supabase cambian de vez en cuando. Si no encuentras algo, usa el buscador del panel (atajo **Ctrl + K**).

---

## Paso 1. Crear la cuenta y el proyecto

1. Entra a <https://supabase.com> → **Start your project** → inicia sesión con tu cuenta de **GitHub**.
2. Si te lo pide, crea una organización (nombre: `DataCert`, plan **Free**).
3. **New project**:
   - **Name:** `datacert`
   - **Database Password:** presiona **Generate a password** y **guárdala** en tu gestor de contraseñas (no la necesitas para la web, pero sí para conectarte a la base de datos desde otras herramientas).
   - **Region:** `South America (São Paulo)`, la más cercana a Perú.
4. **Create new project** y espera 1–2 minutos a que termine de prepararse.

## Paso 2. Crear las tablas (ejecutar las migraciones)

1. Menú izquierdo → **SQL Editor** → **New query**.
2. En GitHub, abre `supabase/migrations/0001_esquema_inicial.sql`, presiona **Raw**, copia **todo** el contenido y pégalo en el editor.
3. Presiona **Run** (o Ctrl + Enter). Debe decir **Success. No rows returned**.
4. Abre otra **New query**, pega el contenido de `supabase/migrations/0002_nombre_google.sql` y presiona **Run**.
5. Repite con `supabase/migrations/0003_progreso.sql` (meta del alumno, respuestas y panel de progreso) luego con `0004_accesos_y_crecimiento.sql` (accesos por certificación, garantía, referidos, dispositivos y métricas del panel admin) y por último con `0005_comprobantes_examen.sql` (bucket privado `reportes` para el reporte del examen y enlace a la credencial).
5. Comprueba que todo se creó: menú izquierdo → **Table Editor**. Debes ver las tablas `perfiles`, `pagos` e `intentos`, todas con el candado de **RLS enabled**.

> Ejecuta cada archivo **una sola vez**. Si el primero da un error como “already exists”, es porque ya lo ejecutaste: no pasa nada.

## Paso 3. Copiar las claves para Vercel

1. Arriba, presiona el botón **Connect** (o ve a **Project Settings → API Keys**).
2. Copia estos tres valores a un bloc de notas:

| Lo que ves en Supabase | Variable en Vercel |
|---|---|
| **Project URL** (`https://xxxx.supabase.co`, sin `/rest/v1/` al final; no uses la “RESTful endpoint”) | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon / public key** (o *Publishable key*, empieza con `sb_publishable_`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role key** (o *Secret key*, empieza con `sb_secret_`) | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ La **service_role / secret key** salta todas las reglas de seguridad. Pégala solo en Vercel; nunca en el código, en WhatsApp ni en capturas de pantalla.

## Paso 4. Decirle a Supabase cuál es tu web

1. **Authentication → URL Configuration**.
2. **Site URL:** la dirección de tu web, por ejemplo `https://certificationsweb.vercel.app` (cuando tengas dominio propio, cámbiala por `https://tudominio.pe`).
3. **Redirect URLs → Add URL**, agrega estas dos:
   - `https://certificationsweb.vercel.app/auth/confirmar`
   - `http://localhost:3000/auth/confirmar` (para pruebas en tu computadora)
4. **Save**.

> Si después conectas un dominio propio, agrega también `https://tudominio.pe/auth/confirmar`.

## Paso 5. Registro con correo: confirmación de cuenta

El servidor de correo incluido en Supabase **solo envía correos a los miembros de tu equipo en Supabase**, no a tus alumnos. Tienes dos opciones:

**Opción A (recomendada para empezar): sin confirmación por correo**

1. **Authentication → Sign In / Providers → Email**.
2. Deja **Enable Email provider** activado y **desactiva “Confirm email”**. Guarda.
3. Resultado: el alumno se registra y entra al simulador al instante. Con Google tampoco se necesita correo.
4. Limitación: **“¿Olvidaste tu contraseña?” no enviará correos** hasta que hagas la Opción B. Mientras tanto, si alguien la olvida, puede entrar con Google si su correo es de Gmail.

**Opción B (cuando tengas dominio propio): correo profesional con Resend**

1. Crea una cuenta en <https://resend.com> (gratis hasta 3,000 correos al mes).
2. **Domains → Add domain** → `tudominio.pe` → agrega los registros DNS que te indica en tu proveedor de dominio y espera a que diga **Verified**.
3. **API Keys → Create API key** y copia la clave.
4. En Supabase: **Project Settings → Authentication → SMTP Settings → Enable custom SMTP**:
   - **Sender email:** `hola@tudominio.pe` · **Sender name:** `DataCert`
   - **Host:** `smtp.resend.com` · **Port:** `465`
   - **Username:** `resend` · **Password:** la API key de Resend
5. Vuelve a activar **“Confirm email”** (paso 5A, al revés).

## Paso 6. Correos en español (solo si usas la Opción B)

**Authentication → Emails → Templates.**

**Confirm signup** → Subject: `Confirma tu cuenta en DataCert` · Body:

```html
<h2>¡Bienvenido a DataCert!</h2>
<p>Confirma tu correo para empezar a practicar para tu certificación de Databricks:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi cuenta</a></p>
<p>Si no creaste esta cuenta, ignora este correo.</p>
```

**Reset password** → Subject: `Restablece tu contraseña de DataCert` · Body:

```html
<h2>Restablece tu contraseña</h2>
<p>Recibimos una solicitud para cambiar tu contraseña. Haz clic aquí para crear una nueva:</p>
<p><a href="{{ .ConfirmationURL }}">Crear nueva contraseña</a></p>
<p>Si no fuiste tú, ignora este correo; tu contraseña no cambiará.</p>
```

## Paso 7. Activar “Continuar con Google”

Primero en Google, después en Supabase:

1. En Supabase: **Authentication → Sign In / Providers → Google** y copia la **Callback URL** (`https://xxxx.supabase.co/auth/v1/callback`). No cierres esa pestaña.
2. Entra a <https://console.cloud.google.com> con tu cuenta de Google → selector de proyectos (arriba) → **Proyecto nuevo** → nombre `DataCert` → **Crear**.
3. **APIs y servicios → Pantalla de consentimiento de OAuth** (o **Google Auth Platform → Branding**):
   - Tipo de usuario: **Externo**.
   - Nombre de la app: `DataCert` · Correo de asistencia: tu correo · Logo (opcional).
   - Página principal: tu web · Política de privacidad: `https://tu-web/privacidad` · Términos: `https://tu-web/terminos`.
   - Permisos (scopes): solo los básicos (`email`, `profile`, `openid`).
4. **Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: **Aplicación web** · Nombre: `DataCert web`.
   - **Orígenes de JavaScript autorizados:** `https://certificationsweb.vercel.app` y `http://localhost:3000`.
   - **URI de redireccionamiento autorizados:** la **Callback URL** que copiaste de Supabase.
   - **Crear** → copia el **ID de cliente** y el **Secreto del cliente**.
5. **Publica la app**: en la pantalla de consentimiento (o **Audience**), presiona **Publicar app / Pasar a producción**. Si la dejas en “Prueba”, solo podrán entrar los correos que agregues a mano.
6. De vuelta en Supabase → **Google** → activa **Enable Sign in with Google**, pega el **Client ID** y el **Client Secret** → **Save**.

## Paso 8. Variables en Vercel

En Vercel → tu proyecto → **Settings → Environment Variables**, agrega:

```
NEXT_PUBLIC_SITE_URL=https://certificationsweb.vercel.app
NEXT_PUBLIC_SUPABASE_URL=...           (paso 3)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      (paso 3)
SUPABASE_SERVICE_ROLE_KEY=...          (paso 3)
ADMIN_EMAILS=tu-correo@gmail.com
```

(Las variables de Mercado Pago van aparte; ver README.)

Después: **Deployments → ⋯ en el último → Redeploy**. Las variables solo se aplican al volver a publicar.

## Paso 9. Probar que todo funciona

1. Abre tu web → **Crear cuenta gratis** → regístrate con tu correo.
   - En Supabase → **Table Editor → perfiles** debe aparecer tu fila con tu nombre.
2. Cierra sesión y entra con **Continuar con Google**. Si usaste el mismo correo, debe ser la misma fila; si es otro, aparece una nueva con el nombre de Google.
3. Haz una práctica en el simulador y termínala.
   - En **Table Editor → intentos** debe aparecer el resultado.
4. Entra a `https://tu-web/admin` con el correo que pusiste en `ADMIN_EMAILS`. Debes ver tus KPIs.

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Al registrarse dice “revisa tu correo” y nunca llega | “Confirm email” activado sin SMTP propio | Paso 5, Opción A |
| Google muestra `redirect_uri_mismatch` | La URI en Google no coincide con la Callback URL de Supabase | Paso 7.4: copia la Callback URL exacta |
| Google dice “acceso bloqueado: app en prueba” | La pantalla de consentimiento no está publicada | Paso 7.5 |
| Después de entrar con Google vuelve a `/ingresar?error=enlace` | Falta la Redirect URL de tu web en Supabase | Paso 4 |
| `/admin` muestra “página no encontrada” | Tu correo no está en `ADMIN_EMAILS` o no hiciste Redeploy | Paso 8 |
| La web carga pero el registro no hace nada | Faltan variables o no hiciste Redeploy | Paso 8 |

## Consultas útiles (SQL Editor)

```sql
-- Registros, ventas e ingresos por día
select * from metricas_diarias order by dia desc;

-- ¿De dónde vienen tus usuarios?
select coalesce(origen, 'directo') as origen, count(*) from perfiles group by 1 order by 2 desc;

-- Dar acceso manual (cortesías, alianzas)
select extender_acceso(id, 'dbx-de-associate', 30) from perfiles where email = 'alumno@correo.com';
```
