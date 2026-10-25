# 05 · Métricas

Las fórmulas son las de Semana 3 Clase 2 y Semana 5 Clase 2 (ver `00-revision-material-academico.md` §3.3 y §3.5). Los datos fuente son `04-registro-defectos.csv`, `09-casos-prueba.csv`, `10-trazabilidad-maestra.csv` y los registros de `evidencias/`. Fecha de corte: 2026-10-25 14:55Z, commit `6f8d6f2`.

## 1. Defectos

| Métrica | Propósito | Datos fuente | Fórmula | Valores | Resultado | Umbral (07-plan-sqa) | Interpretación | Limitaciones |
|---|---|---|---|---|---|---|---|---|
| Número de defectos | Tamaño del problema | 04-registro-defectos.csv | Conteo | D-01 a D-15 | **15** | — | Defectos reales; no se sembró ninguno. D-11 a D-14 salieron de la ronda R7 (pulido visual, tras publicar); D-15 lo encontró la persona usuaria en producción | Revisión sin RTF formal (ver 06) |
| Distribución por origen | Dónde nacen los defectos | Columna "Causa / origen" | defectos del origen / total × 100 | Código 7 (D-02, D-03, D-05, D-06, D-13, D-14, D-15); diseño 4 (D-04, D-07, D-11, D-12); configuración 3 (D-01, D-08, D-09); documentación 1 (D-10) | **47 % / 27 % / 20 % / 7 %** | — | Casi la mitad son de código; los de diseño adaptable aparecieron al revisar pantalla por pantalla | Clasificación del revisor |
| Distribución por severidad | Riesgo | Columna "Severidad" | ídem | Crítica 0; Alta 2; Media 9; Baja 4 | **0 % / 13 % / 60 % / 27 %** | Críticos abiertos = 0 | Ningún defecto afecta saldos ni conversiones; D-15 impedía crear carteras desde la interfaz | — |
| Densidad de defectos | Comparar con otros productos | 15 defectos; 16.658 líneas no vacías de `BACKEND/src`, `FRONTEND/src` y `api`, sin pruebas (tamaño de la versión publicada en `d185b19`) | defectos / KLOC | 15 / 16,658 | **0,90 defectos/KLOC** | ≤ 1,0 | Baja para el tamaño | Cuenta líneas no vacías, no LOC lógicas. Incluye defectos de configuración que no están en el código |
| Detección por técnica | Qué técnica rinde | Columna "Fase y técnica" | Conteo | axe 2, teclado 1, npm audit 1, prueba unitaria 1, red en navegador 1, medición de rendimiento 1, revisión de configuración 2, revisión de documentación 1, revisión visual pantalla por pantalla 3, script de desborde por elemento 1, reporte de la persona usuaria en producción 1 | — | — | Las técnicas automatizadas encontraron 8 de 15; las revisiones humanas asistidas, 6; la persona usuaria, 1 | — |
| Eficacia de eliminación antes de liberar (DRE) | Cuánto se filtra a producción | Detectados antes de liberar `d185b19`: 10. Encontrados después, presentes en la versión publicada: 5 (D-11 a D-15) | detectados / (detectados + escapados) × 100 | 10 / (10 + 5) | **67 %** | ≥ 90 % | **No cumple el umbral.** Los 5 escapados son de interfaz y ninguno toca saldos. D-15 escapó porque ninguna prueba escribía un nombre en el formulario real (las pruebas llamaban a la API o fijaban el valor sin validar); la inspección visual CP-43 dio un falso aprobado y K-15 no detecta elementos recortados con overflow-x:hidden | Se añadió desborde.cjs (evidencias/pulido) a la rutina y una prueba que escribe nombres reales en el formulario (D-15) |
| Tasa de cierre de no conformidades | Seguimiento | Columna "Estado" | cerradas / registradas × 100 | 8 cerradas; 2 corregidas pendientes de verificar en producción (D-08, D-09); 4 publicadas pendientes de verificar (D-11 a D-14); 1 corregida en rama pendiente de publicar (D-15) | **53 %** | ≥ 90 % al liberar; Alta/Crítica 100 % | Alta/Crítica: 50 % (D-01 cerrado, D-15 abierto). **No cumple** hasta publicar D-15 y verificar D-08 a D-15 en producción | — |
| Reincidencia | Calidad de las correcciones | Defectos reabiertos | repetidos / total × 100 | 0 | **0 %** | ≤ 5 % | — | Ventana de observación corta |

## 2. Pruebas

| Métrica | Fórmula | Valores | Resultado | Umbral | Comentario |
|---|---|---|---|---|---|
| Casos diseñados | Conteo en 09-casos-prueba.csv | — | **47** | — | Un caso puede agrupar varias pruebas automáticas |
| Casos ejecutados | Casos con resultado | 47 − 4 no ejecutados | **43** | — | No ejecutados: CP-13, CP-40 y CP-46 (producción, a la espera del OK de despliegue) y CP-37 (lector de pantalla) |
| Casos aprobados / fallidos / bloqueados | Conteo por estado | — | **43 / 0 / 0** | Fallidos críticos = 0 | — |
| Ejecuciones repetidas | Reejecuciones registradas | K-12 falló y luego pasó (D-06); axe se ejecutó 3 veces (antes y después de D-04 y D-05); carga 1u y 5u | — | — | Se informan como ejecuciones, no como casos nuevos |
| Aprobación de pruebas automáticas | aprobadas / ejecutadas × 100 | Backend 69/69; frontend 60/60 (tras CR-04 y D-15) | **100 %** (129/129) | 100 % | Línea base: 56 en backend y 38 en frontend (EV-BASE-05/06). La prueba 55 cubre el formato de moneda con el código delante |
| Cobertura de requisitos | requisitos con todos sus casos ejecutados y aprobados / requisitos aplicables × 100 | 21 / 25 | **84 %** | 100 % antes de declarar GO | Faltan RF-06 (tasa real en producción), RNF-03 (lector de pantalla), RNF-04 (LCP móvil en producción) y RNF-08 (despliegue). Los 25 requisitos tienen al menos un caso aprobado |

**Por qué 47 casos.** Hay al menos un caso por requisito (25). A eso se suman los casos que exige el riesgo:

- **Exactitud y moneda:** USD, EUR y COP sin tasa; tasa vigente, antigua y ausente; misma moneda y moneda distinta.
- **Límites:** contraseña de 9, 10 y 11 caracteres; importes de 0,01 y el máximo.
- **Concurrencia:** dos gastos simultáneos y una ráfaga de 5 transferencias.
- **Seguridad:** 20 controles OWASP.
- **Accesibilidad:** 60 escaneos y 15 controles de teclado.
- **Regresión de cada defecto corregido.**

## 3. Rendimiento y carga

| Métrica | Fórmula | Resultado | Umbral | Evidencia |
|---|---|---|---|---|
| p95 de la API (×1) | percentil 95 de todas las peticiones | 23,3 ms (135 peticiones) | ≤ 500 ms | EV-REN-02-carga-1u.json |
| p95 de la API (×5) | ídem, con 5 usuarios simultáneos | 35,0 ms (675 peticiones, 240 req/s) | ≤ 500 ms | EV-REN-02-carga-5u.json |
| Errores bajo carga | fallos / peticiones × 100 | 0 % | ≤ 1 % | ídem |
| Descuadres de saldo | saldos del servidor ≠ esperados | 0 de 5 usuarios | 0 | ídem |
| LCP escritorio | Largest Contentful Paint | login 288 ms; panel 316 ms | ≤ 2500 ms | EV-REN-01-vitales.json |
| CLS | Cumulative Layout Shift | ≤ 0,089 | ≤ 0,1 | ídem |
| LCP móvil limitado (local, sin compresión) | ídem con 150 ms de RTT, 1,6 Mbps y CPU ×4 | login 4568 ms | ≤ 4000 ms en producción | ídem. Es pesimista porque el servidor local no comprime; se mide de nuevo en producción (CP-40) |
| Bytes de la recarga del panel | Suma de transferSize | 1562 KB → 630 KB tras D-07 | ≤ 1024 KB sin comprimir | ídem |

## 4. Esfuerzo y retrabajo

| Métrica | Fórmula | Resultado | Limitación |
|---|---|---|---|
| Esfuerzo de revisión (horas-persona) | Σ horas-persona | **NO EVALUADO** | No se registraron horas-persona humanas. El trabajo lo hizo un asistente de IA con supervisión. Como referencia, el tiempo de reloj de las sesiones fue de unas 1,7 h (05:02–06:46Z) más unas 1,2 h (14:44Z–cierre). Ese tiempo no equivale a horas-persona |
| Rendimiento de la revisión | defectos / horas-persona | **NO EVALUADO** | Depende de la anterior |
| Velocidad de revisión | tamaño revisado / tiempo | **NO EVALUADO** | ídem |
| Retrabajo (aproximación) | commits correctivos / commits de producto desde la línea base | 4 / 14 = **29 %** (`bb52abb`, `0baef03`, `19b56de`, `cf81359`) | Aproximación por commits, no por horas, que es lo que define la fórmula del material. Se informa como dato orientativo |
