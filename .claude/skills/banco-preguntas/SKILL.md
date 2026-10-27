---
name: banco-preguntas
description: Crea o revisa preguntas originales para el simulador Databricks Data Engineer Associate. Úsala cuando el usuario pida agregar preguntas, ampliar un dominio o revisar la calidad del banco.
---

# Banco de preguntas

Argumentos esperados: dominio (plataforma | ingesta | transformacion | jobs | cicd | optimizacion | gobierno), cantidad, y si son `gratis` o `premium` (por defecto, premium).

Fuente de verdad del temario: la guía oficial del examen (versión del 4 de mayo de 2026). Pesos: plataforma 6%, ingesta 21%, transformacion 22%, jobs 16%, cicd 10%, optimizacion 10%, gobierno 15%. El banco gratuito (`gratis.json`) es el diagnóstico: 15 preguntas fijas repartidas según esos pesos; no le agregues más sin ajustar el diagnóstico.

## Pasos

1. Lee `data/preguntas/gratis.json` y `data/preguntas/premium.json` para no repetir temas ni ids, y ejecuta `npm run validar-preguntas` para ver cuántas preguntas tiene cada dominio.
2. Redacta preguntas **originales**. La guía oficial del examen y el examen de práctica de Databricks incluyen preguntas de muestra: úsalos solo como referencia de estilo y temario, nunca como base de un escenario ni de sus opciones. Redacta con un escenario realista (idealmente de seguros, banca o retail en LatAm), al estilo del examen actual: un contexto con requisitos concretos ("necesita X, Y y Z") y la pregunta "¿qué opción cumple…?". Nunca reproduzcas ni parafrasees preguntas de exámenes reales, de la guía oficial o de exámenes de práctica.
   - Usa los nombres vigentes: Lakeflow Spark Declarative Pipelines (antes Delta Live Tables), Declarative Automation Bundles (antes Databricks Asset Bundles), Git folders (antes Repos), Lakeflow Jobs, Lakeflow Connect, AUTO CDC.
   - Para que un simulacro no repita preguntas, cada dominio necesita al menos su cuota por simulacro (45 × peso): plataforma 3, ingesta 9, transformacion 10, jobs 7, cicd 5, optimizacion 4, gobierno 7.
3. Formato de cada pregunta (ver `src/lib/tipos.ts`):
   - `id`: prefijo del dominio + número (`pla-07`, `ing-17`, `tra-19`, `job-13`, `cic-09`, `opt-08`, `gob-11`). Nunca reutilices un id existente: el historial de los alumnos se guarda por id.
   - `enunciado` en español, con tuteo. Pon el código en `codigo` en lugar de dentro del enunciado. Estructura del examen: primero el contexto (quién, qué necesita y sus requisitos), luego una línea en blanco (`\n\n`) y la pregunta sola (por ejemplo, "¿Qué opción cumple estos requisitos?").
   - 4 `opciones` plausibles, con distractores que reflejen errores comunes reales, no absurdos.
   - `correcta`: índice base 0. El simulador mezcla las opciones, pero igual varía la posición.
   - `explicacion`: por qué la correcta es correcta y por qué la confusión más común es incorrecta.
   - Nombres de tablas, columnas, funciones y opciones van entre comillas invertidas (`asi`): el simulador los muestra como código.
   - `referencia`: agrégala solo si estás seguro de que la URL de docs.databricks.com existe.
   - Traducción al inglés en `data/traducciones/en.json`, redactada como el examen oficial y no como traducción literal: el contexto empieza con un rol ("A data engineer at an insurance company…", "The data engineering team…"), usa "they" para personas genéricas, separa la pregunta con `\n\n` ("Which option meets these requirements?", "Which command should the data engineer run?", "What is the most likely cause?") y las opciones son frases paralelas, sin punto final. Detalles: (`"<id>": { "enunciado", "opciones" }`), con las opciones en el **mismo orden** que en español: el examen se rinde en inglés y el simulador permite cambiar de idioma. Usa los términos en inglés de la documentación oficial; deja igual el código y los nombres de tablas y columnas. La explicación no se traduce.
4. Si una funcionalidad cambió de nombre o comportamiento hace poco, menciónalo al usuario para que lo verifique en la documentación oficial.
5. Ejecuta `npm run validar-preguntas` y corrige los errores (también falla si falta la traducción al inglés).
6. Muestra al usuario una tabla con el id, el tema y la respuesta correcta de cada pregunta nueva **para que la revise antes de hacer commit**. El instructor es el responsable final de la exactitud técnica.
