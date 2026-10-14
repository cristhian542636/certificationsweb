# DataCert Academy

Simulador de examen para la certificación **Databricks Data Engineer Associate**, en español, con cobro mediante **QR de Yape**.

## Cómo funciona el cobro (sin pasarela de pago)

1. El alumno prueba gratis las preguntas de muestra en `/simulador`.
2. En `/comprar` escanea tu QR de Yape, paga y completa un formulario que abre WhatsApp con su nombre, correo y número de operación ya escritos. Ahí adjunta la captura.
3. Verificas el pago en tu app de Yape y generas su código:
   ```bash
   npm run generar-codigo -- alumno@correo.com        # 12 meses por defecto
   npm run generar-codigo -- alumno@correo.com 6      # 6 meses
   ```
   El script imprime un código `DBX-...` y guarda la venta en `ventas.csv` (archivo local, no se sube a Git).
4. Le envías el código por WhatsApp. El alumno lo pega en `/activar` y se desbloquea el banco completo.

El código está firmado con tu clave secreta (`ACCESS_CODE_SECRET`), así que nadie puede inventarse uno, e incluye la fecha de vencimiento. No necesitas base de datos.

> **Limitación conocida:** un alumno podría compartir su código con otra persona. Para el MVP es un riesgo aceptable. Cuando tengas volumen, el siguiente paso es agregar cuentas de usuario (por ejemplo, con Supabase).

## Configuración inicial (una sola vez)

1. **Instala las dependencias:** `npm install`
2. **Crea tu clave secreta** en un archivo `.env.local`:
   ```bash
   cp .env.example .env.local
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # pega el resultado en ACCESS_CODE_SECRET= dentro de .env.local
   ```
   Guárdala bien: si la pierdes o la cambias, los códigos ya emitidos dejan de funcionar.
3. **Personaliza** `src/config/sitio.ts` con tu nombre, bio, LinkedIn, número de WhatsApp (formato `51987654321`), titular de Yape y precio.
4. **Reemplaza** `public/yape-qr.png` con la imagen de tu QR de Yape (en la app: *Yapear → Mi QR → Compartir*).
5. **Prueba en local:** `npm run dev` y abre http://localhost:3000

## Publicar en Vercel (gratis)

1. Entra a [vercel.com](https://vercel.com), inicia sesión con GitHub e importa este repositorio.
2. En *Settings → Environment Variables* agrega `ACCESS_CODE_SECRET` con **la misma** clave de tu `.env.local`.
3. Despliega. Más adelante puedes conectar un dominio propio (por ejemplo, de punto.pe o Namecheap).

## Agregar preguntas

- Las gratuitas van en `data/preguntas/gratis.json` y las premium en `data/preguntas/premium.json`.
- Con Claude Code, usa la skill `/banco-preguntas` (por ejemplo: `/banco-preguntas gobierno 10 premium`).
- Siempre ejecuta `npm run validar-preguntas` y **revisa tú la exactitud técnica** antes de publicar.
- Meta para el lanzamiento: 150–200 preguntas premium (unas 3 simulaciones completas de 45 preguntas).

## Comandos

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Servidor local |
| `npm run build` | Build de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm run validar-preguntas` | Valida el banco de preguntas |
| `npm run generar-codigo -- correo [meses]` | Genera un código de acceso tras un pago |

## Aviso legal

Las preguntas son originales y sirven solo para practicar. Este sitio no está afiliado a Databricks, Inc.
