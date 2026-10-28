# 07 · Plan de aseguramiento de la calidad (SQA)

Sigue la cadena de Semana 5 Clase 2: **meta → tarea → responsable → métrica → indicador → umbral → evidencia → estado**.

**Nota de honestidad sobre los umbrales.** La consigna pide fijarlos antes de evaluar. Los umbrales de integridad (0 descuadres, 0 saldos negativos, 0 sumas entre monedas) y de vigencia de tasas (4 días) se fijaron en el diseño, antes de las pruebas. Los de rendimiento, accesibilidad y defectos se escribieron en este plan el 2026-10-25. Para entonces ya se habían tomado algunas mediciones locales, pero todavía no las de producción, que son las que deciden la liberación. Tomamos valores de referencia públicos (Core Web Vitals, WCAG) y no los ajustamos a los resultados.

Responsable: el equipo completo (Jolaus Chévez, Steven González, Manuel Hurtado, Pablo Jara). No se asignaron roles individuales a las tareas.

| Meta | Tarea | Responsable | Métrica | Indicador | Umbral | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| Saldos siempre correctos | Pruebas de concurrencia, idempotencia y carga ×5 | Equipo | Descuadres; saldos negativos | Conteo | 0 y 0 | EV-REN-02; BE 10, 42, 59, 60 | VERDE · Cumple |
| No sumar monedas incompatibles | Pruebas de panel, reportes, admin, exportación e IA | Equipo | Sumas entre monedas | Conteo | 0 | BE 31, 32, 56, 57; finance.spec | VERDE · Cumple |
| Tasas reales, fechadas y vigentes | Proveedor Frankfurter (BCE), cron diario y refresco perezoso | Equipo | Antigüedad de la tasa | Días | ≤ 4 (vigente) | BE 54, 55, 57; CP-13 en producción | AMARILLO · Local OK; producción pendiente |
| Historial intacto | Valoración con la tasa de la fecha; conversiones trazables | Equipo | Cambios en meses anteriores al cambiar la tasa de hoy | Conteo | 0 | BE 58, 60 | VERDE · Cumple |
| Seguridad | Sondeo OWASP; npm audit | Equipo | Controles fallidos; vulnerabilidades críticas/altas | Conteo | 0 y 0 | EV-SEG-01..03 | VERDE · Cumple |
| Accesibilidad WCAG 2.2 AA | axe, teclado, reflujo y lector de pantalla | Equipo | Violaciones; controles de teclado aprobados | Conteo; % | 0; 100 % | EV-A11Y-01/02 | AMARILLO · Lector de pantalla no evaluado |
| Rendimiento | Carga ×5; Core Web Vitals | Equipo | p95 API; LCP; CLS | ms; ms; índice | ≤ 500 ms; escritorio ≤ 2500 ms y móvil ≤ 4000 ms en producción; ≤ 0,1 | EV-REN-01/02 | AMARILLO · Local OK; móvil en producción pendiente |
| Defectos bajo control | Registro, corrección y regresión | Equipo | Críticos abiertos; tasa de cierre; DRE | Conteo; % | 0; ≥ 90 %; ≥ 90 % | 04, 05 | ROJO para GO · 0 críticos, pero cierre 45 %, DRE 50 % (10 defectos encontrados con la versión ya publicada, D-15 de severidad Alta) y densidad 1,27/KLOC |
| Regresión | CI con build, pruebas y verificación de iconos | Equipo | Pruebas en verde | % | 100 % | EV-PRU-01..04; EV-REG-01; EV-D20-01/02; quality.yml | VERDE · Cumple |
| Cobertura | Matriz de trazabilidad | Equipo | Requisitos con todos sus casos aprobados | % | 100 % para GO | 10 | AMARILLO · 84 % (21/25) |
| Revisiones | R1–R8 y RTF-01 | Equipo | Revisiones ejecutadas / planificadas | % | 100 % | 06 | AMARILLO · R1–R8 8/8; RTF-01 0/1 (planificada, no celebrada) |
| Liberación segura | Migración aditiva, despliegue y verificación en producción | Equipo | Datos perdidos; verificación en la URL | Conteo; sí/no | 0; sí | CP-46; EV-PROD-01 | AMARILLO · 6 despliegues autorizados por el equipo, migración aplicada, paquete igual al probado; falta la verificación con sesión |

**Semáforo** (Semana 5 Clase 2, d.22):
- VERDE · cumple el umbral con evidencia;
- AMARILLO · cumple en local o le falta una parte, sin riesgo crítico;
- ROJO · bloquea la liberación.

**Auditorías:** la de seguridad y la de accesibilidad se hicieron con herramientas (ver 06, R5). No hubo auditoría externa.
