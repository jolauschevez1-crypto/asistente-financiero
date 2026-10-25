# 07 · Plan de aseguramiento de la calidad (SQA)

Sigue la cadena de Semana 5 Clase 2: **meta → tarea → responsable → métrica → indicador → umbral → evidencia → estado**.

**Nota de honestidad sobre los umbrales.** La consigna pide fijarlos antes de evaluar. Los umbrales de integridad (0 descuadres, 0 saldos negativos, 0 sumas entre monedas) y de vigencia de tasas (4 días) se fijaron en el diseño, antes de las pruebas. Los de rendimiento, accesibilidad y defectos se escribieron en este plan el 2026-10-25. Para entonces ya se habían tomado algunas mediciones locales, pero todavía no las de producción, que son las que deciden la liberación. Se tomaron valores de referencia públicos (Core Web Vitals, WCAG) y no se ajustaron a los resultados.

Responsables: [Integrante 1] es el líder de calidad, [Integrante 2] el desarrollador, [Integrante 3] el responsable de pruebas y [Integrante 4] el responsable de despliegue. Las tareas ya ejecutadas las hizo el asistente de IA y las aprobó el usuario.

| Meta | Tarea | Responsable | Métrica | Indicador | Umbral | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| Saldos siempre correctos | Pruebas de concurrencia, idempotencia y carga ×5 | [Integrante 3] | Descuadres; saldos negativos | Conteo | 0 y 0 | EV-REN-02; BE 10, 42, 59, 60 | VERDE · Cumple |
| No sumar monedas incompatibles | Pruebas de panel, reportes, admin, exportación e IA | [Integrante 3] | Sumas entre monedas | Conteo | 0 | BE 31, 32, 56, 57; finance.spec | VERDE · Cumple |
| Tasas reales, fechadas y vigentes | Proveedor Frankfurter (BCE), cron diario y refresco perezoso | [Integrante 4] | Antigüedad de la tasa | Días | ≤ 4 (vigente) | BE 54, 55, 57; CP-13 en producción | AMARILLO · Local OK; producción pendiente |
| Historial intacto | Valoración con la tasa de la fecha; conversiones trazables | [Integrante 2] | Cambios en meses anteriores al cambiar la tasa de hoy | Conteo | 0 | BE 58, 60 | VERDE · Cumple |
| Seguridad | Sondeo OWASP; npm audit | [Integrante 1] | Controles fallidos; vulnerabilidades críticas/altas | Conteo | 0 y 0 | EV-SEG-01..03 | VERDE · Cumple |
| Accesibilidad WCAG 2.2 AA | axe, teclado, reflujo y lector de pantalla | [Integrante 3] | Violaciones; controles de teclado aprobados | Conteo; % | 0; 100 % | EV-A11Y-01/02 | AMARILLO · Lector de pantalla no evaluado |
| Rendimiento | Carga ×5; Core Web Vitals | [Integrante 3] | p95 API; LCP; CLS | ms; ms; índice | ≤ 500 ms; escritorio ≤ 2500 ms y móvil ≤ 4000 ms en producción; ≤ 0,1 | EV-REN-01/02 | AMARILLO · Local OK; móvil en producción pendiente |
| Defectos bajo control | Registro, corrección y regresión | [Integrante 1] | Críticos abiertos; tasa de cierre; DRE | Conteo; % | 0; ≥ 90 %; ≥ 90 % | 04, 05 | ROJO para GO · 0 críticos, pero cierre 53 % y DRE 67 % (5 defectos escaparon a producción, D-15 de severidad Alta) |
| Regresión | CI con build, pruebas y verificación de iconos | [Integrante 2] | Pruebas en verde | % | 100 % | EV-PRU-01/02; quality.yml | VERDE · Cumple |
| Cobertura | Matriz de trazabilidad | [Integrante 1] | Requisitos con todos sus casos aprobados | % | 100 % para GO | 10 | AMARILLO · 84 % (21/25) |
| Revisiones | R1–R7 y RTF | [Integrante 1] | Revisiones ejecutadas / planificadas | % | 100 % | 06 | AMARILLO · R1–R7 7/7; RTF 0/1 |
| Liberación segura | Migración aditiva, despliegue y verificación en producción | [Integrante 4] | Datos perdidos; verificación en la URL | Conteo; sí/no | 0; sí | CP-46; EV-PROD-01 | AMARILLO · 4 despliegues con OK del usuario, migración aplicada, paquete igual al probado; falta la verificación con sesión |

**Semáforo** (Semana 5 Clase 2, d.22):
- VERDE · cumple el umbral con evidencia;
- AMARILLO · cumple en local o le falta una parte, sin riesgo crítico;
- ROJO · bloquea la liberación.

**Auditorías:** la de seguridad y la de accesibilidad se hicieron con herramientas (ver 06, R5). No hubo auditoría externa.
