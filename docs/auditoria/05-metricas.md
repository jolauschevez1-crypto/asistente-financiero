# 05 · Métricas

Las fórmulas son las de Semana 3 Clase 2 y Semana 5 Clase 2 (`00-revision-material-academico.md` §3.3 y §3.5). Los datos fuente son `04-registro-defectos.csv`, `09-casos-prueba.csv`, `10-trazabilidad-maestra.csv`, la historia de git y los registros de `evidencias/`.

**Fecha de corte:** 2026-10-27 03:45Z. **Versión en producción al corte:** `5c7c8c5` (despliegue `dpl_BoCAWYRVjLJ9vHCyVbqGBw3MH81n`). El 2026-10-28 se publicó D-20 en `7c09956` (despliegue `dpl_goBVsNb2nDbm8dZdALLhp8V9zSao`); las cifras no cambian porque D-20 sigue sin verificar del todo en producción.

Cada métrica indica su fuente, fórmula con denominador, resultado, umbral fijado de antemano en `07-plan-sqa.md`, interpretación y limitaciones. Los resultados negativos se conservan.

## 1. Defectos

| Métrica | Propósito | Datos fuente | Fórmula y denominador | Valores | Resultado | Umbral | Interpretación | Limitaciones |
|---|---|---|---|---|---|---|---|---|
| Número de defectos | Tamaño del problema | `04-registro-defectos.csv` | Conteo de filas | D-01 a D-20 | **20** | — | Todos son reales y reproducibles. No sembramos defectos: los reales bastaban para el análisis | No se puede asegurar que no queden defectos sin descubrir |
| Distribución por procedencia | Separar lo heredado de lo que introdujo el trabajo | Columna «Procedencia», comprobada con `git show f3504d3:<archivo>` | defectos de la procedencia / 20 × 100 | Originales 13 (D-01, D-02, D-04, D-06, D-07, D-09, D-11, D-13, D-14, D-16, D-18, D-19, D-20); introducidos durante el trabajo 7 (D-03, D-05, D-08, D-10, D-12, D-15, D-17); sembrados 0 | **65 % / 35 % / 0 %** | — | Uno de cada tres defectos los introdujeron los propios cambios. Entre ellos está el de mayor severidad (D-15) | La procedencia se decide por la presencia del código defectuoso en la línea base `f3504d3` |
| Distribución por origen | Dónde nacen los defectos | Columna «Causa / origen» | defectos del origen / 20 × 100 | Código 10 (D-02, D-03, D-05, D-06, D-13, D-14, D-15, D-16, D-19, D-20); diseño 5 (D-04, D-07, D-11, D-12, D-17); configuración 3 (D-01, D-08, D-09); documentación 2 (D-10, D-18) | **50 % / 25 % / 15 % / 10 %** | — | La mitad nace en el código; el diseño adaptable es la segunda fuente | Clasificación del equipo revisor |
| Distribución por severidad | Riesgo | Columna «Severidad» | defectos de la severidad / 20 × 100 | Crítica 0; Alta 2 (D-01, D-15); Media 10; Baja 8 | **0 % / 10 % / 50 % / 40 %** | Críticos abiertos = 0 | Ningún defecto altera saldos, conversiones ni datos guardados. D-15 impedía crear carteras desde la interfaz | — |
| Densidad de defectos | Comparar tamaños | 20 defectos; 15 715 líneas no vacías de `BACKEND/src`, `FRONTEND/src` y `api` en `5514da0`, sin `*.spec.ts` | defectos / KLOC | 20 / 15,715 | **1,27 defectos/KLOC** | ≤ 1,0 | **No cumple el umbral.** Con el corte anterior (15 defectos sobre 16 658 líneas de `d185b19`) daba 0,90; los defectos de R8 y D-20 la suben | Cuenta líneas no vacías, no LOC lógicas. Incluye 3 defectos de configuración que no están en el código. Comando en §5 |
| Detección por técnica | Qué técnica rinde | Columna «Fase y técnica de detección» | Conteo | axe 2; teclado 1; npm audit 1; prueba unitaria 1; red en navegador 1; medición de rendimiento 1; revisión de configuración 2; revisión de documentación 1; revisión visual con capturas 5; script de desborde 1; barrido de rutas 1; inspección de código contra configuración 2; reporte de uso en producción 1 | — | — | Las herramientas automáticas encontraron 9 de 20; las revisiones visuales y de inspección, 10; el uso real en producción, 1 | — |
| Eficacia de eliminación (DRE) | Cuánto llega a producción | Detectados antes de publicar la versión que los contenía: 10 (D-01 a D-10). Encontrados con la versión ya publicada: 10 (D-11 a D-20) | detectados antes / (detectados antes + escapados) × 100 | 10 / (10 + 10) | **50 %** | ≥ 90 % | **No cumple el umbral.** Los 10 escapados son de interfaz o texto; ninguno afecta saldos. D-15 escapó porque ninguna prueba escribía un nombre en el formulario real; D-16 a D-20 estaban en producción desde antes de la auditoría y no se vieron hasta el barrido de rutas la revisión visual de R8 y la inspección de mensajes | Un defecto original encontrado tarde cuenta como escapado aunque no lo haya causado el trabajo |
| Tasa de cierre de no conformidades | Seguimiento | Columna «Estado» | cerrados / registrados × 100 | 8 cerrados (D-01 a D-07 y D-10); 2 corregidos sin verificar en producción (D-08, D-09); 9 publicados y verificados en local, sin verificar con sesión en producción (D-11 a D-19); 1 publicado con su texto del perfil verificado en producción y sus mensajes del servidor verificados solo en local (D-20) | **40 %** | ≥ 90 % al liberar; Alta/Crítica 100 % | Alta/Crítica: 1 de 2 (D-01 cerrado; D-15 publicado sin confirmar con sesión). **No cumple** | Cerrar exige verificar en producción, que necesita una sesión de prueba que no tuvimos |
| Reincidencia | Calidad de las correcciones | Defectos reabiertos | reabiertos / 20 × 100 | 0 | **0 %** | ≤ 5 % | Ninguna corrección rompió otra prueba | Ventana de observación corta |

## 2. Pruebas

| Métrica | Fórmula | Valores | Resultado | Umbral | Comentario |
|---|---|---|---|---|---|
| Casos diseñados | Conteo en `09-casos-prueba.csv` | — | **53** | — | Un caso puede agrupar varias pruebas automáticas |
| Casos ejecutados | casos con resultado | 53 − 3 no ejecutados − 1 parcial | **49** (+1 parcial) | — | No ejecutados: CP-13 y CP-40 (necesitan sesión en producción) y CP-37 (lector de pantalla). Parcial: CP-46 (6 despliegues verificados sin sesión) |
| Aprobados / fallidos / bloqueados | conteo por estado | — | **49 / 0 / 0** | Fallidos críticos = 0 | CP-39 se aprueba en escritorio con una observación en móvil |
| Ejecuciones repetidas | reejecuciones registradas | K-12 falló y luego pasó (D-06); axe 4 ejecuciones; teclado 3; carga 1u y 5u; pruebas automáticas completas 3 veces el 2026-10-27 (antes y después de D-16 a D-19, y después de D-20) | — | — | Se informan como ejecuciones, no como casos nuevos |
| Aprobación de pruebas automáticas | aprobadas / ejecutadas × 100 | Backend 69/69; frontend 64/64 | **100 %** (133/133) | 100 % | Línea base: 56 y 38 (EV-BASE-05/06). Antes de D-16 a D-19: 69 y 60 (EV-PRU-03/04). Después: EV-REG-01. Después de D-20: EV-D20-01/02 (la prueba de core se amplió, no se añadió) |
| Cobertura de requisitos | requisitos con todos sus casos ejecutados y aprobados / 25 × 100 | 21 / 25 | **84 %** | 100 % antes de GO | Faltan RF-06 (tasa real en producción, CP-13), RNF-03 (lector de pantalla, CP-37), RNF-04 (LCP móvil en producción, CP-40) y RNF-08 (CP-46 parcial). Los 25 tienen al menos un caso aprobado |

**Por qué 53 casos.** Hay al menos un caso por requisito (25). A eso se suman los casos que exige el riesgo:

- **Exactitud y moneda:** USD, EUR y COP sin tasa; tasa vigente, antigua y ausente; misma moneda y moneda distinta.
- **Límites:** contraseña de 9, 10 y 11 caracteres; importes de 0,01 y el máximo; importes de 11 y 14 caracteres en tarjetas (CP-50).
- **Concurrencia:** dos gastos simultáneos y una ráfaga de 5 transferencias.
- **Seguridad:** 20 controles OWASP; tabla de decisión sesión × rol × ruta (CP-49).
- **Accesibilidad:** 60 escaneos y 21 controles de teclado.
- **Regresión de cada defecto corregido** (CP-47 a CP-53).

## 3. Rendimiento y carga

| Métrica | Fórmula | Resultado | Umbral | Evidencia |
|---|---|---|---|---|
| p95 de la API (×1) | percentil 95 de todas las peticiones | 23,3 ms (135 peticiones) | ≤ 500 ms | EV-REN-02-carga-1u.json |
| p95 de la API (×5) | ídem, con 5 usuarios simultáneos | 35,0 ms (675 peticiones, 240 req/s) | ≤ 500 ms | EV-REN-02-carga-5u.json |
| Errores bajo carga | fallos / peticiones × 100 | 0 % | ≤ 1 % | ídem |
| Descuadres de saldo | saldos del servidor ≠ esperados | 0 de 5 usuarios | 0 | ídem |
| LCP escritorio | Largest Contentful Paint | login 288 ms; panel 316 ms | ≤ 2500 ms | EV-REN-01-vitales.json |
| CLS | Cumulative Layout Shift | ≤ 0,089 | ≤ 0,1 | ídem |
| LCP móvil limitado (local, sin compresión) | ídem con 150 ms de RTT, 1,6 Mbps y CPU ×4 | login 4568 ms | ≤ 4000 ms en producción | ídem. Es pesimista porque el servidor local no comprime; falta medirlo en producción (CP-40) |
| Bytes de la recarga del panel | suma de transferSize | 1562 KB → 630 KB tras D-07 | ≤ 1024 KB sin comprimir | ídem |

La carga ×5 se midió solo en local (PostgreSQL 16). No la repetimos en producción para no cargar la base de datos real ni el límite de peticiones del servicio.

## 4. Esfuerzo de revisión y retrabajo

| Métrica | Fórmula | Datos | Resultado | Limitación |
|---|---|---|---|---|
| Duración registrada de las revisiones | Σ (fin − inicio) de cada ronda | R1 40 min; R2 25; R3 25; R4 15; R5 15; R6 10; R7 37; R8 28 (horas en `06-revision-tecnica/README.md`) | **195 min = 3,25 h** | Son horas de reloj de rondas individuales (una persona revisora por ronda), tomadas de commits y marcas de tiempo de las evidencias. No incluyen preparación ni la RTF-01 |
| Esfuerzo de revisión (horas-persona) | Σ (horas de cada ronda × personas revisoras) | 1 persona por ronda | **3,25 horas-persona (R1–R8)**; RTF-01 **PENDIENTE** | Se recalcula con el acta de la RTF-01: Σ minutos de preparación + duración × asistentes |
| Rendimiento de la revisión | defectos hallados en revisión / horas-persona | 18 defectos en R1–R8 (todos menos D-15) / 3,25 h | **5,5 defectos/hora** | D-20 se encontró al revisar el expediente, fuera de las rondas, y no entra en el cálculo. Mezcla rondas con herramientas automáticas; no es comparable con una inspección manual pura |
| Velocidad de revisión | tamaño revisado / tiempo | — | **NO EVALUADO** | No se registró el tamaño revisado por ronda. La RTF-01 lo medirá: 329 líneas en 30 minutos previstos |
| Retrabajo (aproximación) | commits que corrigen un defecto registrado / commits de producto desde `f3504d3` | 10 (`015fed5`, `0baef03`, `19b56de`, `cf81359`, `dd5c808`, `2445d2c`, `d4badd7`, `05e0b01`, `c2d4c82`, `c9c33b4`) / 24 (sin el commit de documentación `c21ea69`) | **42 %** | La fórmula del material usa horas; aquí se aproxima con commits. D-03 se corrigió dentro de `067caac` y no suma |

## 5. Cómo reproducir los tamaños

```bash
D=$(mktemp -d); git archive 5514da0 BACKEND/src FRONTEND/src api | tar -x -C "$D"
find "$D" -type f ! -name '*.spec.ts' -exec cat {} + | grep -cv '^\s*$'   # 15715
```

Con `d185b19` el mismo comando da 16 658.
