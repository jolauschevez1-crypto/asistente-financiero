# 12 · Informe ejecutivo de liberación

**Fecha de corte:** 2026-10-27 03:45Z. **Versión en producción:** `7c09956` desde el 2026-10-28 01:14Z (https://asistente-financiero-seven.vercel.app, despliegue `dpl_goBVsNb2nDbm8dZdALLhp8V9zSao`, ver EV-PROD-01), con la corrección de D-20.

## 1. Decisión

**CONDITIONAL GO** («aprobado con condiciones», Semana 2 Clase 2). El producto ya está publicado con autorización del equipo; la decisión dice si puede aceptarse como versión de calidad y con qué condiciones.

**Por qué no es NO-GO**
- Integridad de saldos: 0 descuadres y 0 saldos negativos con carga ×5 en local, concurrencia e idempotencia (EV-REN-02; BE 10, 42, 59, 60).
- Exactitud: no se suman monedas sin tasa; aritmética en centavos con redondeo half-up igual en cliente y servidor (CP-08, CP-15, CP-21, CP-30).
- Seguridad: sondeo OWASP 20/20 y 0 vulnerabilidades críticas o altas (EV-SEG-01..03). Un usuario sin rol de administrador ya no ve pantallas de administración vacías (D-16).
- Regresión: 133/133 pruebas automáticas (69 backend, 64 frontend) después de la última corrección (EV-D20-01/02).
- Accesibilidad automatizable: axe 60 escaneos con 0 violaciones; teclado y reflujo 21/21 (EV-REG-02/03).
- 0 defectos críticos. Ningún defecto afectó saldos, tasas guardadas ni datos.
- La versión probada es la que corre en producción: mismo paquete `main-R4RK5IAX.js` en `7c09956` (EV-PROD-01).

**Por qué no es GO**
1. **Falta evidencia en producción con sesión**: tasa real con fecha ≤ 4 días (CP-13), cron autorizado (D-08) y LCP móvil (CP-40). Cobertura de requisitos: 21/25 = 84 % (umbral 100 %).
2. **DRE 50 %** (umbral ≥ 90 %): 10 defectos se encontraron con la versión ya publicada (D-11 a D-20). El más grave, D-15 (Alta), impedía crear carteras y se detectó usando la aplicación en producción.
3. **Tasa de cierre 40 %** (umbral ≥ 90 %): D-08, D-09 y D-11 a D-19 están publicados pero sin verificar con sesión en producción; D-20 está publicado; su texto del perfil se verificó en producción y los mensajes del servidor solo en local.
4. **Densidad de defectos 1,27/KLOC** (umbral ≤ 1,0).
5. **Revisión técnica formal RTF-01 no celebrada** (06 §4) y **lector de pantalla no evaluado** (CP-37).

Los riesgos críticos no se promediaron: cada uno se evaluó por separado (§3). Ninguno de los cinco puntos anteriores es un fallo crítico de funcionamiento; son evidencia que falta o umbrales de proceso que no se alcanzaron.

### Condiciones para pasar a GO
1. Con la cuenta de prueba en producción: el panel muestra el sello «Tasas de referencia BCE del …» con fecha ≤ 4 días (CP-13) y el cron responde 200 (D-08).
2. LCP móvil ≤ 4 s medido en la URL oficial (CP-40).
3. Crear la cartera «Ecuabet» en producción (D-15) y revisar con sesión D-09 y D-11 a D-19. Verificar en producción los mensajes del servidor de D-20. Con eso la tasa de cierre llega a 100 %.
4. RTF-01 con roles, acta y seguimiento (06 §4) y revisión con lector de pantalla (CP-37).

**Vuelve a NO-GO** si en producción falla el inicio de sesión, la integridad de saldos o las tasas.

## 2. Línea base y versión evaluada

| | Línea base `f3504d3` | Versión `7c09956` |
|---|---|---|
| Moneda | Una por usuario, bloqueada tras la actividad | Una por cartera; selector de moneda de visualización en cada módulo (USD, EUR, MXN); conversión explícita y trazable |
| Tasas | No había | BCE vía Frankfurter, cron diario y refresco perezoso, última tasa válida con su antigüedad |
| Interfaz | Sidebar, verde | Barra superior con botones de accesibilidad, menú móvil accesible, paleta azul sobre negro, logo propio, Movimientos dentro de Carteras, saldos largos completos |
| Login | Google al final | «Continuar con Google» primero, con separador |
| Contraseña | Política anterior | Mínimo 10 caracteres, mayúscula, minúscula, número y carácter especial, sin nombre ni correo |
| Telegram | Opcional | Fuera de esta versión, sin botón en Configuración |
| Pruebas | 56 backend y 38 frontend | 69 backend y 64 frontend; 53 casos documentados |
| Dependencias | Críticas y altas | 0 críticas/altas; 2 moderadas aceptadas |

## 3. Criterios de liberación

| Criterio | Estado | Evidencia |
|---|---|---|
| Build e instalación | CUMPLE | EV-PRU-02; registros de build en Vercel |
| Inicio de sesión | CUMPLE en local; en producción, la captura con la que se reportó D-15 muestra una sesión iniciada | CP-01, CP-02 |
| Base de pruebas aislada | CUMPLE | 01 §4 |
| USD/EUR por cartera | CUMPLE | CP-07, CP-08 |
| Tasas verificables con fecha | CUMPLE con el proveedor simulado; **producción pendiente** | CP-11, CP-13 |
| Respaldo sin tasa o con proveedor caído | CUMPLE | CP-14, CP-15 |
| Historial preservado | CUMPLE | CP-19 |
| Conversión explícita | CUMPLE | CP-18 |
| Autorización y aislamiento | CUMPLE | CP-31..CP-34, CP-49 |
| Pruebas críticas | CUMPLE (133/133) | EV-REG-01, EV-D20-01/02 |
| Sin defectos críticos abiertos | CUMPLE (0 críticos; D-15 Alta publicado, falta confirmarlo con sesión) | 04 |
| Escritorio y móvil | CUMPLE en local | CP-27, CP-42, CP-43, CP-50, EV-REG-04 |
| Migración sin pérdida de datos | CUMPLE (aditiva, aplicada en producción) | CP-45, EV-PROD-01 |
| Verificación en producción | **PARCIAL** (6 despliegues verificados sin sesión) | CP-46, EV-PROD-01 |
| DRE ≥ 90 % | **NO CUMPLE** (50 %) | 05 §1 |
| Cierre de no conformidades ≥ 90 % | **NO CUMPLE** (40 %) | 05 §1 |
| Densidad ≤ 1,0/KLOC | **NO CUMPLE** (1,27) | 05 §1 |

## 4. Riesgos que quedan

- **Límite de 300 peticiones cada 15 minutos por IP:** puede afectar a usuarios que comparten IP pública (EV-REN-03). Se detecta por respuestas 429.
- **Carga ×5 medida solo en local:** Neon y las funciones serverless añaden arranque en frío y latencia de red que no medimos (11 §4).
- **uuid moderado vía exceljs (aceptado):** exceljs no usa la ruta afectada (EV-SEG-02).
- **Datos personales en el historial de git (D-13):** se quitaron del código, pero siguen en commits antiguos. No reescribimos el historial porque exige `push --force` sobre la rama principal; queda como decisión pendiente con la persona afectada.
- **Solo Chromium probado:** Firefox y Safari no se evaluaron.
- **Dependencia de Frankfurter:** si falla, se usa la última tasa válida con su antigüedad.
- **Formularios sin prueba de interfaz real en todos los módulos:** D-15 escapó porque ninguna prueba escribía en el formulario. CP-48 lo cubre para carteras; metas, deudas y grupos no tienen una prueba equivalente.

## 5. Estado de entregables

| Entregable de la consigna | Archivo | Estado |
|---|---|---|
| 1. Expediente técnico inicial | 01, 02 | Completo |
| 2. Auditoría Garvin, McCall, ISO/IEC 9126 | 03, 03b | Completo (46 filas; 2 NO APLICA y 2 NO EVALUADO justificados) |
| 3. Registro, clasificación y métricas de defectos | 04, 04b, 05 | Completo (20 reales, 0 sembrados); esfuerzo de revisión 3,25 horas-persona sin la RTF-01 |
| 4. Revisión técnica formal | 06 | R1–R8 ejecutadas como revisiones individuales; **RTF-01 planificada, no celebrada** |
| 5. Plan SQA | 07 | Completo |
| 6. Estrategia y plan de pruebas | 08 | Completo |
| 7. Casos y evidencias | 09, evidencias/ | 49 de 53 aprobados, 1 parcial, 3 no ejecutados |
| 8. Matriz maestra de trazabilidad | 10 | Completo (cobertura 84 %) |
| 9. Impacto del cambio | 11 | Completo (CR-01 a CR-06, impacto por aspecto) |
| 10. Informe de decisión | 12 | Este documento |
| 11. Repositorio de evidencias | evidencias/ | Completo e indexado (README) |
| 12. Defensa técnica | 13 | Respuestas preparadas con enlaces a la evidencia |

## 6. Vercel

- Proyecto `asistente-financiero` y dominio `asistente-financiero-seven.vercel.app`. No se crearon otros proyectos ni se cambió el dominio. Las direcciones sin «seven» están ocupadas por otras cuentas.
- Variables cambiadas con autorización del equipo: `CRON_SECRET` creada (sensible) y `APP_ORIGIN` apuntando al dominio oficial. Los valores no se copiaron al expediente.
- Seis despliegues a producción, cada uno autorizado por el equipo y verificado sin sesión (EV-PROD-01).
