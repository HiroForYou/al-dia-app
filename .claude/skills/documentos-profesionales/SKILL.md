---
name: documentos-profesionales
description: Aplica un estilo de escritura profesional, conciso y no narrativo a entregables de negocio (Excel, Word, Markdown): estimaciones, planes de trabajo, resúmenes ejecutivos, actas, informes técnicos y manuales de pipeline. Usar SIEMPRE que se genere o edite un documento destinado a un cliente o a un equipo interno, para que no lea como texto redactado por una IA. Activar con pedidos como "genera el Excel de estimación", "arma el plan de trabajo", "documenta esto para el equipo", "hazlo más profesional", "revisa mi documento", o cualquier .xlsx/.docx/.md (o script generador docx.js/python-docx/openpyxl) que salga de una conversación con Claude.
---

# Documentos profesionales (no narrados)

Un documento de negocio real, el que escribiría un analista senior, es **declarativo**: presenta el estado actual y los datos. Un documento que "suena a IA" es **narrado y defensivo**: cuenta cómo se llegó a la conclusión, anticipa objeciones, se justifica y repite. Esta skill convierte lo segundo en lo primero.

Aplica a cualquier entregable con audiencia. No aplica a mensajes de chat con el usuario ni a comentarios de código.

## Dos tipos de documento, dos densidades

| Tipo | Ejemplos | Forma dominante |
|---|---|---|
| Operativo | Estimación, plan de trabajo, acta, resumen ejecutivo | Tablas. La prosa es la excepción. |
| Técnico explicativo | Informe de metodología, manual de pipeline, guía de diagnóstico | Prosa corta + tablas + figuras. La prosa es válida si explica un mecanismo. |

En un informe técnico la prosa está permitida, pero cada párrafo cumple estas reglas:
- Una idea por párrafo. Máximo 4-5 líneas en Word; si pasa de eso, partir o convertir a tabla/lista.
- La primera frase dice el hecho; las siguientes, el mecanismo o el dato. Nunca al revés (contexto largo y la idea al final).
- Si el párrafo enumera tres o más cosas paralelas (umbrales, parámetros, casos), va en tabla o lista.

## Señales de que un documento "suena a IA"

Si el contenido tiene alguna de estas señales, reescribe antes de entregar.

### Estructura y tono

1. **Preguntas retóricas en el cuerpo**: `¿Este centro usa IM o EWM?` en una celda o párrafo. Declarar el hecho o el pendiente: `Gestión IM/EWM de los centros: Pendiente`. **Excepción solo en Word**: títulos de recuadros de definición (`¿Qué es el WMAPE?`) o de subsecciones conceptuales (`3.1 ¿Por qué son dañinas las anomalías?`). No aplica a Excel, Markdown, celdas de tabla ni párrafos.
2. **Narración en primera persona o de proceso**: `Confirmamos que...`, `Analizamos el código y encontramos...`, `El primer intento usó...`. Reescribir como hecho: `ZMMT_0080 no tiene lote (confirmado en código)`. Si el aprendizaje del proceso importa (p. ej. "un solo periodo de backtesting no es confiable"), se enuncia como criterio: `Criterio: mínimo 3 periodos de corte antes de decidir`.
3. **Meta-narración sobre el propio documento**: `A lo largo de este documento se evitan las rutas...`, `Esta sección está directamente ligada a la anterior...`, `verificado contra los encabezados markdown del script`, `es un criterio general, no un comentario textual en el código`, `como ya se indicó en la introducción`. El lector no necesita saber cómo se escribió el documento ni de dónde salió cada frase. Eliminar, o reducir a una referencia: `(ver 13.4)`.
4. **Justificación innecesaria**: `Esto es importante porque...`, `No son un detalle menor:`, `Vale la pena...`. Si el dato es importante, ponerlo en negrita o en la tabla; no anunciar que lo es.
5. **Lenguaje de "versión nueva"** en un documento que describe el estado actual: `La nueva versión reemplaza...`, `ahora se entrena...`, `se incorporó...`, `en el diseño anterior...` repetido en cada sección. Describir cómo funciona hoy. El historial va en una tabla de control de cambios al inicio, o en una sola línea `Antes: X. Ahora: Y.` donde el cambio sea el tema de la sección.
6. **Emojis como puntuación retórica** (⚠️ ✅ 📌 🚨). Usar negrita, color de celda o columna "Estado". (Un ✓/✗ como valor de estado en tabla es aceptable si el cliente ya usa esa convención.)
7. **Banners de advertencia grandilocuentes**. Una línea sobria basta: `Estimación preliminar, sujeta a confirmación de alcance.`
8. **Explicar lo obvio al lector profesional**: para qué sirve una UAT, que la documentación ayuda al mantenimiento. En un informe técnico, definir un término una sola vez (recuadro o glosario), no en cada mención.

### Frase y vocabulario

9. **Guion largo (—)**: marca típica de IA. No usarlo nunca, ni como celda vacía (usar `-` o `N/A`). **Al eliminarlo no basta con cambiarlo por dos puntos**: reescribir la frase. Sustituir `—` por `:` mecánicamente produce frases como `para que la próxima vez que aparezca un síntoma parecido: en este pipeline o en otro país: el diagnóstico sea inmediato`, que es peor. Opciones: punto y frase nueva, paréntesis, coma, o reordenar.
10. **Dos puntos encadenados**: máximo un `:` por oración. `PE_CH: BAJO: 0.256` o `peso 1.0: influencia plena` → `PE_CH (BAJO): 0.256`, `peso 1.0 (influencia plena)`.
11. **Contraste "no es X, es Y" como muletilla**: `No es una limitación de cómputo: es una restricción de diseño`, `no es una mejora de modelo sino de métrica`, `compensar no es lo mismo que resolver de raíz`. Una vez en todo el documento puede servir; tres o más es un patrón de IA. Decir directamente lo que es: `Restricción de diseño: el pipeline valida...`.
12. **Adverbios de énfasis y relleno**: `precisamente`, `justamente`, `directamente`, `sustancialmente`, `considerablemente`, `deliberadamente`, `de forma directa/independiente/consistente/sistemática`, `en la práctica`, `de fondo`, `de punta a punta`. Eliminar; casi nunca agregan información.
13. **Promesas sin dato**: `garantiza que el modelo siempre reciba datos limpios`, `trata miles de series en segundos`, `ha tenido efectos positivos concretos`, `reducciones medibles del WMAPE`, `mejora significativamente`. Toda afirmación de resultado lleva un número, una fuente o se elimina. Si no hay medición, decirlo: `Impacto en WMAPE: sin medir`.
14. **Sobregeneralizar con poca evidencia**: `casi siempre que se prueba, empeora` con 2 casos. Escribir el tamaño real: `En los 2 casos evaluados (HT y PE_CH, segmento BAJO), empeora`.
15. **Muletillas repetidas**: la misma coletilla en varias secciones (`aplica igual en Centro y en Canal`, `mismo bloque en el script de Centro y en el de Canal`, `sin necesidad de intervención manual`, `en lugar de`/`en vez de` en cada párrafo). Decirlo una vez donde corresponde (introducción o tabla) y solo marcar las excepciones.
16. **Repetir el mismo dato con distintas palabras** en dos secciones (p. ej. explicar tres veces que "PC no es un periodo de forecast"). Explicarlo en su sección y referenciar desde las demás.

### Formato y consistencia

17. **Title Case en títulos en español** (`Flujo del Pipeline: Dónde se Aplica Cada Técnica`). En español se usa mayúscula solo al inicio y en nombres propios/siglas: `Flujo del pipeline: dónde se aplica cada técnica`. Es una de las señales más visibles de texto traducido o generado.
18. **Variantes ortográficas mezcladas**: `periodo`/`período`, `on/off`/`activo/inactivo`, `log-scale`/`escala logarítmica`. Elegir una y usarla en todo el documento.
19. **Formatos numéricos mezclados**: decimal con punto en unas secciones y con coma en otras (`48.52%` y `1 / 0,63 ≈ 1,58`). Rangos siempre con guion corto sin espacios (`10%-20%`, `5-6 semanas`), no `–` ni `10% – 20%`.
20. **Énfasis inconsistente**: en una lista, o todos los ítems llevan la etiqueta en negrita o ninguno.

## Regla de oro

> Si una frase se puede convertir en una fila de tabla sin perder información, conviértela.

Antes:
> "El equipo Seidor identificó que la vista Stock a modificar tiene como clave primaria centro/material/almacén/lote, mientras que ZMMT_0080 solo tiene disgregación centro/material/almacén, sin lote. De no considerarse esta diferencia de grano, el stock protegido se duplicaría en cada lote."

Después:
| # | Punto | Estado |
|---|-------|--------|
| 2 | Consumo por lote: ZMMT_0080 sin lote, Stock con lote en su clave primaria | Confirmado |

Y si el mecanismo importa, una nota técnica corta aparte:
> Riesgo: join directo duplica el stock protegido por cada lote existente del material.

Ejemplo de prosa técnica (informe explicativo):

Antes:
> "Un entrenamiento estándar trata por igual un dato de venta de hace tres años y uno del mes pasado, aunque el comportamiento del mercado puede haber cambiado sustancialmente. Para que el modelo reaccione mejor a la dinámica reciente del negocio sin descartar por completo el historial antiguo, se incorporó una ponderación de las observaciones según su antigüedad."

Después:
> "Cada fila de entrenamiento recibe un peso según su antigüedad, para que el modelo siga más la dinámica reciente sin descartar el histórico."
> + tabla `Antigüedad | Peso` (0-6 meses: 1.0, 7-12: 0.7, >12: 0.4).

## Coherencia interna (documentos largos o versionados)

Los documentos que crecen por versiones acumulan contradicciones. Antes de entregar, revisar:

- [ ] Cada `sección X.Y` citada existe y trata lo que dice la cita. (Al insertar o renumerar secciones, las referencias viejas quedan apuntando mal.)
- [ ] La introducción, la tabla resumen y el detalle listan los mismos ítems.
- [ ] "Próximos pasos" y "Oportunidades" no incluyen cosas que el propio documento ya muestra como hechas.
- [ ] Una afirmación de resultado en una sección no contradice la tabla de evidencia de otra (p. ej. "X aporta varias veces más" vs. "X: impacto sin medir").
- [ ] Nombres de parámetros/tablas iguales en todas las menciones.
- [ ] El estado de cada ítem (Implementado / Experimental / Piloto) se dice una vez, en la tabla de estado; no se repite en cada nota.

## Checklist antes de entregar

- [ ] Cero `¿...?` en celdas, encabezados o párrafos (excepción Word: títulos de recuadro/subsección conceptual).
- [ ] Cero `nosotros/nuestro equipo/quedamos en/te comento que`; cero meta-narración sobre el documento.
- [ ] Cero guiones largos (—); ninguna oración con más de un `:`.
- [ ] Ninguna afirmación de mejora o resultado sin número, fuente o "sin medir".
- [ ] Títulos en mayúscula de oración (no Title Case).
- [ ] Una sola grafía por término, un solo separador decimal, rangos con `-`.
- [ ] Cada bloqueante o pendiente es una fila `# | Punto | Estado`, no un párrafo.
- [ ] Ningún emoji de alerta en el cuerpo.
- [ ] Descripciones de actividades como frases nominales cortas.
- [ ] Ningún dato explicado dos veces con distinta redacción; ninguna coletilla repetida en 3+ secciones.
- [ ] Referencias cruzadas verificadas (ver "Coherencia interna").
- [ ] Un colega del rubro, sin contexto de la conversación, entiende el documento sin leer párrafos de contexto.

Para revisar automáticamente las señales mecánicas (guion largo, dos puntos dobles, adverbios, contraste "no es", Title Case, variantes ortográficas, referencias a secciones inexistentes), ejecutar:

```
python ~/.claude/skills/documentos-profesionales/scripts/revisar_estilo.py <archivo.docx|.md|.js|.py|.txt>
```

Acepta el .docx final o el script generador (de un .js/.py extrae los literales de texto). Es una ayuda: las señales de contenido (promesas sin dato, contradicciones, meta-narración) requieren lectura.

## Aplicación en Excel (openpyxl)

- Encabezados de sección: celda con fondo de color + texto blanco, no un banner con emoji.
- Pendientes/bloqueantes: tabla `#`, `Punto`, `Estado`; nunca una lista de strings con `¿...?`.
- Notas de contexto: bullets factuales de 1-2 líneas, sin narrar el descubrimiento.
- Columna "Descripción": sustantivo + complemento (`Lectura de MENGE_PROTEGIDA e integración a Stock`).

## Aplicación en Word (python-docx / docx.js)

- Portada o primera página con título, versión, fecha y autor/área. Si el documento tiene versiones, una tabla corta de control de cambios (`Versión | Fecha | Cambios`) en vez de frases tipo "Esta versión incorpora, además de...".
- Resumen ejecutivo: estado actual + tabla de datos clave, no la historia del análisis.
- Tablas de riesgos con columnas fijas (`#`/`Punto`/`Estado` o `Riesgo`/`Impacto`/`Mitigación`).
- Notas laterales (sideNote/callout): solo para una advertencia operativa o una excepción. Más de una por subsección suele indicar prosa que debería integrarse o eliminarse.
- Títulos `¿Qué es X?` / `¿Por qué...?` permitidos solo en recuadros de definición y subsecciones conceptuales.
- Referencias a código con una etiqueta sobria (`Código:` / `Fuente:`), no con un prefijo narrado tipo "Así se implementa en el pipeline:".

## Aplicación en Markdown (resúmenes, actas)

- Tablas para todo lo enumerable (bloqueantes, actividades, contactos, cronograma).
- Encabezados sin emoji y en mayúscula de oración (`## Bloqueantes`).
- Hallazgos técnicos como bullet factual con fuente entre paréntesis si aporta trazabilidad (`(confirmado en spCDMInventario.sql, línea 1517)`).
