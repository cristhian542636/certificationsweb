---
name: banco-preguntas
description: Crea o revisa preguntas originales para el simulador Databricks Data Engineer Associate. Úsala cuando el usuario pida agregar preguntas, ampliar un dominio o revisar la calidad del banco.
---

# Banco de preguntas

Argumentos esperados: dominio (plataforma | ingesta | transformacion | produccion | gobierno), cantidad, y si son `gratis` o `premium` (por defecto, premium).

## Pasos

1. Lee `data/preguntas/gratis.json` y `data/preguntas/premium.json` para no repetir temas ni ids, y ejecuta `npm run validar-preguntas` para ver cuántas preguntas tiene cada dominio.
2. Redacta preguntas **originales** con un escenario realista (idealmente de seguros, banca o retail en LatAm). Nunca reproduzcas preguntas de exámenes reales.
3. Formato de cada pregunta (ver `src/lib/tipos.ts`):
   - `id`: continúa la numeración (`p-023`, `p-024`… o `g-011`…).
   - `enunciado` en español, con tuteo. Pon el código en `codigo` en lugar de dentro del enunciado.
   - 4 `opciones` plausibles, con distractores que reflejen errores comunes reales, no absurdos.
   - `correcta`: índice base 0. El simulador mezcla las opciones, pero igual varía la posición.
   - `explicacion`: por qué la correcta es correcta y por qué la confusión más común es incorrecta.
   - `referencia`: agrégala solo si estás seguro de que la URL de docs.databricks.com existe.
4. Si una funcionalidad cambió de nombre o comportamiento hace poco, menciónalo al usuario para que lo verifique en la documentación oficial.
5. Ejecuta `npm run validar-preguntas` y corrige los errores.
6. Muestra al usuario una tabla con el id, el tema y la respuesta correcta de cada pregunta nueva **para que la revise antes de hacer commit**. El instructor es el responsable final de la exactitud técnica.
