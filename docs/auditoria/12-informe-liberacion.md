# 12 · Informe ejecutivo de liberación

**Fecha de corte:** 2026-10-25 18:00Z. **Versión en producción:** `5514da0` (https://asistente-financiero-seven.vercel.app, ver EV-PROD-01).

## 1. Decisión

**CONDITIONAL GO** ("aprobado con condiciones", Semana 2 Clase 2). El producto ya está publicado con el OK del usuario; la decisión dice si puede aceptarse como versión de calidad.

**Por qué no es NO-GO**
- Integridad de saldos: 0 descuadres y 0 saldos negativos con carga ×5, concurrencia e idempotencia (EV-REN-02; BE 10, 42, 59, 60).
- Exactitud: no se suman monedas sin tasa; aritmética en centavos con redondeo half-up igual en cliente y servidor (CP-08, CP-15, CP-21, CP-30).
- Seguridad: sondeo OWASP 20/20 y 0 vulnerabilidades críticas o altas (EV-SEG-01..03).
- Regresión: 129/129 pruebas automáticas (69 backend, 60 frontend).
- Accesibilidad automatizable: axe 60 escaneos con 0 violaciones; teclado y reflujo 21/21.
- 0 defectos críticos. Ningún defecto afectó saldos, tasas ni control de acceso.
- La versión probada es la que corre en producción (EV-PROD-01).

**Por qué no es GO**
1. **Falta evidencia en producción** de la tasa real con fecha ≤ 4 días (CP-13), del cron autorizado (D-08) y del LCP móvil (CP-40). Cobertura de requisitos: 21/25 = 84 % (umbral 100 %).
2. **DRE 67 %** (umbral ≥ 90 %): 5 defectos llegaron a producción (D-11 a D-15). El más grave, D-15 (Alta), impedía crear carteras y lo encontró el usuario.
3. **Tasa de cierre 53 %** (umbral ≥ 90 %): D-08, D-09 y D-11 a D-15 están corregidos y publicados pero falta verificarlos en producción.
4. **Revisión técnica formal no realizada** (06 §3) y **lector de pantalla no evaluado** (CP-37).

Los riesgos críticos no se promediaron: cada uno se evaluó por separado (§3).

### Condiciones para pasar a GO
1. Con una sesión en producción: el panel muestra el sello «Tasas de referencia BCE del …» con fecha ≤ 4 días (CP-13) y el cron responde 200 (D-08).
2. LCP móvil ≤ 4 s medido en la URL oficial (CP-40).
3. El usuario confirma que crear «Ecuabet» funciona (D-15) y se revisan en producción D-09 y D-11 a D-14. Con eso la tasa de cierre llega a 100 %.
4. RTF con roles, acta y seguimiento (06 §3) y revisión con lector de pantalla (CP-37).

**Vuelve a NO-GO** si en producción falla el login, la integridad de saldos o las tasas.

## 2. Línea base y versión evaluada

| | Línea base `f3504d3` | Versión `5514da0` |
|---|---|---|
| Moneda | Una por usuario, bloqueada tras la actividad | Una por cartera; selector de moneda de visualización en cada módulo (USD, EUR, MXN); conversión explícita y trazable |
| Tasas | No había | BCE vía Frankfurter, cron diario y refresco perezoso, última tasa válida con su antigüedad |
| Interfaz | Sidebar, verde | Barra superior con botones de accesibilidad, menú móvil accesible, paleta azul sobre negro, logo propio, Movimientos dentro de Carteras |
| Login | Google al final | «Continuar con Google» primero, con separador |
| Contraseña | Política anterior | Mínimo 10 caracteres, mayúscula, minúscula, número y carácter especial, sin nombre ni correo |
| Telegram | Opcional | Fuera de esta versión |
| Pruebas | 56 backend y 38 frontend | 69 backend y 60 frontend; 48 casos documentados |
| Dependencias | Críticas y altas | 0 críticas/altas; 2 moderadas aceptadas |

## 3. Criterios de liberación

| Criterio | Estado | Evidencia |
|---|---|---|
| Build e instalación | CUMPLE | EV-PRU-02; registros de build en Vercel |
| Login | CUMPLE en local; el usuario usa la app en producción con sesión iniciada (testimonial) | CP-01, CP-02 |
| Base de pruebas aislada | CUMPLE | 01 §3 |
| USD/EUR por cartera | CUMPLE | CP-07, CP-08 |
| Tasas verificables con fecha | CUMPLE con el proveedor simulado; **producción pendiente** | CP-11, CP-13 |
| Respaldo sin tasa o con proveedor caído | CUMPLE | CP-14, CP-15 |
| Historial preservado | CUMPLE | CP-19 |
| Conversión explícita | CUMPLE | CP-18 |
| Autorización y aislamiento | CUMPLE | CP-31..CP-34 |
| Pruebas críticas | CUMPLE (129/129) | EV-PRU-01/02 y ejecuciones posteriores (05 §2) |
| Sin defectos críticos abiertos | CUMPLE (0 críticos; D-15 Alta publicado, falta confirmarlo) | 04 |
| Escritorio y móvil | CUMPLE | CP-27, CP-42, CP-43, EV-CR04-01 |
| Migración sin pérdida de datos | CUMPLE (aditiva, aplicada en producción) | CP-45, EV-PROD-01 |
| Verificación en producción | **PARCIAL** | CP-46, EV-PROD-01 |
| DRE ≥ 90 % | **NO CUMPLE** (67 %) | 05 §1 |
| Cierre de no conformidades ≥ 90 % | **NO CUMPLE** (53 %) | 05 §1 |

## 4. Riesgos que quedan

- **Límite de 300 peticiones cada 15 minutos por IP:** puede afectar a usuarios que comparten IP pública (EV-REN-03). Vigilar respuestas 429.
- **uuid moderado vía exceljs (aceptado):** exceljs no usa la ruta afectada (EV-SEG-02).
- **Datos personales en el historial de git (D-13):** se quitaron del código, pero siguen en commits antiguos. Avisar a la persona afectada y decidir con ella si se reescribe el historial.
- **Solo Chromium probado:** Firefox y Safari no se evaluaron.
- **Dependencia de Frankfurter:** si falla, se usa la última tasa válida con su antigüedad.
- **Formularios sin prueba de interfaz real:** D-15 escapó porque ninguna prueba escribía en el formulario. Se añadió CP-48; conviene extender la técnica a metas, deudas y grupos.

## 5. Estado de entregables

| Entregable de la consigna | Archivo | Estado |
|---|---|---|
| 1. Expediente técnico inicial | 01, 02 | Completo |
| 2. Auditoría Garvin, McCall, ISO/IEC 9126 | 03, 03b | Completo (46 filas; 2 NO APLICA y 2 NO EVALUADO justificados) |
| 3. Registro, clasificación y métricas de defectos | 04, 05 | Completo (15 reales, 0 sembrados); horas-persona NO EVALUADO |
| 4. Revisión técnica formal | 06 | R1–R7 ejecutadas como revisiones individuales; **RTF PENDIENTE** |
| 5. Plan SQA | 07 | Completo |
| 6. Estrategia y plan de pruebas | 08 | Completo |
| 7. Casos y evidencias | 09, evidencias/ | 44 de 48 ejecutados y aprobados, 1 parcial, 3 pendientes |
| 8. Matriz maestra de trazabilidad | 10 | Completo (cobertura 84 %) |
| 9. Impacto del cambio | 11 | Completo (CR-01 a CR-05) |
| 10. Informe de decisión | 12 | Este documento |
| 11. Repositorio de evidencias | evidencias/ | Completo e indexado (README) |
| 12. Defensa técnica | 13 | Guion y respuestas preparados; la defensa la hace el equipo |

## 6. Vercel

- Proyecto `asistente-financiero` y dominio `asistente-financiero-seven.vercel.app`. No se crearon otros proyectos. Las direcciones sin «seven» están ocupadas por otras cuentas.
- Variables cambiadas con OK del usuario: `CRON_SECRET` creada (sensible) y `APP_ORIGIN` apuntando al dominio oficial.
- Cuatro despliegues a producción, cada uno con el OK del usuario (EV-PROD-01).
