# Matriz de cumplimiento académico · «Software bajo juicio»

**Versión:** preliminar (etapa de inspección) · **Fecha de corte:** 2026-10-27 03:10Z
**Código auditado:** rama `claude/project-thread-noiuro` en `742fdc9`. El código de `FRONTEND`, `BACKEND` y `api` es idéntico al publicado en producción (`5514da0`): `git diff --stat 5514da0 742fdc9 -- FRONTEND BACKEND api` no devuelve cambios.

## 1. Cómo se evaluó

Contrastamos cada requisito de la consigna del primer parcial (§5 fases, §6 trazabilidad, §7 cambio inesperado, §8 entregables, §9 estructura del informe, §10 defensa y §11 validez de la evidencia) con el contenido real del expediente, el código y las evidencias. La existencia de un archivo con el nombre del entregable no se consideró suficiente: revisamos su contenido, sus cifras y si las cifras se pueden reproducir.

Verificaciones ejecutadas en esta etapa (2026-10-27, entorno local aislado, datos ficticios `*@local.test`, proveedor de tasas simulado):

| Verificación | Comando | Resultado |
|---|---|---|
| Pruebas de backend | `cd BACKEND && npm test` | 69 de 69 aprobadas, 0 fallidas, 0 omitidas |
| Pruebas de frontend | `npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox` | 60 de 60 aprobadas |
| Compilación | `npx ng build` | Correcta, sin errores |
| Iconos | `npm run check:icons` | 59 iconos literales, todos en el subconjunto |
| Barrido de rutas | Playwright: 12 rutas × 2 anchos (1366 y 390 px) con usuario no administrador | 0 errores de consola, 0 respuestas ≥ 400, 0 desbordes horizontales; 3 rutas de administración redirigen a la pantalla de inicio de sesión (ver D-16) |
| Tamaño del código | `git archive <commit> BACKEND/src FRONTEND/src api`, líneas no vacías sin `*.spec.ts` | `d185b19`: 16 658 · `5514da0`: 15 715 |
| Variables de producción | Listado de nombres en Vercel (sin valores) | Proveedor de IA configurado (`AI_PROVIDER=groq`), Telegram y SMTP desactivados, `CRON_SECRET` presente |

Estados usados: **CUMPLE**, **CUMPLE PARCIALMENTE**, **NO CUMPLE**, **NO EVALUADO**, **BLOQUEADO**. La columna «Estado final» se completa al cerrar la etapa de completado; en esta versión indica «PRELIMINAR».

## 2. Matriz

### Fase 1 · Expediente inicial del producto

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F1-01 | Fase 1 | Identificar propósito, alcance, usuarios y contexto de operación | `01-ficha-tecnica.md` §1–§3 | CUMPLE | — | Revisar redacción en voz del equipo | — | PRELIMINAR |
| F1-02 | Fase 1 | Documentar funcionalidades principales | `01-ficha-tecnica.md`; rutas en `FRONTEND/src/app/app.routes.ts` | CUMPLE PARCIALMENTE | La ficha no distingue de forma explícita qué módulos funcionan con servicios reales y cuáles dependen de configuración externa (IA con Groq solo en producción; Telegram y correo desactivados) | Añadir tabla «real / configurable / desactivado» por módulo | Variables de Vercel (solo nombres), código de `groqService.js` | PRELIMINAR |
| F1-03 | Fase 1 | Requisitos funcionales y atributos de calidad | `02-requisitos.csv` (25 requisitos con tipo, origen, prioridad, criterio y atributo) | CUMPLE | — | — | — | PRELIMINAR |
| F1-04 | Fase 1 | Restricciones, riesgos iniciales y artefactos disponibles | `01-ficha-tecnica.md` §4–§5 | CUMPLE | — | — | — | PRELIMINAR |
| F1-05 | Fase 1 | Ficha técnica comprensible por un tercero | `01-ficha-tecnica.md` | CUMPLE PARCIALMENTE | La ficha nombra la herramienta de asistencia usada y la rama técnica sin explicación; faltan los datos institucionales del equipo | Reescribir en voz del equipo; marcar datos institucionales como `[PENDIENTE: …]` si no se reciben | Datos del equipo | PRELIMINAR |

### Fase 2 · Auditoría con modelos de calidad

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F2-01 | Fase 2 | Aplicar las dimensiones de Garvin | `03-matriz-modelos-calidad.csv` (8 filas MQ-G) | CUMPLE | El material de clase presenta Garvin con 5 perspectivas; la consigna y el expediente usan 8 dimensiones. La diferencia está explicada en `00` | — | — | PRELIMINAR |
| F2-02 | Fase 2 | Aplicar los factores de McCall | `03` (11 filas MQ-M) | CUMPLE | MQ-M09 sigue PENDIENTE (verificación en producción) | Actualizar tras la verificación con sesión | CP-13, CP-40 | PRELIMINAR |
| F2-03 | Fase 2 | Aplicar ISO/IEC 9126 | `03` (27 filas MQ-I) | CUMPLE PARCIALMENTE | 2 NO EVALUADO (calidad percibida, aprendizaje) y 1 PENDIENTE; las subcaracterísticas de conformidad no tienen fila propia en todas las características | Revisar que cada característica tenga su subcaracterística de conformidad con estado y justificación | Matriz completa | PRELIMINAR |
| F2-04 | Fase 2 | Determinar pertinencia (qué aplica y qué no) | `03` columnas Aplicabilidad y Justificación; 2 NO APLICA justificados | CUMPLE | — | — | — | PRELIMINAR |
| F2-05 | Fase 2 | Relacionar cada elemento con requisito, criterio, métrica y evidencia | `03` columnas Requisito, Criterio, Métrica, Evidencia, Caso | CUMPLE | — | Verificar que cada ID citado exista en 02, 09 y evidencias | Comprobación cruzada automática | PRELIMINAR |
| F2-06 | Fase 2 | Comparar diagnósticos y justificar el modelo más adecuado | `03b-conclusion-modelos.md` | CUMPLE | — | — | — | PRELIMINAR |

### Fase 3 · Autopsia de defectos y métricas

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F3-01 | Fase 3 | Identificar errores, defectos y fallos reales o deliberados | `04-registro-defectos.csv` (D-01..D-15) | CUMPLE PARCIALMENTE | Falta D-16 (encontrado en esta etapa). El registro no tiene una columna que distinga defectos originales, introducidos durante el trabajo y sembrados | Añadir D-16 y la columna «Procedencia» (original / introducido durante el trabajo / sembrado) | Barrido de rutas 2026-10-27 | PRELIMINAR |
| F3-02 | Fase 3 | Artefacto de origen, propagación e impacto | `04b-autopsia-defectos.csv` | CUMPLE | — | Añadir D-16 | — | PRELIMINAR |
| F3-03 | Fase 3 | Clasificar y fijar severidad y prioridad | `04` columnas Tipo, Severidad, Prioridad | CUMPLE | — | — | — | PRELIMINAR |
| F3-04 | Fase 3 | Campos completos por defecto: ID, ubicación, pasos, esperado, observado, impacto, severidad, prioridad, evidencia, posible solución, solución aplicada, regresión | `04` | CUMPLE PARCIALMENTE | No hay columna separada de «posible solución» distinta de la aplicada | Añadir la columna | — | PRELIMINAR |
| F3-05 | Fase 3 | Número y distribución de defectos | `05-metricas.md` §1: 15; código 7, diseño 4, configuración 3, documentación 1; severidad 0/2/9/4 | CUMPLE | Cambia con D-16 | Recalcular | — | PRELIMINAR |
| F3-06 | Fase 3 | Densidad de defectos | `05` §1: 15 / 16,658 KLOC = 0,90 | CUMPLE PARCIALMENTE | Reproducimos 16 658 líneas, pero corresponden a `d185b19`; la versión publicada `5514da0` tiene 15 715 (15 / 15,715 = 0,95). El comando de conteo no está escrito en el expediente | Documentar comando, versión y ambos valores; recalcular con D-16 | Salida del comando | PRELIMINAR |
| F3-07 | Fase 3 | Tasa de detección | `05` §1 | CUMPLE | — | Recalcular con D-16 | — | PRELIMINAR |
| F3-08 | Fase 3 | Eficacia de eliminación (DRE) | `05` §1: 10 / (10 + 5) = 67 % | CUMPLE | Resultado negativo (umbral ≥ 90 %), se conserva | Recalcular con D-16, que cuenta como escapado porque ya estaba publicado | — | PRELIMINAR |
| F3-09 | Fase 3 | Esfuerzo de revisión | `05` §1: NO EVALUADO | NO CUMPLE | No hay horas-persona registradas. Sí existen horas de inicio y fin de R1–R7 en `06` | Calcular la duración registrada de cada ronda (horas reloj) y declarar que no equivale a horas-persona | Tabla de duraciones; horas-persona del equipo si existen | PRELIMINAR |
| F3-10 | Fase 3 | Reporte técnico de defectos | `05`, `04b`, Word §5 | CUMPLE | — | — | — | PRELIMINAR |

### Fase 4 · Revisión técnica formal

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F4-01 | Fase 4 | Seleccionar un artefacto relevante | `06-revision-tecnica/README.md` §3 (plantilla) | CUMPLE PARCIALMENTE | El artefacto está propuesto, pero la RTF no se celebró | Fijar el artefacto (validación de formularios y cálculo multidivisa, origen de D-15) | — | PRELIMINAR |
| F4-02 | Fase 4 | Asignar roles: moderador, autor, revisores, secretario | `06` §3 | NO CUMPLE | Roles sin personas asignadas | Asignar con `[PENDIENTE: nombre]` si no se reciben datos | Nombres del equipo | PRELIMINAR |
| F4-03 | Fase 4 | Criterios de entrada y lista de comprobación | `06` §2 (listas R1–R6) y §3 | CUMPLE PARCIALMENTE | Las listas existen para R1–R6; la RTF no tiene criterios de entrada y salida propios | Redactar criterios de entrada/salida y checklist de la RTF | — | PRELIMINAR |
| F4-04 | Fase 4 | Ejecutar la revisión, registrar y clasificar hallazgos | `06` §1 (R1–R7 ejecutadas como revisiones individuales con herramientas) | CUMPLE PARCIALMENTE | Hallazgos registrados para R1–R7; no para una RTF | Separar con claridad «planificado» y «ejecutado» | — | PRELIMINAR |
| F4-05 | Fase 4 | Realizar una reunión técnica formal | — | BLOQUEADO | No existe evidencia de que la reunión ocurriera | El acta queda como plantilla pendiente salvo que exista la reunión | Fecha, participantes y acta reales | PRELIMINAR |
| F4-06 | Fase 4 | Diferenciar defectos demostrables de observaciones subjetivas | `06` | CUMPLE PARCIALMENTE | La distinción no está como columna | Añadir columna «Defecto / observación» en el registro de hallazgos | — | PRELIMINAR |
| F4-07 | Fase 4 | Acciones correctivas, acta y seguimiento | `06`, `04` (seguimiento por defecto) | CUMPLE PARCIALMENTE | Seguimiento existe por defecto; el acta no | Igual que F4-05 | — | PRELIMINAR |

### Fase 5 · Plan SQA

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F5-01 | Fase 5 | Objetivos y metas de calidad | `07-plan-sqa.md` | CUMPLE | — | — | — | PRELIMINAR |
| F5-02 | Fase 5 | Responsables, actividades, estándares y procedimientos | `07` | CUMPLE PARCIALMENTE | Responsables como `[Integrante n]` | Sustituir por nombres o `[PENDIENTE: …]` | Nombres y roles | PRELIMINAR |
| F5-03 | Fase 5 | Revisiones, auditorías, no conformidades, métricas, indicadores y evidencias | `07` | CUMPLE | — | — | — | PRELIMINAR |
| F5-04 | Fase 5 | Umbrales fijados antes de evaluar | `07` (umbrales) y `05` | CUMPLE | — | — | — | PRELIMINAR |
| F5-05 | Fase 5 | Matriz Meta → Tarea → Responsable → Métrica → Indicador → Umbral → Evidencia → Estado | `07` | CUMPLE | Estados ROJO/AMARILLO deben actualizarse al corte final | Actualizar | — | PRELIMINAR |

### Fase 6 · Diseño de pruebas

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F6-01 | Fase 6 | Estrategia con unidad, integración, sistema y aceptación | `08-plan-pruebas.md` §2 | CUMPLE | — | — | — | PRELIMINAR |
| F6-02 | Fase 6 | Técnicas de caja negra y caja blanca | `08` §3; columna Técnica de `09` | CUMPLE | — | — | — | PRELIMINAR |
| F6-03 | Fase 6 | Partición de equivalencia, valores límite y tablas de decisión | `08` §3; CP-07 (equivalencia), casos de límites y tabla de decisión | CUMPLE | — | Verificar que la tabla de decisión aparezca desarrollada, no solo nombrada | — | PRELIMINAR |
| F6-04 | Fase 6 | Particularidades de aplicaciones web y orientadas a objetos | `08` | CUMPLE PARCIALMENTE | Aplicación web cubierta (navegador, responsive, accesibilidad, seguridad); la consideración orientada a objetos no está explícita | Añadir apartado breve (servicios y componentes como clases) | — | PRELIMINAR |
| F6-05 | Fase 6 | Casos con precondiciones, datos, esperado, criterio y evidencia | `09-casos-prueba.csv` (48 casos, 13 columnas) | CUMPLE | — | — | — | PRELIMINAR |
| F6-06 | Fase 6 | Cada caso relacionado con un requisito o riesgo | `09` columna Requisito; `10` | CUMPLE | — | Comprobación cruzada automática | — | PRELIMINAR |

### Fase 7 · Ejecución, evidencia y decisión

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| F7-01 | Fase 7 | Ejecutar una muestra representativa | `09`: 42 APROBADO, 1 aprobado manual, 1 aprobado con observación, 1 PARCIAL, 3 NO EJECUTADO; 129/129 pruebas automatizadas reejecutadas hoy | CUMPLE | — | Incorporar los registros de hoy como evidencia nueva | Logs de 2026-10-27 | PRELIMINAR |
| F7-02 | Fase 7 | Registrar resultados, defectos, incidencias y evidencias | `09`, `04`, `evidencias/README.md` | CUMPLE | — | — | — | PRELIMINAR |
| F7-03 | Fase 7 | Consolidar calidad, revisión, SQA y pruebas | `12-informe-liberacion.md` | CUMPLE | — | — | — | PRELIMINAR |
| F7-04 | Fase 7 | Emitir decisión GO / CONDITIONAL GO / NO-GO | `12`: CONDITIONAL GO | CUMPLE | — | Revisar si se sostiene con D-16 y el estado final | — | PRELIMINAR |
| F7-05 | Fase 7 | Justificación cualitativa y cuantitativa | `12` §2–§3 | CUMPLE | — | — | — | PRELIMINAR |
| F7-06 | Fase 7 | Verificación en producción de la versión liberada | EV-PROD-01 (despliegues, salud, hashes); CP-46 PARCIAL | CUMPLE PARCIALMENTE | Sin sesión en producción no se verificó tasa real (CP-13), cron (D-08), LCP móvil (CP-40), D-15, D-09 y D-11..D-14 | Verificar con sesión de prueba o dejar BLOQUEADO con causa | Captura y respuesta de API con sesión | PRELIMINAR |

### Trazabilidad (§6)

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| TR-01 | §6 | Cadena REQ → atributo/riesgo → criterio → métrica → caso → resultado → defecto → evidencia | `10-trazabilidad-maestra.csv` (49 filas, 8 columnas exactas) | CUMPLE | — | — | — | PRELIMINAR |
| TR-02 | §6 | Ningún caso sin requisito o riesgo | `09` / `10` | CUMPLE | — | Comprobación automática | — | PRELIMINAR |
| TR-03 | §6 | Ningún requisito declarado probado sin evidencia | `10`: RF-06 (CP-13), RNF-03 (CP-37), RNF-04 (CP-40) sin ejecutar y marcados como tales | CUMPLE | Cobertura 21/25 = 84 %; los no cubiertos están declarados | — | — | PRELIMINAR |
| TR-04 | §11 | Consistencia entre informe, matrices y evidencias | Word, Excel y archivos `docs/auditoria` | NO EVALUADO | No se ha hecho una comprobación cruzada automática de IDs y cifras | Script de verificación de IDs, rutas y cifras | Salida del script | PRELIMINAR |

### Cambio inesperado (§7)

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| CI-01 | §7 | Requisitos que cambian y estables | `11-impacto-cambio.md` §2 | CUMPLE | — | — | — | PRELIMINAR |
| CI-02 | §7 | Atributos de calidad afectados | `11` §3 | CUMPLE | — | — | — | PRELIMINAR |
| CI-03 | §7 | Nuevos riesgos | `11` §3 | CUMPLE | — | — | — | PRELIMINAR |
| CI-04 | §7 | Métricas a reconsiderar | `11` §5 | CUMPLE | — | — | — | PRELIMINAR |
| CI-05 | §7 | Casos inválidos o insuficientes | `11` §4 | CUMPLE | — | — | — | PRELIMINAR |
| CI-06 | §7 | Pruebas nuevas | `11` §4 | CUMPLE | — | — | — | PRELIMINAR |
| CI-07 | §7 | Efecto en la decisión | `11` §7 | CUMPLE | — | — | — | PRELIMINAR |
| CI-08 | §7 | Carga ×5 | EV-REN-02: p95 23,3 ms (×1) y 35,0 ms (×5), 0 % errores, saldos íntegros | CUMPLE PARCIALMENTE | Medido solo en local con PostgreSQL; producción (Vercel + Neon) no se midió para no cargar el servicio real | Declarar la limitación en `11` | — | PRELIMINAR |
| CI-09 | §7 | Impacto en saldos, histórico, precisión decimal, conversión, tasas, persistencia, seguridad, reportes y regresión | `11` §3–§6 | CUMPLE PARCIALMENTE | Están tratados, pero dispersos; no hay una tabla única por aspecto | Añadir tabla de impacto por aspecto con caso y evidencia | — | PRELIMINAR |
| CI-10 | §7 | Demostrar que no quedaron requisitos críticos sin probar | `13` | CUMPLE PARCIALMENTE | RF-06 (tasas reales) es crítico y no está ejecutado en producción | Depende de F7-06 | — | PRELIMINAR |

### Entregables (§8)

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| EN-01 | §8.1 | Expediente técnico inicial | `01`, `02` | CUMPLE | Ver F1-02, F1-05 | — | — | PRELIMINAR |
| EN-02 | §8.2 | Auditoría comparativa de modelos | `03`, `03b` | CUMPLE | — | — | — | PRELIMINAR |
| EN-03 | §8.3 | Registro, clasificación y métricas de defectos | `04`, `04b`, `05` | CUMPLE PARCIALMENTE | F3-01, F3-06, F3-09 | — | — | PRELIMINAR |
| EN-04 | §8.4 | Expediente completo de RTF | `06` | NO CUMPLE | Sin reunión ni acta | Ver Fase 4 | — | PRELIMINAR |
| EN-05 | §8.5 | Plan SQA | `07` | CUMPLE | — | — | — | PRELIMINAR |
| EN-06 | §8.6 | Estrategia y plan de pruebas | `08` | CUMPLE | — | — | — | PRELIMINAR |
| EN-07 | §8.7 | Casos y evidencias de ejecución | `09`, `evidencias/` | CUMPLE | — | — | — | PRELIMINAR |
| EN-08 | §8.8 | Matriz maestra de trazabilidad | `10` | CUMPLE | — | — | — | PRELIMINAR |
| EN-09 | §8.9 | Informe de impacto del cambio | `11` | CUMPLE | Ver CI-08, CI-09 | — | — | PRELIMINAR |
| EN-10 | §8.10 | Informe ejecutivo de decisión | `12` | CUMPLE | — | — | — | PRELIMINAR |
| EN-11 | §8.11 | Repositorio organizado de evidencias | `evidencias/` y su índice | CUMPLE PARCIALMENTE | Algunas filas del índice atribuyen evidencias a personas o herramientas en vez de al equipo; las capturas «antes» de producción no están | Normalizar el índice | Capturas originales si existen | PRELIMINAR |
| EN-12 | §8.12 | Defensa técnica | `13-defensa-tecnica.md` | CUMPLE PARCIALMENTE | No responde de forma explícita las seis preguntas de la consigna con enlaces; falta qué requisitos críticos quedan sin verificar | Reescribir por pregunta, con enlace a archivo y fila | — | PRELIMINAR |

### Informe final (§9) y validez de la evidencia (§11)

| ID | Fase / sección | Requisito exacto | Archivo, código, prueba o evidencia | Estado | Deficiencia | Acción | Evidencia necesaria | Estado final |
|---|---|---|---|---|---|---|---|---|
| IF-01 | §9 | Portada e identificación del equipo | Word, portada | NO CUMPLE | Integrantes como marcadores; la portada nombra la herramienta de asistencia | Rehacer portada con `[PENDIENTE: …]` | Datos institucionales | PRELIMINAR |
| IF-02 | §9 | Secciones 14 a 27 (resumen ejecutivo a anexos) | Word: 14 secciones de primer nivel en el orden de la consigna | CUMPLE | — | — | — | PRELIMINAR |
| IF-03 | §9 | Voz del equipo, sin instrucciones a terceros | Expediente | NO CUMPLE | 18 pasajes en 10 archivos mencionan la herramienta de asistencia, «el usuario» o «el OK del usuario», o dan instrucciones («el equipo debe…») | Reescribir en voz del equipo | `grep` sin coincidencias | PRELIMINAR |
| VE-01 | §11 | Métricas con datos de origen, fórmula, resultado e interpretación | `05` | CUMPLE PARCIALMENTE | Falta el denominador explícito y el comando en densidad (F3-06) | Completar | — | PRELIMINAR |
| VE-02 | §11 | Defectos reproducibles o con artefacto verificable | `04` columnas Pasos y Evidencia | CUMPLE | — | — | — | PRELIMINAR |
| VE-03 | §11 | Capturas relacionadas con requisito, prueba y resultado | `evidencias/README.md` | CUMPLE | — | — | — | PRELIMINAR |

## 3. Defecto nuevo encontrado en esta etapa

**D-16 · Ruta de administración muestra la pantalla de inicio de sesión a un usuario con sesión iniciada** (Usabilidad, severidad Baja, prioridad P3, procedencia: original, `0882f1e`).

- **Ubicación:** `FRONTEND/src/app/core/admin.guard.ts`, `auth.guard.ts` y la ruta comodín de `app.routes.ts`.
- **Pasos:** iniciar sesión como usuario no administrador; abrir `/estadisticas`, `/configuracion` o `/admin`.
- **Esperado:** se queda en su panel, o ve un aviso de que no tiene permiso.
- **Observado:** aparece el formulario de inicio de sesión sin explicación, aunque la sesión sigue activa (al volver a `/panel` entra sin pedir contraseña). El parámetro `motivo` que añade la guarda no se lee en ninguna parte.
- **Impacto:** confusión; no hay fuga de datos porque el backend exige rol de administrador.
- **Evidencia:** barrido del 2026-10-27 (12 rutas × 2 anchos).
- **Posible solución:** que la guarda redirija a `/panel` cuando hay sesión de usuario sin rol de administrador, y que `/login` con sesión activa redirija al panel.

## 4. Resumen preliminar

De 77 puntos verificables: 49 CUMPLE, 21 CUMPLE PARCIALMENTE, 5 NO CUMPLE, 1 NO EVALUADO y 1 BLOQUEADO. Los NO CUMPLE y el BLOQUEADO se concentran en la revisión técnica formal (sin reunión ni roles asignados), el esfuerzo de revisión, la portada y la voz del expediente. El proyecto no cumple el 100 % de los requisitos obligatorios en esta etapa.
