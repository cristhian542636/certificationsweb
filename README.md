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
                         registrar_pago() en Postgres ──► perfiles.premium_hasta += 1 o 3 meses (según el pase)
```

- **Todos los usuarios quedan en tu base de datos** (tabla `perfiles`), paguen o no.
- **El acceso se activa solo**: el pago con Yape se confirma en segundos y el de tarjeta, por webhook. No hay capturas ni códigos manuales.
- **Seguro**: el webhook verifica la firma de Mercado Pago, consulta el pago a la API (no confía en lo que recibe), valida monto y moneda, y es idempotente. Los reembolsos revocan el acceso automáticamente.

## Configuración (una sola vez, ~30 minutos)

### 1. Supabase: usuarios y base de datos (gratis)

1. Crea un proyecto en [supabase.com](https://supabase.com) (región: São Paulo, la más cercana a Perú).
2. **SQL Editor** → pega el contenido de `supabase/migrations/0001_esquema_inicial.sql` → **Run**.
3. **Authentication → URL Configuration**:
   - *Site URL*: `https://tu-dominio.pe`
   - *Redirect URLs*: agrega `https://tu-dominio.pe/auth/confirmar` y `http://localhost:3000/auth/confirmar`
4. **Authentication → Emails**: traduce al español las plantillas de *Confirm signup* y *Reset password*.
   Para producción configura un SMTP propio (por ejemplo, [Resend](https://resend.com)); el correo incluido en Supabase tiene un límite bajo de envíos por hora.
5. **Project Settings → API**: copia la *URL*, la *anon key* y la *service_role key*.

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

### 5. Personaliza

- `src/config/sitio.ts`: tu nombre, bio, LinkedIn, WhatsApp, correo y precio.
- Páginas legales (`/terminos`, `/privacidad`, `/libro-de-reclamaciones`): son plantillas. Complétalas con tus datos (DNI/RUC, domicilio) y revísalas con un abogado. En Perú el **Libro de Reclamaciones virtual** es obligatorio para vender en línea.

## Tu base de datos

| Tabla | Contenido |
|---|---|
| `perfiles` | Cada usuario: correo, nombre, origen (`utm_source`), fecha de registro, `premium_hasta` |
| `pagos` | Cada pago reportado por Mercado Pago: monto, método (yape, visa…), estado |
| `intentos` | Cada simulacro: modo, puntaje y resultados por dominio |
| `metricas_diarias` (vista) | Registros, ventas e ingresos por día |

- **Panel `/admin`**: KPIs (usuarios, premium, conversión, ingresos), últimos registros y pagos, y exportación de usuarios a CSV. Solo para los correos de `ADMIN_EMAILS`.
- **Consultas SQL**: en el *SQL Editor* de Supabase, por ejemplo `select * from metricas_diarias order by dia desc;`
- **Dar acceso manual** (cortesías, alianzas):
  ```sql
  update perfiles set premium_hasta = now() + interval '12 months' where email = 'alumno@correo.com';
  ```

## Desarrollo

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Servidor local en http://localhost:3000 |
| `npm run build` | Build de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm run validar-preguntas` | Valida el banco de preguntas |

Para probar pagos en local necesitas que Mercado Pago alcance tu webhook: usa las credenciales de prueba y un túnel (por ejemplo, `ngrok http 3000`), o prueba directamente en un despliegue de Vercel.

## Agregar preguntas

Las gratuitas van en `data/preguntas/gratis.json` y las premium en `data/preguntas/premium.json`. Con Claude Code puedes usar `/banco-preguntas gobierno 10 premium`. Siempre ejecuta `npm run validar-preguntas` y revisa tú la exactitud técnica.
