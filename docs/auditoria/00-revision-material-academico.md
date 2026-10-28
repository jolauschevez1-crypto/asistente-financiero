# 00 · Revisión del material académico

**Asignatura:** Ingeniería de Software II · UTMACH · Docente: Ing. Jimmy Molina Ríos, Ph.D.
**Fecha de revisión:** 2026-10-25 · **Revisión:** equipo del proyecto Asistente Financiero.
**Fuente:** carpeta `Ingenieria Sotfware` (26 archivos, sin subcarpetas). No se modificó ningún original.

## 1. Método y limitaciones

- PPTX: texto, tablas y notas del docente extraídos con `python-pptx` de **todas** las diapositivas. Se comprobó que las presentaciones Semana 1–8 solo contienen una imagen de fondo a pantalla completa (misma imagen de 1,55 MB repetida); el contenido está en el texto. Algunas celdas numéricas se verificaron visualmente al renderizar (S3-C2 diapositivas 7 y 19).
- PDF: texto extraído con `pdftotext`. El PDF de 15 páginas sobre pruebas de validación es un escaneo de imágenes; se revisó visualmente cada página (equivale a la versión PPTX de 15 diapositivas).
- `no.pptx`: 14 de 19 diapositivas son imágenes sin texto; se revisaron visualmente todas a baja resolución.
- DOCX: párrafos y tablas extraídos con `python-docx`.
- Limitación: la revisión visual se hizo a 40–50 ppp; los textos pequeños de las imágenes se leyeron, pero no se transcribieron palabra por palabra.

## 2. Inventario

| ID | Archivo | Páginas / diapositivas | Leído | Tema principal |
|---|---|---:|---|---|
| MAT-01 | Semana1-Clase1.pptx | 23 | Completo (texto + notas) | Fundamentos de calidad, perspectivas, proceso vs. producto, requisitos→criterio→evidencia |
| MAT-02 | Semana1-Clase2.pptx | 24 | Completo | Modelos: Garvin, McCall, ISO/IEC 9126, comparación y selección |
| MAT-03 | Semana2-Clase1.pptx | 24 | Completo | Evaluación del producto: requisito–atributo–criterio–evidencia |
| MAT-04 | Semana2-Clase2.pptx | 18 | Completo | Evaluación cualitativa y cuantitativa, escalas, perfil, dictamen |
| MAT-05 | Semana3-Clase1.pptx | 22 | Completo | Error/defecto/fallo, origen, propagación, clasificación, severidad vs. prioridad |
| MAT-06 | Semana3-Clase2.pptx | 26 | Completo + verificación visual | Métricas de revisión: distribución, densidad, eficacia, esfuerzo, rendimiento, velocidad |
| MAT-07 | Semana4-Clase1.pptx | 25 | Completo | Técnicas de revisión: informal, pares, walkthrough, inspección, RTF |
| MAT-08 | Semana4-Clase2.pptx | 27 | Completo | Ejecución de una RTF: roles, criterios de entrada/salida, checklist, registro, seguimiento |
| MAT-09 | Semana5-Clase1.pptx | 27 | Completo | SQA/ACS: elementos, plan, estándares, auditorías, roles |
| MAT-10 | Semana5-Clase2.pptx | 27 | Completo | Evaluación del ACS: tareas, metas, métricas, indicadores, semáforo |
| MAT-11 | Semana6-Clase1.pptx | 30 | Completo | Estrategia de pruebas: principios, V&V, niveles, criterios de entrada/salida |
| MAT-12 | Semana6-Clase2.pptx | 30 | Completo | Diseño de casos: equivalencia, valores límite, tablas de decisión, trazabilidad |
| MAT-13 | Semana7-Clase1.pptx | 30 | Completo | Caja blanca/negra, pruebas convencionales y OO, estados, colaboraciones |
| MAT-14 | Semana7-Clase2.pptx | 30 | Completo | Pruebas de aplicaciones web: funcional, interfaz, navegación, compatibilidad, rendimiento |
| MAT-15 | Semana8-Clase1 (1).pptx | 30 | Completo | Pruebas de validación, criterios de aceptación, matriz de trazabilidad, cobertura |
| MAT-16 | Semana8-Clase2.pptx | 30 | Completo | Pruebas de sistema: recuperación, estrés, rendimiento, seguridad, dependencias |
| MAT-17 | Pruebas_de_validación_y_pruebas_de_sistema_(2).pptx | 15 | Completo (texto + visual) | Exposición del Grupo 8 |
| MAT-18 | Pruebas_de_validación_y_pruebas_de_sistema_(2) (1).pdf | 15 | Completo (visual; escaneado) | Misma exposición, versión PDF |
| MAT-19 | no.pptx | 19 | Completo (visual) | Versión revisada de la exposición del Grupo 8 |
| MAT-20 | CAA-3.pdf | 10 | Completo | Análisis forense de defectos (Supercines); equipo y docente |
| MAT-21 | Taller_ampliado_matriz_trazabilidad_calidad_GRUPO8.pdf | 2 | Completo | Matriz de trazabilidad y defensa de 3 minutos |
| MAT-22 | Matriz Requisito - Atributo - CAA2.docx | — | Completo | Matriz requisito–atributo (McDonald's, ISO/IEC 25010) |
| MAT-23 | jimm1.docx | — | Completo | Respuestas del taller de perspectivas (S1-C1) |
| MAT-24 | jimm2.docx | — | Completo | Decisión con propósito–riesgo–criterio–evidencia |
| MAT-25 | SEMCI 2026 – Propuesta de resumen – [Chevez].docx | — | Completo | Resumen de investigación (videojuegos); no aplica a esta auditoría |
| MAT-26 | SEMCI 2026 – Propuesta de resumen – [Chevez]. .docx | — | Completo | Variante del anterior; no aplica |

Total: 16 presentaciones del docente (443 diapositivas), 3 materiales de exposición del grupo, 3 entregables previos (CAA-2, CAA-3, taller) y 4 documentos de apoyo.

## 3. Conceptos, fórmulas y criterios enseñados

### 3.1 Calidad y evaluación (MAT-01 a MAT-04)
- Cadena **Necesidad → requisito → criterio → evidencia → decisión** (S1-C1 d.9; S2-C1 d.9).
- Perspectivas: usuario, cliente, desarrollo y operación (S1-C1 d.7). Calidad interna, externa y en uso (S1-C1 d.15).
- Característica ≠ atributo ≠ métrica (S2-C1 d.16). Un criterio verificable define proporción, umbral y contexto (S2-C1 d.17).
- La evidencia debe ser pertinente, suficiente, reproducible y trazable (S2-C1 d.19). Errores frecuentes: definir criterios después del resultado y ocultar fallos críticos en una conclusión global (S2-C1 d.21).
- Escala cualitativa de 4 niveles: Excelente, Adecuado, Parcial, Insuficiente (S2-C2 d.6). Decisión: APROBADO / APROBADO CON CONDICIONES / NO APROBADO (S2-C2 d.13), que se corresponde con GO / CONDITIONAL GO / NO-GO.
- No se promedian riesgos críticos (S2-C2 d.12). Estructura del dictamen: alcance, criterios, evidencias, resultados, riesgos y conclusión (S2-C2 d.15).

### 3.2 Modelos de calidad (MAT-02)
- **Garvin** se enseña como **cinco perspectivas**: trascendente, producto, usuario, producción y valor (S1-C2 d.4, d.15). *Diferencia con la consigna del proyecto:* la consigna pide las ocho dimensiones de Garvin (rendimiento, características, fiabilidad, conformidad, durabilidad, servicio, estética y calidad percibida). En la matriz se usan ambas y se indica la fuente de cada una.
- **McCall**: operación (corrección, confiabilidad, eficiencia, integridad, usabilidad), revisión (mantenibilidad, flexibilidad, testabilidad) y transición (portabilidad, reusabilidad, interoperabilidad) (S1-C2 d.5, d.16).
- **ISO/IEC 9126**: funcionalidad, fiabilidad, usabilidad, eficiencia, mantenibilidad y portabilidad. Se presenta como antecedente histórico (S1-C2 d.6, d.17). Las diapositivas no enumeran subcaracterísticas, así que se toman de la norma ISO/IEC 9126-1:2001 y se documentan como referencia externa. Equivalencias McCall→9126 y su advertencia: "continuidad conceptual ≠ equivalencia perfecta" (S1-C2 d.18).
- Trabajos previos del grupo usan ISO/IEC 25010 (MAT-22, MAT-23). Aquí sirve solo como referencia complementaria.

### 3.3 Defectos y métricas de revisión (MAT-05, MAT-06)
- Error → defecto → fallo; origen (requisito, diseño, código); naturaleza (funcional, interfaz, datos, rendimiento, seguridad, mantenibilidad); severidad ≠ prioridad (S3-C1 d.5–11).
- Matriz de análisis de defectos: Artefacto | Defecto | Origen | Propagación | Impacto | Evidencia (S3-C1 d.16).
- Fórmulas (S3-C2):
  - % de distribución = defectos de la categoría / defectos totales × 100 (d.8)
  - Densidad = defectos / tamaño del artefacto, con unidad declarada (d.9)
  - Eficacia de detección = detectados / (detectados + escapados) × 100 (d.11)
  - Esfuerzo = Σ horas-persona (d.13)
  - Rendimiento = defectos detectados / horas-persona (d.14)
  - Velocidad = tamaño revisado / tiempo (d.15)
- Un reporte de métricas incluye contexto, datos de entrada, fórmula y unidad, resultado, interpretación con limitaciones y decisión (S3-C2 d.21).

### 3.4 Revisiones (MAT-07, MAT-08)
- Continuo de formalidad: informal, pares, walkthrough, inspección y RTF (S4-C1 d.6, d.16).
- Roles: autor, moderador, revisores y registrador (S4-C2 d.6). Criterios de entrada (d.7) y de salida (d.18). Lista de comprobación (d.8). Formato del hallazgo: ID | Ubicación | Criterio | Descripción | Evidencia/impacto | Estado (d.10).
- Clasificación del resultado: defecto, observación, duplicado o descartado (d.15). Ciclo de seguimiento: defecto → acción → corrección → verificación → cierre (d.19).
- Errores que invalidan una revisión, como registrar opiniones como defectos o contar duplicados (d.25).

### 3.5 SQA (MAT-09, MAT-10)
- Elementos: plan, estándares, revisiones y pruebas, auditorías, métricas y seguimiento (S5-C1 d.9). Matriz actividad–responsable–evidencia–criterio (d.22).
- Cadena **Tarea → Meta → Métrica → Indicador → Evidencia → Juicio** (S5-C2 d.8).
- Indicadores (S5-C2):
  - Tasa de cierre de NC = cerradas / registradas × 100 (d.13)
  - Retrabajo = horas de retrabajo / horas totales × 100 (d.14)
  - Cumplimiento de revisiones = ejecutadas / planificadas × 100 (d.15)
  - Reincidencia = defectos repetidos / defectos totales × 100 (d.16)
  - Tiempo de resolución (d.17)
- Semáforo verde, amarillo y rojo (d.22).

### 3.6 Pruebas (MAT-11 a MAT-19)
- Siete principios, V&V y los niveles unidad, integración, sistema y aceptación, con criterios de entrada y salida (S6-C1).
- Anatomía de un caso: ID, requisito, precondiciones, datos, pasos, esperado, criterio de aceptación y resultado real. Técnicas: equivalencia, valores límite (debajo, en el límite y encima) y tablas de decisión. Matriz requisito–condición–caso (S6-C2).
- Caja blanca (cobertura de sentencias, decisiones y condiciones) frente a caja negra; pruebas de estado y de colaboración. Matriz componente–riesgo–técnica (S7-C1).
- Web: dimensiones funcional, interfaz, navegación, compatibilidad y rendimiento; validación en cliente y servidor; sesiones; responsive. Matriz característica–riesgo–prueba (S7-C2).
- Validación: criterios de aceptación claros, medibles, relevantes y binarios; configuración de prueba; conforme / no conforme / bloqueado. Cobertura = requisitos probados / requisitos aplicables (S8-C1 d.8, d.12, d.18).
- Sistema: recuperación, carga frente a estrés, rendimiento (percentiles, throughput, errores), seguridad (autorización por rol) y dependencias externas (degradación controlada). Matriz riesgo–técnica–caso–condición–esperado–obtenido–evidencia (S8-C2 d.25).

## 4. Relación material → concepto → fase → entregable → aplicación

| Material | Concepto | Fase del proyecto | Entregable | Aplicación al Asistente Financiero | Evidencia esperada |
|---|---|---|---|---|---|
| MAT-01, MAT-03 | Cadena requisito–criterio–evidencia | Requisitos | 02-requisitos.csv, 10-trazabilidad-maestra.csv | REQ de multidivisa con criterios medibles (p. ej., tasa con fecha ≤ 1 día hábil) | Casos ejecutados y logs |
| MAT-02 | Garvin, McCall, ISO 9126 | Auditoría comparativa | 03-matriz-modelos-calidad.csv | Mismo producto evaluado con los tres modelos; NO APLICA justificado | Matriz sin celdas vacías |
| MAT-04 | Escalas, perfil, dictamen | Decisión | 12-informe-liberacion.md | GO / CONDITIONAL GO / NO-GO sin promediar riesgos críticos | Perfil de calidad |
| MAT-05, MAT-20 | Origen, propagación, severidad | Defectos | 04-registro-defectos.csv | Ejemplo: la moneda por usuario impide carteras en distintas monedas (origen: diseño del modelo de datos) | Reproducción + caso |
| MAT-06 | Densidad, eficacia, rendimiento | Métricas | 05-metricas.md | Defectos/KLOC, eficacia por revisión, horas-persona reales | Datos fuente |
| MAT-07, MAT-08 | RTF, roles, checklist | Revisión formal | 06-revision-tecnica/ | R1–R6; acta pendiente si no hay reunión real | Actas y registros |
| MAT-09, MAT-10 | SQA, indicadores | Plan SQA | 07-plan-sqa.md | Meta→tarea→responsable→métrica→indicador→umbral→evidencia→estado | Matriz SQA |
| MAT-11, MAT-12 | Niveles, técnicas | Estrategia de pruebas | 08-plan-pruebas.md, 09-casos-prueba.csv | Límites de importes (0, 0,01, máximo), particiones USD/EUR/sin tasa, tabla de decisión de conversión | Resultados por caso |
| MAT-13 | Caja blanca, estados | Pruebas unitarias | 09-casos-prueba.csv | Estados de la cartera (sin actividad, con actividad, convertida) | Tests automatizados |
| MAT-14 | Pruebas web | Pruebas de sistema/UI | evidencias/despues, accesibilidad | Navbar móvil, nombres largos, compatibilidad | Playwright + capturas con contexto |
| MAT-15 | Validación, cobertura | Aceptación | 10-trazabilidad-maestra.csv | Requisito → caso → evidencia; cobertura = probados/aplicables | Matriz |
| MAT-16 | Recuperación, estrés, dependencias | Sistema / cambio x5 | 11-impacto-cambio.md | Proveedor de tasas caído → última tasa válida con antigüedad; carga x5 en local/Preview | Logs de prueba |
| MAT-21, MAT-22 | Matriz y defensa de 3 min | Defensa | 13-defensa-tecnica.md | Formato de defensa del grupo | Guía |

## 5. Material que no aplica

MAT-25 y MAT-26 (SEMCI, videojuegos) no tratan temas de esta auditoría. Se registran en el inventario para que quede constancia de que se revisaron.
