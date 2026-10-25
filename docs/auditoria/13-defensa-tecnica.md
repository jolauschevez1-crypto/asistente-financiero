# 13 · Guía de defensa técnica

Sigue el formato de defensa de 3 minutos del taller (MAT-21). Cada respuesta indica dónde está la prueba.

## Guion de 3 minutos

1. **Qué juzgamos (20 s).** Asistente Financiero, desde la línea base `f3504d3` (la que estaba en producción) hasta la rama con multidivisa. Ver 01.
2. **El cambio inesperado (30 s).** Pasamos de "una moneda por usuario, bloqueada" a "una moneda por cartera, con panel consolidado y conversión explícita" (CR-01). Requisitos nuevos y cambiados, pruebas invalidadas y nuevas: ver 11.
3. **Cómo lo medimos (40 s).**
   - Tres modelos de calidad (03): Garvin con 8 dimensiones, McCall con 11 factores e ISO/IEC 9126 con 27 subcaracterísticas.
   - 47 casos (09).
   - 128 pruebas automáticas en verde.
   - Carga ×5 con 0 descuadres.
   - OWASP 20/20 y axe con 0 violaciones.
4. **Qué encontramos (40 s).**
   - 14 defectos reales, 0 críticos (04). Cuatro (D-11 a D-14, de interfaz) se escaparon a producción y salieron al revisar la versión publicada: por eso la DRE es 71 %, bajo el umbral de 90 %.
   - El más grave (Alta) fue D-01: dependencias vulnerables, con origen en la configuración.
   - El de mayor impacto funcional fue D-03: la cotización se perdía y el usuario no podía terminar un traspaso entre monedas. Lo detectó una prueba unitaria nueva antes de integrar.
5. **Decisión (30 s).** CONDITIONAL GO para publicar. Las condiciones son verificar en producción la tasa real, la migración y el LCP móvil. Los riesgos críticos no se promedian. Ver 12.
6. **Pendientes (20 s).** RTF con el equipo, lector de pantalla, Firefox y Safari.

## Dónde encontrar cada cosa

| Pregunta probable | Respuesta corta | Dónde |
|---|---|---|
| ¿De dónde sale cada requisito? | Del catálogo, con su origen y el CR que lo cambió | 02, 11 |
| ¿Cómo se prueba RF-09 (conversión)? | CP-18 → BE 60 | 09; evidencias/pruebas/EV-PRU-01 |
| ¿Qué evidencia hay de que no se suman monedas? | CP-08, CP-15, CP-21 y la prueba de componente del total parcial | 09, 10 |
| ¿Por qué NO APLICA en Reutilización y Coexistencia? | Es un producto final que no se reutiliza fuera del sistema, y corre aislado en su propio proyecto de Vercel | 03 (MQ-M10, MQ-I25) |
| ¿Por qué NO EVALUADO y no NO APLICA en Calidad percibida y Aprendizaje? | Sí aplican, pero no hubo usuarios reales. Marcarlas NO APLICA ocultaría la falta de prueba | 03 (MQ-G08, MQ-I11) |
| ¿Cuál es el defecto crítico? | No hubo críticos. El más severo fue D-01 (Alta, configuración): las dependencias se arrastraban desde la línea base, se propagaban a producción y exponían a fallos conocidos (A03) | 04 |
| Fórmula de densidad | defectos / KLOC = 14 / 16,658 = 0,84 | 05 §1 |
| Fórmula de DRE | detectados / (detectados + escapados) × 100 = 10 / 14 = 71 % (no cumple ≥ 90 %) | 05 §1 |
| Cobertura de requisitos | 21/25 = 84 %; los 4 restantes dependen de producción o de un lector de pantalla | 05 §2, 10 |
| ¿Cuántas revisiones y por qué? | 6, una por fuente de defectos. Fueron individuales con herramientas; la RTF queda pendiente porque no hubo reunión | 06 |
| ¿Cómo sabemos que la corrección no rompió nada? | Cada defecto tiene una regresión: D-06 tiene una prueba que falla con el código anterior, D-02 un registro de red sin peticiones canceladas | 04 (columna "Regresión") |
| ¿Por qué 47 casos? | 25 requisitos más los casos de riesgo: monedas, límites, concurrencia, seguridad, accesibilidad y regresión | 05 §2 |
| ¿Las tasas son reales? | En producción, sí: BCE vía Frankfurter, una vez al día, sin llamarlas "tiempo real". En local se usó un proveedor simulado con tasas ficticias, como está declarado | 01 §3, evidencias/README |
| ¿Qué pasa si Frankfurter cae? | Se usa la última tasa válida con su antigüedad. Sin tasa, se muestran los saldos separados y el total como parcial | CP-14, CP-15 |
| ¿Hubo defectos sembrados? | No. Los 14 reales eran suficientes | 01 §5 |
