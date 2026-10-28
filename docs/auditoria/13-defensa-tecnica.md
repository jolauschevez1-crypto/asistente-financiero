# 13 · Defensa técnica

Sigue el formato de defensa de 3 minutos del taller (MAT-21). La sección 2 responde, una por una, las preguntas de la consigna; cada respuesta enlaza al archivo y a la fila donde está la prueba.

**Equipo:** Jolaus Chévez, Steven González, Manuel Hurtado, Pablo Jara. **Fecha de corte:** 2026-10-27 03:45Z.

## 1. Guion de 3 minutos

1. **Qué juzgamos (20 s).** Asistente Financiero, desde la línea base `f3504d3` hasta la versión publicada `7c09956` ([01](01-ficha-tecnica.md), [EV-PROD-01](evidencias/produccion/EV-PROD-01-despliegues.md)).
2. **El cambio inesperado (30 s).** Multidivisa con carga ×5: de «una moneda por usuario, bloqueada» a «una moneda por cartera, panel consolidado con tasa fechada y conversión explícita», con cinco usuarios simultáneos ([11 §1 y §4](11-impacto-cambio.md)).
3. **Cómo lo medimos (40 s).** Tres modelos de calidad con 46 criterios ([03](03-matriz-modelos-calidad.csv)); 53 casos, 49 aprobados, 1 parcial y 3 no ejecutados ([09](09-casos-prueba.csv)); 133 pruebas automáticas en verde; carga ×5 en local con 0 descuadres; OWASP 20/20; axe con 0 violaciones.
4. **Qué encontramos (40 s).** 20 defectos reales, 0 críticos, 2 de severidad Alta ([04](04-registro-defectos.csv)). 10 se encontraron con la versión ya publicada, por eso la DRE es 50 %. D-15 impedía crear carteras.
5. **Decisión (30 s).** CONDITIONAL GO: lo que mueve dinero está probado y publicado; falta verificar con sesión en producción y no alcanzamos los umbrales de proceso ([12](12-informe-liberacion.md)).
6. **Pendientes (20 s).** Verificación con sesión, RTF-01, lector de pantalla, Firefox y Safari.

## 2. Preguntas de la consigna

### 2.1 ¿Qué requisito justifica cada caso de prueba?

Cada caso de [09-casos-prueba.csv](09-casos-prueba.csv) tiene en su segunda columna el requisito que lo origina, y [10-trazabilidad-maestra.csv](10-trazabilidad-maestra.csv) recorre el camino inverso: requisito → criterio → métrica → caso → resultado → defecto → evidencia. Los 25 requisitos de [02](02-requisitos.csv) tienen al menos un caso. Ejemplos:

| Caso | Requisito | Por qué existe |
|---|---|---|
| CP-18 | RF-09 conversión explícita | Riesgo de doble cargo o tasa cambiada entre la vista y la confirmación |
| CP-41 | RNF-01 integridad | Ráfaga de 5 transferencias simultáneas (carga ×5) |
| CP-48 | RF-04 carteras | Regresión de D-15: escribir un nombre con letras en el formulario real |
| CP-49 | RF-15 administración | Tabla de decisión sesión × rol × ruta (D-16) |
| CP-53 | RF-17 conformidad | Mensajes del servidor sin «modo local» (D-20) |

Hay 53 casos y no 25 porque a cada requisito se suman los casos que exige su riesgo: monedas, límites, concurrencia, seguridad, accesibilidad y la regresión de cada defecto ([05 §2](05-metricas.md)).

### 2.2 ¿Qué evidencia demuestra que se evaluó cada atributo?

La matriz [03-matriz-modelos-calidad.csv](03-matriz-modelos-calidad.csv) tiene una fila por atributo de Garvin, McCall e ISO/IEC 9126 con método, métrica, umbral, resultado, evidencia, caso y defecto. Ejemplos:

| Atributo | Evidencia |
|---|---|
| Rendimiento (MQ-G01) | [EV-REN-02](evidencias/rendimiento/): p95 35 ms con 5 usuarios |
| Seguridad | [EV-SEG-01..03](evidencias/seguridad/): OWASP 20/20, npm audit |
| Accesibilidad | [EV-REG-02](evidencias/regresion/) axe 60 escaneos y [EV-REG-03](evidencias/regresion/) teclado 21/21 |
| Exactitud | CP-08, CP-15, CP-21, CP-30 en [09](09-casos-prueba.csv) |

Cuatro filas no se evaluaron y lo decimos: Reutilización y Coexistencia son NO APLICA (producto final aislado en su propio proyecto de Vercel); Calidad percibida y Facilidad de aprendizaje son NO EVALUADO, porque aplican pero no hubo usuarios reales ([03b](03b-conclusion-modelos.md)).

### 2.3 ¿Cuál es el defecto más crítico, dónde se originó y qué impacto tiene?

No hubo defectos de severidad Crítica. El más grave por impacto es **D-15** (Alta):

- **Qué:** el formulario de carteras rechazaba cualquier nombre con letras («Ecuabet»), así que no se podía crear una cartera desde la interfaz.
- **Dónde se originó:** en el código de `finance.ts`, commit `067caac`. El patrón se pasaba a Angular como texto; Angular lo compilaba sin la bandera `u` y `\p{L}` dejaba de reconocer letras. Se propagó a metas, deudas y grupos.
- **Por qué escapó:** ninguna prueba escribía en el formulario real; las pruebas llamaban al servicio directamente.
- **Impacto:** bloqueo funcional de la operación principal. Ningún saldo ni dato se alteró.
- **Corrección y regresión:** `2445d2c`; CP-48 y [EV-D15-01](evidencias/cr04/EV-D15-01-crear-cartera-ecuabet.png). Publicado; falta confirmarlo con sesión en producción.

El otro de severidad Alta es D-01 (dependencias vulnerables heredadas de la línea base, origen en la configuración), cerrado. Autopsia completa de los 20 en [04b](04b-autopsia-defectos.csv).

### 2.4 ¿Cómo se calcularon las métricas?

Cada métrica de [05-metricas.md](05-metricas.md) indica datos fuente, fórmula con denominador, resultado, umbral fijado en [07](07-plan-sqa.md) y limitación.

| Métrica | Cálculo | Resultado | Umbral |
|---|---|---|---|
| Densidad | 20 defectos / 15,715 KLOC (líneas no vacías de `5514da0`, comando en 05 §5) | 1,27 | ≤ 1,0 · no cumple |
| DRE | 10 detectados antes de publicar / (10 + 10 encontrados ya publicados) | 50 % | ≥ 90 % · no cumple |
| Cierre | 9 cerrados / 20 | 45 % | ≥ 90 % · no cumple |
| Cobertura | 21 requisitos con todos sus casos aprobados / 25 | 84 % | 100 % · no cumple |
| Esfuerzo de revisión | Σ duración de R1–R8 × 1 persona = 195 min | 3,25 horas-persona | — |
| Pruebas automáticas | 133 aprobadas / 133 | 100 % | 100 % · cumple |

Los resultados negativos se conservan. Esta métrica sostiene la conclusión porque separa lo que funciona (0 críticos, 100 % de pruebas, 0 descuadres) de lo que falta (cierre y cobertura dependen de la verificación con sesión).

### 2.5 ¿Qué efecto tiene el cambio inesperado?

[11-impacto-cambio.md](11-impacto-cambio.md) §4 lo detalla por aspecto: saldos, historial, precisión, conversión, tasas, persistencia, seguridad, reportes, rendimiento y regresión. En resumen:

- 11 requisitos nuevos y 8 cambiados (11 §2).
- Las pruebas de la línea base que exigían el bloqueo de moneda quedaron invalidadas y se reescribieron para comprobar lo contrario (11 §5).
- Migración aditiva e idempotente, aplicada en producción sin pérdida de datos (CP-45, CP-46).
- Carga ×5: p95 de 23,3 ms a 35,0 ms, 0 errores y 0 descuadres, **solo en local**.
- Es la fuente del defecto más grave (D-15) y del de mayor impacto funcional antes de integrar (D-03).

### 2.6 ¿Qué requisitos críticos siguen sin verificar?

| Requisito | Qué falta | Caso |
|---|---|---|
| RF-06 tasas reales y fechadas | Ver en producción el sello de tasa BCE con fecha ≤ 4 días y el cron con respuesta 200 | CP-13; D-08 |
| RNF-04 rendimiento | LCP móvil ≤ 4 s en la URL oficial | CP-40 |
| RNF-03 accesibilidad | Prueba con lector de pantalla | CP-37 |
| RNF-08 liberación | Verificación con sesión (la verificación sin sesión está hecha) | CP-46 parcial |

Además, D-08 está corregido sin verificar en producción, D-11 a D-19 están publicados pero sin verificar con sesión, y D-20 está publicado pero sus mensajes del servidor solo se verificaron en local. Ver [10](10-trazabilidad-maestra.csv) y [05 §2](05-metricas.md).

### 2.7 ¿Por qué corresponde GO, CONDITIONAL GO o NO-GO?

**CONDITIONAL GO** ([12 §1](12-informe-liberacion.md)):

- **No es NO-GO** porque no hay defectos críticos, la integridad de saldos y la exactitud están probadas con 0 descuadres, las pruebas pasan 133/133 y lo publicado es exactamente lo probado.
- **No es GO** porque faltan los cuatro requisitos de 2.6 y no se alcanzan DRE, cierre ni densidad. Los riesgos críticos se evaluaron uno por uno, sin promediar.
- **Pasa a GO** cuando se cumplen las cuatro condiciones de 12 §1. **Vuelve a NO-GO** si en producción falla el inicio de sesión, la integridad de saldos o las tasas.

### 2.8 ¿Qué ocurriría si una evidencia fuera inválida?

Depende de qué sostiene. Ejemplos:

- **EV-PROD-01 inválida:** CP-46 volvería a NO EJECUTADO, RNF-08 quedaría sin evidencia y la decisión pasaría a NO-GO, porque no se podría afirmar que lo probado es lo que corre en producción.
- **EV-REN-02 inválida:** RNF-01 y la carga ×5 quedarían sin evidencia; la integridad de saldos bajo concurrencia se apoyaría solo en las pruebas BE 10, 42, 59 y 60, que usan PGlite. La decisión bajaría a NO-GO hasta repetir la carga.
- **Una captura de regresión inválida (por ejemplo EV-D17-02):** el defecto volvería a ABIERTO y bajaría la tasa de cierre; la decisión no cambia porque es severidad Media.

Para reducir ese riesgo, cada evidencia tiene fecha, versión, entorno y comando o script en [evidencias/README.md](evidencias/README.md), y las de pruebas son registros completos que se pueden reproducir.

### 2.9 ¿Qué elemento, si estuviera mal definido, haría más débil la conclusión?

El umbral de vigencia de la tasa (4 días). Si fuera demasiado largo, el panel podría consolidar con una tasa vieja y la exactitud del total consolidado dejaría de estar garantizada. Lo fijamos en el diseño, antes de las pruebas, para cubrir un fin de semana más un festivo, días en que el BCE no publica tasas ([`fx.js`](../../BACKEND/src/finance/fx.js) línea 9; [07](07-plan-sqa.md)). La segunda debilidad es que la carga ×5 se midió solo en local.

## 3. Otras preguntas probables

| Pregunta | Respuesta corta | Dónde |
|---|---|---|
| ¿Hubo defectos sembrados? | No. Los 20 reales bastaban para el análisis | [01 §6](01-ficha-tecnica.md) |
| ¿Las tasas son reales? | En producción sí: BCE vía Frankfurter, una vez al día, sin llamarlas «tiempo real». En local usamos un proveedor simulado con tasas ficticias, como está declarado | [01 §2](01-ficha-tecnica.md) |
| ¿Qué pasa si Frankfurter cae? | Se usa la última tasa válida con su antigüedad; sin tasa, el total se muestra como parcial | CP-14, CP-15 |
| ¿Cuántas revisiones y por qué? | 8 rondas individuales (R1–R8); la RTF-01 con reunión y acta está planificada y no celebrada | [06](06-revision-tecnica/README.md) |
| ¿Cómo sabemos que una corrección no rompió nada? | Cada defecto tiene su regresión. D-06 y D-20 tienen pruebas que fallan con el código anterior y pasan con el corregido | [04](04-registro-defectos.csv), columna «Regresión» |
