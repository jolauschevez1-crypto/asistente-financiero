# Matriz de cumplimiento académico · «Software bajo juicio»

**Versión:** final · **Fecha de corte:** 2026-10-27 03:45Z
**Equipo:** Jolaus Chévez, Steven González, Manuel Hurtado, Pablo Jara · Universidad Técnica de Machala, Facultad de Ingeniería Civil, Tecnologías de la Información, 6.º A
**Código auditado:** rama `claude/project-thread-noiuro` en `c9c33b4`. Producción corre `5c7c8c5`; la única diferencia de código es la corrección de D-20, sin publicar.

## 1. Cómo se evaluó

Contrastamos cada requisito de la consigna del primer parcial (§5 fases, §6 trazabilidad, §7 cambio inesperado, §8 entregables, §9 estructura del informe, §10 defensa y §11 validez de la evidencia) con el contenido real del expediente, el código y las evidencias. La existencia de un archivo con el nombre del entregable no se consideró suficiente: revisamos su contenido, sus cifras y si las cifras se pueden reproducir.

La columna «Estado» es el resultado de la inspección inicial (2026-10-27 03:10Z). «Acción» es lo que hicimos para corregir la deficiencia. «Estado final» es el resultado después de las correcciones, con la evidencia que lo sostiene.

Verificaciones ejecutadas (2026-10-27, entorno local aislado, datos ficticios `*@local.test`, proveedor de tasas simulado):

| Verificación | Comando | Inicial | Final |
|---|---|---|---|
| Pruebas de backend | `cd BACKEND && npm test` | 69/69 | 69/69 (EV-D20-01) |
| Pruebas de frontend | `npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox` | 60/60 | 64/64 (EV-D20-02) |
| Compilación | `npx ng build` | Correcta | Correcta |
| Iconos | `npm run check:icons` | 59 en el subconjunto | 59 en el subconjunto |
| Barrido de rutas | Playwright: 12 rutas × 2 anchos con usuario no administrador | 3 rutas de administración muestran el login (D-16) | 0 errores, 0 respuestas ≥ 400, 0 desbordes (EV-D16-02) |
| Accesibilidad | axe-core 4.10.3, 60 escaneos; teclado 21 controles | — | 0 violaciones; 21/21 (EV-REG-02/03) |
| Consistencia del expediente | Script que cruza cada D-, CP-, RF-, RNF- y EV- citado con 02, 04, 09 y el índice de evidencias, y comprueba que cada ruta y enlace exista | No ejecutado | 20 defectos, 53 casos, 25 requisitos; 0 referencias rotas |
| Voz del expediente | `grep` de menciones a herramientas de asistencia, «OK del usuario», marcadores de integrante e instrucciones a terceros | 18 pasajes en 10 archivos | 0 |
| Producción | API de Vercel y `/api/health` (sin sesión) | `5514da0` | `5c7c8c5` READY, paquete igual al probado, health UP (EV-PROD-01) |
| Variables de producción | Nombres en Vercel, sin valores | IA configurada, Telegram y SMTP apagados, `CRON_SECRET` presente | Sin cambios |

Estados: **CUMPLE**, **CUMPLE PARCIALMENTE**, **NO CUMPLE**, **NO EVALUADO**, **BLOQUEADO**.

## 2. Matriz

### Fase 1 · Expediente inicial del producto

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F1-01 | Fase 1 | Identificar propósito, alcance, usuarios y contexto de operación | `01-ficha-tecnica.md` §1–§4 | CUMPLE | — | Redacción en voz del equipo | — | CUMPLE |
| F1-02 | Fase 1 | Documentar funcionalidades principales | `01` §2; `FRONTEND/src/app/app.routes.ts` | CUMPLE PARCIALMENTE | No distinguía módulos reales, configurables y desactivados | Tabla «Módulos: reales, configurables y desactivados» en `01` §2 | Variables de Vercel (solo nombres) | CUMPLE |
| F1-03 | Fase 1 | Requisitos funcionales y atributos de calidad | `02-requisitos.csv` (25) | CUMPLE | — | Origen de los cambios de requisito atribuido al equipo | — | CUMPLE |
| F1-04 | Fase 1 | Restricciones, riesgos iniciales y artefactos disponibles | `01` §4–§6 | CUMPLE | — | — | — | CUMPLE |
| F1-05 | Fase 1 | Ficha técnica comprensible por un tercero | `01` | CUMPLE PARCIALMENTE | Nombraba la herramienta de asistencia; faltaban los datos institucionales | Equipo, institución, carrera, curso y fecha de entrega en `01`; versión de producción actualizada | Datos del equipo (recibidos) | CUMPLE |

### Fase 2 · Auditoría con modelos de calidad

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F2-01 | Fase 2 | Aplicar las dimensiones de Garvin | `03-matriz-modelos-calidad.csv` (8 filas MQ-G) | CUMPLE | La diferencia entre las 5 perspectivas de clase y las 8 dimensiones está explicada en `00` | — | — | CUMPLE |
| F2-02 | Fase 2 | Aplicar los factores de McCall | `03` (11 filas MQ-M) | CUMPLE | — | MQ-M09 actualizado a 5 despliegues | — | CUMPLE |
| F2-03 | Fase 2 | Aplicar ISO/IEC 9126 | `03` (27 filas MQ-I) | CUMPLE PARCIALMENTE | Se creyó que faltaban filas de conformidad | Comprobado: las 6 características tienen su fila de Conformidad (MQ-I05, I09, I14, I17, I22, I27). 2 NO EVALUADO y 1 PENDIENTE están justificados | `03` | CUMPLE |
| F2-04 | Fase 2 | Determinar pertinencia | `03` columnas Aplicabilidad y Justificación | CUMPLE | — | — | — | CUMPLE |
| F2-05 | Fase 2 | Relacionar cada elemento con requisito, criterio, métrica y evidencia | `03` | CUMPLE | — | Script de consistencia | Salida del script | CUMPLE |
| F2-06 | Fase 2 | Comparar diagnósticos y justificar el modelo más adecuado | `03b-conclusion-modelos.md` | CUMPLE | — | Cifras de defectos escapados actualizadas | — | CUMPLE |

### Fase 3 · Autopsia de defectos y métricas

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F3-01 | Fase 3 | Identificar errores, defectos y fallos reales o deliberados | `04-registro-defectos.csv` | CUMPLE PARCIALMENTE | Faltaba D-16 y la procedencia | D-16 a D-20 añadidos; columna «Procedencia»: 13 originales, 7 introducidos, 0 sembrados | EV-D16..EV-D20 | CUMPLE |
| F3-02 | Fase 3 | Artefacto de origen, propagación e impacto | `04b-autopsia-defectos.csv` | CUMPLE | — | D-16 a D-20 añadidos | — | CUMPLE |
| F3-03 | Fase 3 | Clasificar y fijar severidad y prioridad | `04` | CUMPLE | — | — | — | CUMPLE |
| F3-04 | Fase 3 | Campos completos por defecto | `04` (20 columnas) | CUMPLE PARCIALMENTE | Sin columna de posible solución | Columnas «Posible solución» y «Solución aplicada» separadas | — | CUMPLE |
| F3-05 | Fase 3 | Número y distribución de defectos | `05-metricas.md` §1 | CUMPLE | Cambiaba con los defectos nuevos | Recalculado: 20; código 10, diseño 5, configuración 3, documentación 2; severidad 0/2/10/8 | — | CUMPLE |
| F3-06 | Fase 3 | Densidad de defectos | `05` §1 y §5 | CUMPLE PARCIALMENTE | Conteo de líneas de otra versión, sin comando | 20 / 15,715 = 1,27 con la versión publicada y el comando en `05` §5. No cumple el umbral ≤ 1,0 y se conserva | Salida del comando | CUMPLE |
| F3-07 | Fase 3 | Tasa de detección | `05` §1 | CUMPLE | — | Recalculado por técnica | — | CUMPLE |
| F3-08 | Fase 3 | Eficacia de eliminación (DRE) | `05` §1 | CUMPLE | — | Recalculada: 10 / (10 + 10) = 50 %, no cumple ≥ 90 % | — | CUMPLE |
| F3-09 | Fase 3 | Esfuerzo de revisión | `05` §4; `06` §2 | NO CUMPLE | No había horas registradas | Duración de R1–R8 desde commits y evidencias: 195 min = 3,25 horas-persona; 5,5 defectos/hora. La velocidad de revisión queda NO EVALUADO y el esfuerzo de la RTF-01 depende de su acta | Acta de la RTF-01 | CUMPLE PARCIALMENTE |
| F3-10 | Fase 3 | Reporte técnico de defectos | `05`, `04b`, Word | CUMPLE | — | — | — | CUMPLE |

### Fase 4 · Revisión técnica formal

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F4-01 | Fase 4 | Seleccionar un artefacto relevante | `06-revision-tecnica/RTF-01-reunion.md` §1 | CUMPLE PARCIALMENTE | Artefacto solo propuesto | Fijado: validación de entradas y conversión multidivisa, 5 archivos, 329 líneas, con motivo | — | CUMPLE |
| F4-02 | Fase 4 | Asignar roles | `RTF-01` §2 | NO CUMPLE | Roles sin personas | Roles definidos; la asignación se hace al iniciar la reunión, que no ha ocurrido | Acta de la RTF-01 | NO CUMPLE |
| F4-03 | Fase 4 | Criterios de entrada y lista de comprobación | `RTF-01` §3 y §6; `06` §3 | CUMPLE PARCIALMENTE | La RTF no tenía criterios propios | Criterios de entrada y salida y lista de 13 preguntas | — | CUMPLE |
| F4-04 | Fase 4 | Ejecutar la revisión, registrar y clasificar hallazgos | `06` §1–§2 | CUMPLE PARCIALMENTE | Sin separación planificado/ejecutado | Tabla planificado frente a ejecutado; R1–R8 con hallazgos. La RTF-01 no se ejecutó | Acta de la RTF-01 | CUMPLE PARCIALMENTE |
| F4-05 | Fase 4 | Realizar una reunión técnica formal | `RTF-01` §8 | BLOQUEADO | No hay evidencia de reunión | Reunión de 30 minutos planificada; el acta queda vacía hasta que ocurra. No se registra una reunión que no existió | Fecha, asistentes, acta y firmas reales | BLOQUEADO |
| F4-06 | Fase 4 | Diferenciar defectos demostrables de observaciones | `RTF-01` §7; `06` R2 | CUMPLE PARCIALMENTE | Sin columna | Columna «Tipo (defecto / observación / duplicado / descartado)» con su regla | — | CUMPLE |
| F4-07 | Fase 4 | Acciones correctivas, acta y seguimiento | `06`; `04` | CUMPLE PARCIALMENTE | Sin acta | Seguimiento defecto → acción → corrección → prueba → cierre en `04`; el acta depende de F4-05 | Acta de la RTF-01 | CUMPLE PARCIALMENTE |

### Fase 5 · Plan SQA

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F5-01 | Fase 5 | Objetivos y metas de calidad | `07-plan-sqa.md` | CUMPLE | — | — | — | CUMPLE |
| F5-02 | Fase 5 | Responsables, actividades, estándares y procedimientos | `07` | CUMPLE PARCIALMENTE | Marcadores `[Integrante n]` | Responsable: el equipo completo, sin roles individuales por decisión del equipo | — | CUMPLE |
| F5-03 | Fase 5 | Revisiones, auditorías, no conformidades, métricas, indicadores y evidencias | `07` | CUMPLE | — | — | — | CUMPLE |
| F5-04 | Fase 5 | Umbrales fijados antes de evaluar | `07` | CUMPLE | — | — | — | CUMPLE |
| F5-05 | Fase 5 | Matriz Meta → Tarea → Responsable → Métrica → Indicador → Umbral → Evidencia → Estado | `07` | CUMPLE | Estados a la fecha anterior | Estados actualizados al corte final | — | CUMPLE |

### Fase 6 · Diseño de pruebas

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F6-01 | Fase 6 | Estrategia con unidad, integración, sistema y aceptación | `08-plan-pruebas.md` §2 | CUMPLE | — | — | — | CUMPLE |
| F6-02 | Fase 6 | Caja negra y caja blanca | `08` §3; `09` columna Técnica | CUMPLE | — | — | — | CUMPLE |
| F6-03 | Fase 6 | Partición de equivalencia, valores límite y tablas de decisión | `08` §3 y §3.1 | CUMPLE | Tabla de decisión solo nombrada | Tabla desarrollada sesión × rol × ruta con sus 3 pruebas (CP-49) | `admin.guard.spec.ts` | CUMPLE |
| F6-04 | Fase 6 | Particularidades web y orientadas a objetos | `08` §3 y §3.2 | CUMPLE PARCIALMENTE | Orientación a objetos no explícita | Apartado §3.2 | — | CUMPLE |
| F6-05 | Fase 6 | Casos con precondiciones, datos, esperado, criterio y evidencia | `09-casos-prueba.csv` (53 casos, 13 columnas) | CUMPLE | — | CP-49 a CP-53 añadidos | — | CUMPLE |
| F6-06 | Fase 6 | Cada caso relacionado con un requisito o riesgo | `09`; `10` | CUMPLE | — | Script de consistencia | Salida del script | CUMPLE |

### Fase 7 · Ejecución, evidencia y decisión

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F7-01 | Fase 7 | Ejecutar una muestra representativa | `09`: 49 aprobados, 1 parcial, 3 no ejecutados; 133/133 automáticas | CUMPLE | — | Registros del 2026-10-27 incorporados | EV-PRU-03/04, EV-REG-01, EV-D20-01/02 | CUMPLE |
| F7-02 | Fase 7 | Registrar resultados, defectos, incidencias y evidencias | `09`, `04`, `evidencias/README.md` | CUMPLE | — | — | — | CUMPLE |
| F7-03 | Fase 7 | Consolidar calidad, revisión, SQA y pruebas | `12-informe-liberacion.md` | CUMPLE | — | — | — | CUMPLE |
| F7-04 | Fase 7 | Emitir decisión GO / CONDITIONAL GO / NO-GO | `12` §1 | CUMPLE | — | Revisada con D-16 a D-20: se sostiene CONDITIONAL GO | — | CUMPLE |
| F7-05 | Fase 7 | Justificación cualitativa y cuantitativa | `12` §1–§3 | CUMPLE | — | — | — | CUMPLE |
| F7-06 | Fase 7 | Verificación en producción de la versión liberada | EV-PROD-01; CP-46 | CUMPLE PARCIALMENTE | Sin sesión no se verificó tasa real, cron, LCP móvil ni D-09, D-11 a D-19 | Quinto despliegue verificado sin sesión. La verificación con sesión no se pudo hacer: el dominio no responde desde el entorno de verificación y la contraseña de la cuenta de prueba no está disponible | Captura y respuesta de la API con sesión | CUMPLE PARCIALMENTE |

### Trazabilidad (§6)

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| TR-01 | §6 | Cadena REQ → atributo/riesgo → criterio → métrica → caso → resultado → defecto → evidencia | `10-trazabilidad-maestra.csv` (54 filas, 8 columnas) | CUMPLE | — | Filas de D-16 a D-20 | — | CUMPLE |
| TR-02 | §6 | Ningún caso sin requisito o riesgo | `09` / `10` | CUMPLE | — | Script de consistencia | — | CUMPLE |
| TR-03 | §6 | Ningún requisito declarado probado sin evidencia | `10`: RF-06, RNF-03, RNF-04 y RNF-08 declarados sin completar | CUMPLE | Cobertura 21/25 = 84 % | — | — | CUMPLE |
| TR-04 | §11 | Consistencia entre informe, matrices y evidencias | Expediente, Word y Excel | NO EVALUADO | Sin comprobación cruzada | Script de IDs y rutas (0 referencias rotas); Word y Excel regenerados desde los mismos CSV | Salida del script | CUMPLE |

### Cambio inesperado (§7)

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| CI-01 | §7 | Requisitos que cambian y estables | `11-impacto-cambio.md` §2 | CUMPLE | — | — | — | CUMPLE |
| CI-02 | §7 | Atributos de calidad afectados | `11` §3 | CUMPLE | — | — | — | CUMPLE |
| CI-03 | §7 | Nuevos riesgos | `11` §3–§4 | CUMPLE | — | — | — | CUMPLE |
| CI-04 | §7 | Métricas a reconsiderar | `11` §6 | CUMPLE | — | — | — | CUMPLE |
| CI-05 | §7 | Casos inválidos o insuficientes | `11` §5 | CUMPLE | — | — | — | CUMPLE |
| CI-06 | §7 | Pruebas nuevas | `11` §5 y §11 | CUMPLE | — | — | — | CUMPLE |
| CI-07 | §7 | Efecto en la decisión | `11` §8 | CUMPLE | — | — | — | CUMPLE |
| CI-08 | §7 | Carga ×5 | EV-REN-02; `11` §4 | CUMPLE PARCIALMENTE | Medido solo en local | Limitación declarada en `11` §4 y `12` §4: arranque en frío y latencia de Neon no medidos | Medición en producción | CUMPLE PARCIALMENTE |
| CI-09 | §7 | Impacto en saldos, histórico, precisión, conversión, tasas, persistencia, seguridad, reportes y regresión | `11` §4 | CUMPLE PARCIALMENTE | Disperso | Tabla única por aspecto con antes, después, riesgo, control, evidencia y estado | — | CUMPLE |
| CI-10 | §7 | Demostrar que no quedaron requisitos críticos sin probar | `13` §2.6 | CUMPLE PARCIALMENTE | RF-06 sin ejecutar en producción | Requisitos críticos sin verificar listados con su caso. RF-06 sigue sin verificar en producción | CP-13 | CUMPLE PARCIALMENTE |

### Entregables (§8)

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| EN-01 | §8.1 | Expediente técnico inicial | `01`, `02` | CUMPLE | — | — | — | CUMPLE |
| EN-02 | §8.2 | Auditoría comparativa de modelos | `03`, `03b` | CUMPLE | — | — | — | CUMPLE |
| EN-03 | §8.3 | Registro, clasificación y métricas de defectos | `04`, `04b`, `05` | CUMPLE PARCIALMENTE | F3-01, F3-06, F3-09 | F3-01 y F3-06 resueltos | Acta de la RTF-01 (F3-09) | CUMPLE PARCIALMENTE |
| EN-04 | §8.4 | Expediente completo de RTF | `06` | NO CUMPLE | Sin reunión ni acta | Expediente preparado (artefacto, roles, criterios, agenda, lista, registro, acta y salida) | Reunión real | NO CUMPLE |
| EN-05 | §8.5 | Plan SQA | `07` | CUMPLE | — | — | — | CUMPLE |
| EN-06 | §8.6 | Estrategia y plan de pruebas | `08` | CUMPLE | — | — | — | CUMPLE |
| EN-07 | §8.7 | Casos y evidencias de ejecución | `09`, `evidencias/` | CUMPLE | — | — | — | CUMPLE |
| EN-08 | §8.8 | Matriz maestra de trazabilidad | `10` | CUMPLE | — | — | — | CUMPLE |
| EN-09 | §8.9 | Informe de impacto del cambio | `11` | CUMPLE | — | CR-06 y tabla por aspecto | — | CUMPLE |
| EN-10 | §8.10 | Informe ejecutivo de decisión | `12` | CUMPLE | — | Cifras y decisión al corte final | — | CUMPLE |
| EN-11 | §8.11 | Repositorio organizado de evidencias | `evidencias/README.md` | CUMPLE PARCIALMENTE | Atribuciones a personas; faltaban las capturas «antes» de producción | Índice en voz del equipo; EV-ANTES-02 (70 capturas, correos difuminados) y 12 filas nuevas | — | CUMPLE |
| EN-12 | §8.12 | Defensa técnica | `13-defensa-tecnica.md` | CUMPLE PARCIALMENTE | No respondía por pregunta | Una sección por cada pregunta de la consigna, con enlaces | — | CUMPLE |

### Informe final (§9) y validez de la evidencia (§11)

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| IF-01 | §9 | Portada e identificación del equipo | Word, portada | NO CUMPLE | Marcadores; nombraba la herramienta de asistencia | Portada con institución, facultad, carrera, curso, integrantes, docente y fecha de entrega | — | CUMPLE |
| IF-02 | §9 | Secciones 14 a 27 | Word | CUMPLE | — | Regenerado con las cifras finales | — | CUMPLE |
| IF-03 | §9 | Voz del equipo, sin instrucciones a terceros | Expediente y Word | NO CUMPLE | 18 pasajes en 10 archivos | Reescrito; `grep` sin coincidencias | Salida del `grep` | CUMPLE |
| VE-01 | §11 | Métricas con datos de origen, fórmula, resultado e interpretación | `05` | CUMPLE PARCIALMENTE | Faltaba denominador y comando | Cada métrica con fuente, fórmula, denominador, umbral, interpretación y limitación | — | CUMPLE |
| VE-02 | §11 | Defectos reproducibles o con artefacto verificable | `04` | CUMPLE | — | — | — | CUMPLE |
| VE-03 | §11 | Capturas relacionadas con requisito, prueba y resultado | `evidencias/README.md` | CUMPLE | — | — | — | CUMPLE |

## 3. Defectos nuevos encontrados en esta etapa

| ID | Resumen | Severidad | Procedencia | Estado |
|---|---|---|---|---|
| D-16 | Un usuario con sesión que abre una ruta de administración ve el login | Baja | Original | Publicado en `5c7c8c5`; verificado en local |
| D-17 | Saldos largos recortados en las tarjetas de Carteras | Media | Introducido durante el trabajo | Publicado en `5c7c8c5`; verificado en local |
| D-18 | Configuración decía que IA, Google y correo estaban apagados aunque IA y Google funcionan en producción, y mostraba un campo de Telegram que el servidor ignora | Baja | Original | Publicado en `5c7c8c5`; verificado en local |
| D-19 | Porcentajes de los gráficos con punto decimal | Baja | Original | Publicado en `5c7c8c5`; verificado en local |
| D-20 | Mensajes del servidor en producción hablan de un «modo local» | Baja | Original | Corregido en `c9c33b4`; sin publicar |

Detalle completo (pasos, esperado, observado, impacto, evidencia, solución y regresión) en `04-registro-defectos.csv` y `04b-autopsia-defectos.csv`.

## 4. Resumen final

| Estado | Inicial | Final |
|---|---:|---:|
| CUMPLE | 49 | 67 |
| CUMPLE PARCIALMENTE | 21 | 7 |
| NO CUMPLE | 5 | 2 |
| NO EVALUADO | 1 | 0 |
| BLOQUEADO | 1 | 1 |
| **Total** | **77** | **77** |

**El proyecto no cumple el 100 % de los requisitos obligatorios.** Lo que falta se concentra en dos causas:

1. **Revisión técnica formal sin celebrar** (F4-02, F4-05, EN-04, y en parte F3-09, F4-04, F4-07, EN-03). No registramos una reunión que no ocurrió. Con el acta real, estos siete puntos pueden pasar a CUMPLE.
2. **Verificación con sesión en producción** (F7-06, CI-10) y **carga ×5 solo en local** (CI-08).

La decisión de liberación es **CONDITIONAL GO** (`12-informe-liberacion.md` §1): no hay defectos críticos ni fallos que afecten saldos, y las condiciones para pasar a GO están escritas y son verificables.
