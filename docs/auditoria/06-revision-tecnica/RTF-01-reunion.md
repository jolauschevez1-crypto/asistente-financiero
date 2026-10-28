# RTF-01 · Revisión técnica formal del módulo de validación y multidivisa

**Proyecto:** Asistente Financiero · «Software bajo juicio»
**Equipo:** Jolaus Chévez, Steven González, Manuel Hurtado, Pablo Jara
**Estado:** PLANIFICADA. Las secciones 5 a 8 se completan durante la reunión y solo con lo que ocurra en ella.

## 1. Artefacto revisado y motivo

| Campo | Valor |
|---|---|
| Artefacto | Código de validación de entradas y conversión multidivisa en la versión publicada `5514da0`; los cinco archivos no cambian hasta `c9c33b4` |
| Archivos | `FRONTEND/src/app/core/input-validation.ts` (53 líneas), `BACKEND/src/finance/validation.js` (34), `BACKEND/src/finance/currency.js` (43), `BACKEND/src/finance/fx.js` (92), `BACKEND/src/finance/multicurrency.js` (107). Total: 329 líneas |
| Motivo de la elección | Es donde se originaron el defecto de mayor severidad (D-15, Alta: no se podían crear carteras) y el de mayor impacto funcional (D-03: se perdía la cotización en un traspaso entre monedas). Además concentra el requisito crítico del cambio inesperado (RF-04 a RF-10) |
| Requisitos asociados | RF-03, RF-04, RF-06, RF-07, RF-08, RF-09, RF-10, RNF-01 |
| Duración prevista | 30 minutos (Semana 4: reuniones cortas, de 3 a 5 personas, sobre un artefacto acotado) |

## 2. Roles

Los roles se asignan al iniciar la reunión. Una persona no puede ser a la vez autor y moderador.

| Rol | Función | Integrante |
|---|---|---|
| Moderador | Dirige la reunión, controla el tiempo y decide si el artefacto se acepta | ______________ |
| Autor | Explica el código y responde; no defiende, aclara | ______________ |
| Revisor 1 | Revisa validación (frontend y backend) | ______________ |
| Revisor 2 | Revisa conversión, redondeo y tasas | ______________ |
| Secretario | Anota hallazgos, acciones y el acta | ______________ |

Con cuatro integrantes, el secretario también puede actuar como revisor.

## 3. Criterios de entrada (se comprueban antes de empezar)

- [ ] Las pruebas automatizadas pasan: 69 de backend y 64 de frontend en la última ejecución registrada (EV-D20-01/02).
- [ ] Cada participante tiene acceso a los cinco archivos y a `04-registro-defectos.csv`.
- [ ] Cada revisor dedicó al menos 10 minutos a leer el artefacto antes de la reunión (anotar minutos reales en §5).
- [ ] El artefacto no cambia durante la reunión.

Si falla un criterio, la reunión se reprograma y se anota el motivo.

## 4. Agenda (30 minutos)

| Minuto | Actividad | Responsable |
|---|---|---|
| 0–3 | Apertura, roles y criterios de entrada | Moderador |
| 3–8 | El autor presenta el flujo: validar entrada → convertir → redondear → guardar | Autor |
| 8–23 | Recorrido de la lista de comprobación (§6), un punto por vez | Revisores |
| 23–27 | Clasificación de hallazgos: defecto, observación, duplicado o descartado | Todos |
| 27–30 | Decisión (aceptar, aceptar con correcciones, rechazar), acciones y responsables | Moderador |

Reglas: se revisa el producto, no a la persona; no se resuelven los defectos en la reunión, solo se registran.

## 5. Preparación individual (anotar antes de la reunión)

| Integrante | Minutos de lectura previa | Posibles hallazgos anotados |
|---|---|---|
| Jolaus Chévez | | |
| Steven González | | |
| Manuel Hurtado | | |
| Pablo Jara | | |

## 6. Lista de comprobación

| # | Pregunta | Archivo | Sí / No / N/A | Nota |
|---|---|---|---|---|
| C1 | ¿Las expresiones regulares con `\p{L}` se usan con la bandera `u` en todos los lugares (incluidos los formularios Angular)? | input-validation.ts | | |
| C2 | ¿Frontend y backend aplican la misma regla a nombres, importes y monedas? | input-validation.ts, validation.js | | |
| C3 | ¿Se rechazan importes negativos, cero, con más de 2 decimales o fuera del máximo permitido? | validation.js | | |
| C4 | ¿Solo se aceptan monedas del catálogo y se rechaza un código desconocido? | currency.js | | |
| C5 | ¿Las conversiones usan aritmética decimal y no `number` de coma flotante? | multicurrency.js | | |
| C6 | ¿La regla de redondeo es explícita (modo y número de decimales) y es la misma en todos los cálculos? | multicurrency.js | | |
| C7 | ¿Se guarda la tasa, la fuente y la fecha junto con cada conversión? | fx.js, multicurrency.js | | |
| C8 | Si el proveedor falla, ¿se usa la última tasa válida con su antigüedad y nunca se inventa una? | fx.js | | |
| C9 | ¿Una tasa más antigua que el límite de vigencia (4 días) deja de usarse para totales? | fx.js | | |
| C10 | ¿Nunca se suman importes de monedas distintas sin convertir? | multicurrency.js | | |
| C11 | ¿Los movimientos históricos conservan su importe y moneda originales? | multicurrency.js | | |
| C12 | ¿Los mensajes de error son claros y no exponen detalles internos? | validation.js | | |
| C13 | ¿Cada regla anterior tiene al menos una prueba automatizada? | `BACKEND/tests`, `*.spec.ts` | | |

## 7. Registro de hallazgos

| ID | Punto | Archivo y línea | Descripción | Tipo (defecto / observación / duplicado / descartado) | Severidad | ¿Demostrable? Evidencia | Acción | Responsable | Fecha límite |
|---|---|---|---|---|---|---|---|---|---|
| H-01 | | | | | | | | | |
| H-02 | | | | | | | | | |
| H-03 | | | | | | | | | |
| H-04 | | | | | | | | | |
| H-05 | | | | | | | | | |

Un hallazgo es **defecto** solo si se puede reproducir o señalar en el código con su efecto. Si es una preferencia o una duda sin efecto demostrable, es **observación**.

## 8. Acta

| Campo | Valor |
|---|---|
| Fecha | |
| Hora de inicio y de fin | |
| Duración real (minutos) | |
| Lugar o medio (presencial, videollamada) | |
| Asistentes | |
| Ausentes | |
| Criterios de entrada cumplidos | Sí / No (cuáles no) |
| Puntos de la lista revisados | __ de 13 |
| Hallazgos: defectos / observaciones / descartados | __ / __ / __ |
| Decisión | Aceptado / Aceptado con correcciones / Rechazado |
| Esfuerzo de revisión (horas-persona) | Σ (minutos de preparación de cada uno) + (duración real × número de asistentes), dividido entre 60 |
| Evidencia de la reunión | Foto del acta firmada, captura de la videollamada o registro de calendario |

**Firmas**

| Integrante | Firma |
|---|---|
| Jolaus Chévez | |
| Steven González | |
| Manuel Hurtado | |
| Pablo Jara | |

## 9. Criterios de salida y seguimiento

- Ningún defecto de severidad Alta o Crítica queda sin acción ni responsable.
- Cada defecto se copia a `04-registro-defectos.csv` con un ID nuevo (D-21 en adelante) y la técnica de detección «RTF-01».
- Cada acción se cierra solo con una prueba de regresión que pase; el seguimiento es defecto → acción → corrección → prueba → cierre.
- Las métricas de `05-metricas.md` (esfuerzo de revisión, defectos por hora de revisión y DRE) se recalculan con los datos reales del acta.
