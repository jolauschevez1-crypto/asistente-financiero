# 12 · Informe de liberación

**Estado del informe:** BORRADOR PREVIO A PRODUCCIÓN (2026-10-25, commit `6f8d6f2` + documentación). Se completa después del despliegue con los resultados de CP-13, CP-40 y CP-46.

## 1. Decisión

**Decisión para publicar: CONDITIONAL GO.** Equivale a "aprobado con condiciones" (Semana 2 Clase 2).

- **Sustento:**
  - Todos los criterios de integridad, exactitud y seguridad se cumplen con evidencia local.
  - No hay defectos críticos ni altos abiertos.
  - Las 124 pruebas automáticas pasan.
- **Por qué todavía no es GO:**
  - Faltan evidencias de producción: la tasa real de Frankfurter, la migración aplicada y el LCP móvil.
  - Falta la RTF con el equipo.
  - Falta la prueba con lector de pantalla.
  - Al revisar la versión publicada aparecieron 4 defectos de interfaz (D-11 a D-14). Están corregidos en la rama y falta publicarlos. Por ellos la DRE baja a 71 %, por debajo del umbral de 90 % (05 §1). Ninguno afecta saldos, tasas ni seguridad de acceso.

Los riesgos críticos no se promediaron. Cada uno se evaluó por separado (§3).

### Condiciones para pasar a GO

1. El usuario da el OK y se despliega la rama en el proyecto actual de Vercel (CP-46).
2. En producción se cumple lo siguiente:
   - el login funciona;
   - `/api/finanzas/tasas` devuelve la fuente `frankfurter-bce` con fecha de cotización ≤ 4 días (CP-13);
   - el panel muestra el total con su sello de tasa;
   - el cron autorizado responde 200 (D-08);
   - el LCP móvil es ≤ 4 s (CP-40).
3. D-08 y D-09 pasan a CERRADO, con lo que la tasa de cierre llega al 100 %.
4. La decisión vuelve a NO-GO si en producción falla cualquiera de estos puntos: login, integridad de saldos o tasas.

**Condiciones académicas, que no bloquean la publicación pero sí el GO pleno del expediente:**
- RTF con roles y acta (06 §3).
- Revisión con lector de pantalla (CP-37).

## 2. Línea base y cambios

| | Línea base `f3504d3` | Esta versión |
|---|---|---|
| Moneda | Una por usuario, bloqueada tras la actividad | Una por cartera; panel consolidado en USD/EUR/MXN; conversión explícita y trazable |
| Tasas | No había | BCE vía Frankfurter, cron diario y refresco perezoso, última tasa válida con su antigüedad |
| Interfaz | Sidebar | Barra superior, menú móvil accesible, login rediseñado, modal "Crear nueva cartera", estilo Wise/Steep |
| Contraseña | Política anterior | Mínimo 10 caracteres, mayúscula, minúscula, número y carácter especial, sin nombre ni correo |
| Telegram | Opcional | Desactivado en esta versión |
| Pruebas | 56 backend y 38 frontend | 69 backend y 54 frontend; 47 casos documentados |
| Dependencias | Críticas y altas | 0 críticas/altas; 2 moderadas aceptadas |

## 3. Criterios de liberación

| Criterio | Estado | Evidencia |
|---|---|---|
| Build e instalación (`npm ci`, `ng build`) | CUMPLE | EV-PRU-02; CI quality.yml |
| Login | CUMPLE en local; Google verificado por el usuario en producción (versión anterior) | CP-01, CP-02 |
| Base de pruebas aislada | CUMPLE | 01 §3 |
| USD/EUR | CUMPLE | CP-07, CP-08 |
| Tasas verificables con fecha | CUMPLE con el proveedor simulado; **producción pendiente** | CP-11, CP-13 |
| Respaldo seguro sin tasa o con proveedor caído | CUMPLE | CP-14, CP-15 |
| Historial preservado | CUMPLE | CP-19 |
| Conversión explícita | CUMPLE | CP-18 |
| Autorización y aislamiento | CUMPLE | CP-31..CP-34 |
| Pruebas críticas | CUMPLE (124/124) | EV-PRU-01/02 |
| Sin defectos críticos | CUMPLE (0 críticos; el único alto está cerrado) | 04 |
| Escritorio y móvil | CUMPLE | CP-27, CP-42, CP-43 |
| Regresión | CUMPLE | 05 §2 |
| Verificación en producción | **PENDIENTE** | CP-46 |

## 4. Riesgos que quedan

- **Límite global de 300 peticiones cada 15 minutos por IP:**
  - Puede afectar a usuarios detrás de la misma IP pública (EV-REN-03).
  - Recomendación: vigilar las respuestas 429 en los registros de Vercel. Si aparecen, ampliar el límite o usar como clave el usuario autenticado.
- **uuid moderado vía exceljs (riesgo aceptado):** exceljs no usa la ruta afectada (EV-SEG-02).
- **Datos personales en el historial de git (D-13):** la plantilla de Perfil tenía escritos el correo y un identificador de Telegram de una persona real. Se quitaron del código, pero siguen en commits anteriores y en las versiones ya desplegadas. Recomendación: avisar a esa persona y decidir con ella si se reescribe el historial (requiere `push --force`, que este trabajo no usa).
- **Solo Chromium probado:** Firefox y Safari no se evaluaron.
- **Tasas de producción:** dependen de la disponibilidad de Frankfurter. Si falla, se usa la última tasa válida con su antigüedad.

## 5. Seguridad y accesibilidad

- **Seguridad:** el sondeo OWASP pasó 20/20 (A01, A02, A05, A06, A07, A08 y A10). No se encontraron secretos expuestos en el repositorio ni en las evidencias. Las variables de Vercel se revisaron sin descifrar.
- **Accesibilidad:** axe no dio violaciones en 60 escaneos y las pruebas de teclado y reflujo pasaron 15/15. Esto **no** equivale a cumplimiento completo de WCAG, porque falta la revisión manual con lector de pantalla.

## 6. Estado de fases y entregables

| Entregable | Archivo | Estado |
|---|---|---|
| Revisión del material | 00 | Completo |
| Ficha técnica | 01 | Completo |
| Requisitos | 02 | Completo (25) |
| Modelos Garvin/McCall/ISO 9126 | 03 | Completo (46 filas; 2 NO APLICA y 2 NO EVALUADO justificados) |
| Registro de defectos | 04 | Completo (14 reales; 0 sembrados) |
| Métricas | 05 | Completo; horas-persona NO EVALUADO |
| Revisión formal | 06 | R1–R6 ejecutadas; RTF PENDIENTE |
| Plan SQA | 07 | Completo |
| Plan de pruebas | 08 | Completo |
| Casos y evidencias | 09, evidencias/ | 43/47 ejecutados |
| Trazabilidad | 10 | Completo (cobertura 84 %) |
| Impacto del cambio | 11 | Completo |
| Decisión | 12 | Borrador previo a producción |
| Defensa | 13 | Completo |

## 7. Vercel

- **Proyecto y dominio:** `asistente-financiero`, dominio https://asistente-financiero-seven.vercel.app. No se crearon otros proyectos ni dominios.
- **Variables cambiadas el 2026-10-25 con OK del usuario:** se creó `CRON_SECRET` (sensible) y se cambió `APP_ORIGIN` al dominio oficial.
- **Despliegue:** pendiente del OK del usuario.
