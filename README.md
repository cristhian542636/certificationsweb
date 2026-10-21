# DataCert

Simulador en español para la certificación **Databricks Data Engineer Associate**, con registro de usuarios, base de datos propia y pagos automáticos con **Yape y tarjeta** vía Mercado Pago.

## Cómo funciona

```
Visitante ──► Crea cuenta gratis (Supabase Auth) ──► Practica con preguntas gratis
                                                          │
                     ┌────────────────────────────────────┘
                     ▼
              /comprar  ── Yape (celular + código de aprobación) ──┐
                        └─ Tarjeta (Checkout Pro de Mercado Pago) ─┤
                                                                    ▼
                         Mercado Pago aprueba ──► webhook /api/webhooks/mercadopago
                                                                    ▼
                         registrar_pago() en Postgres ──► accesos.vence_en += 60 o 120 días (según el pase)
```

- **Todos los usuarios quedan en tu base de datos** (tabla `perfiles`), paguen o no.
- **El acceso se activa solo**: el pago con Yape se confirma en segundos y el de tarjeta, por webhook. No hay capturas ni códigos manuales.
- **Seguro**: el webhook verifica la firma de Mercado Pago, consulta el pago a la API (no confía en lo que recibe), valida monto y moneda, y es idempotente. Los reembolsos revocan el acceso automáticamente.

## Configuración (una sola vez, ~30 minutos)

### 1. Supabase: usuarios y base de datos (gratis)

> Guía detallada, menú por menú, con solución de problemas: [`docs/guia-supabase.md`](docs/guia-supabase.md).

1. Crea un proyecto en [supabase.com](https://supabase.com) (región: São Paulo, la más cercana a Perú).
2. **SQL Editor** → pega el contenido de `supabase/migrations/0001_esquema_inicial.sql` → **Run**.
3. **Authentication → URL Configuration**:
   - *Site URL*: `https://tu-dominio.pe`
   - *Redirect URLs*: agrega `https://tu-dominio.pe/auth/confirmar` y `http://localhost:3000/auth/confirmar`
4. **Authentication → Emails**: traduce al español las plantillas de *Confirm signup* y *Reset password*.
   Para producción configura un SMTP propio (por ejemplo, [Resend](https://resend.com)); el correo incluido en Supabase tiene un límite bajo de envíos por hora.
5. Ejecuta también, en orden, `0002_nombre_google.sql` (nombre de quienes entran con Google), `0003_progreso.sql` (meta del alumno, respuestas y panel de progreso) y `0004_accesos_y_crecimiento.sql` (accesos por certificación, garantía, referidos, límite de dispositivos y métricas de `/admin`).
6. **Project Settings → API**: copia la *URL*, la *anon key* y la *service_role key*.

### 1.1 Acceso con Google (botón "Continuar con Google")

1. En [Google Cloud Console](https://console.cloud.google.com) crea un proyecto.
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*; nombre de la app, tu correo de soporte, logo y los enlaces a `/privacidad` y `/terminos`. Publica la app (estado *En producción*) para que cualquier persona pueda ingresar.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth** (tipo *Aplicación web*):
   - *Orígenes de JavaScript autorizados*: `https://tu-dominio.pe` (y `http://localhost:3000` para pruebas)
   - *URI de redireccionamiento autorizados*: `https://<tu-proyecto>.supabase.co/auth/v1/callback` (la ves en Supabase → Authentication → Providers → Google)
4. Copia el *Client ID* y el *Client secret*.
5. En Supabase: **Authentication → Providers → Google** → actívalo y pega el Client ID y el secret.

Supabase vincula automáticamente las cuentas con el mismo correo verificado: si alguien se registró con correo (y lo confirmó) y luego entra con Google, sigue siendo el mismo usuario con su historial y su pase.

### 2. Mercado Pago: cobros con Yape y tarjeta

1. Crea una cuenta en [mercadopago.com.pe](https://www.mercadopago.com.pe). Puede ser una cuenta personal; no necesitas RUC para empezar.
2. Entra a **Tus integraciones** → **Crear aplicación** (tipo: pagos en línea, *Checkout API* y *Checkout Pro*).
3. En **Credenciales de prueba** copia la *Public Key* y el *Access Token*. Úsalas hasta que todo funcione; después cámbialas por las de producción.
4. En **Webhooks** → URL de producción: `https://tu-dominio.pe/api/webhooks/mercadopago`, evento **Pagos**. Copia la **clave secreta** que se genera.
5. Verifica que **Yape** esté habilitado como medio de pago en tu cuenta.

> Comisión aproximada de Mercado Pago: alrededor del 4% + IGV por venta. Revisa la tarifa vigente en tu cuenta.

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores. Para administrar el sitio, pon tu correo en `ADMIN_EMAILS`.

### 4. Publicar en Vercel (gratis)

1. Importa el repositorio en [vercel.com](https://vercel.com).
2. En **Settings → Environment Variables** agrega las mismas variables, con `NEXT_PUBLIC_SITE_URL` igual a tu dominio.
3. Despliega y conecta tu dominio.

Ambientes **dev**, **qa** y **producción** (ramas, variables y flujo de pull requests): [`docs/ambientes.md`](docs/ambientes.md).

### 5. Personaliza

- `src/config/sitio.ts`: tu nombre, bio, LinkedIn, WhatsApp, correo y precio.
- Páginas legales (`/terminos`, `/privacidad`, `/libro-de-reclamaciones`): son plantillas. Complétalas con tus datos (DNI/RUC, domicilio) y revísalas con un abogado. En Perú el **Libro de Reclamaciones virtual** es obligatorio para vender en línea.

## Tu base de datos

| Tabla | Contenido |
|---|---|
| `perfiles` | Cada usuario: correo, nombre, origen (`utm_source`), meta de examen, código de invitación, fecha de registro |
| `accesos` | Qué certificación tiene cada alumno (o `*` = todas) y hasta cuándo |
| `referidos` | Quién invitó a quién y si ya se entregó la recompensa |
| `garantias` | Solicitudes de garantía y su estado (pendiente, aprobada, rechazada) |
| `dispositivos` / `uso_diario` | Dispositivos activos por cuenta y preguntas entregadas por día (protección contra cuentas compartidas) |
| `pagos` | Cada pago reportado por Mercado Pago: monto, método (yape, visa…), estado |
| `intentos` | Cada simulacro: modo, puntaje y resultados por dominio |
| `metricas_diarias` (vista) | Registros, ventas e ingresos por día |

- **Panel `/admin`**: KPIs (usuarios, premium, conversión, ingresos), últimos registros y pagos, y exportación de usuarios a CSV. Solo para los correos de `ADMIN_EMAILS`.
- **Consultas SQL**: en el *SQL Editor* de Supabase, por ejemplo `select * from metricas_diarias order by dia desc;`
- **Dar acceso manual** (cortesías, alianzas):
  ```sql
  select extender_acceso(id, 'dbx-de-associate', 365) from perfiles where email = 'alumno@correo.com';
  ```

## Desarrollo

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Servidor local en http://localhost:3000 |
| `npm run build` | Build de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm run validar-preguntas` | Valida el banco de preguntas |
| `npm test` | Pruebas de la lógica (progreso, selección de preguntas, ambientes) |

Para probar pagos en local necesitas que Mercado Pago alcance tu webhook: usa las credenciales de prueba y un túnel (por ejemplo, `ngrok http 3000`), o prueba directamente en un despliegue de Vercel.

## Agregar preguntas

Las gratuitas van en `data/preguntas/gratis.json` y las premium en `data/preguntas/premium.json`. Con Claude Code puedes usar `/banco-preguntas gobierno 10 premium`. Siempre ejecuta `npm run validar-preguntas` y revisa tú la exactitud técnica.
