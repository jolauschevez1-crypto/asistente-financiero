# 11 · Análisis de impacto del cambio

## 1. Cambios recibidos

El cambio inesperado de la consigna es **multidivisa con carga ×5**: el producto pasa de una moneda por usuario a varias monedas con conversión, y debe sostener cinco veces la carga de la línea base sin perder exactitud. Los demás cambios llegaron durante el trabajo y se registran con el mismo formato.

| ID | Fecha | Origen | Cambio |
|---|---|---|---|
| CR-01 | 2026-10-25 | Consigna («cambio inesperado») | **Multidivisa con carga ×5.** Cada cartera tiene su moneda; el panel se consolida en la moneda de presentación (USD por defecto); hay conversión explícita y tasas de referencia fechadas. Sustituye la restricción anterior «la moneda no se puede cambiar después de registrar actividad» (`MONEDA_BLOQUEADA`). La carga de referencia pasa de 1 a 5 usuarios simultáneos |
| CR-02 | 2026-10-25 | Decisión del equipo | Contraseña de al menos 10 caracteres con mayúscula, número y carácter especial, que no sea ni contenga el nombre ni el correo. Campos de texto solo con texto y campos numéricos solo con números |
| CR-03 | 2026-10-25 | Decisión del equipo | Telegram queda fuera de esta versión |
| CR-04 | 2026-10-25 | Decisión del equipo, con 6 capturas de referencia | **Moneda de visualización por módulo y simplificación**: selector de moneda en cada módulo, alta de cartera sin campo de moneda, retiro del módulo Movimientos y del método de pago, accesibilidad en la barra superior, perfil reducido y paleta azul. Ver §9 |
| CR-05 | 2026-10-25 | Decisión del equipo | Logo propio, botón de Google al inicio del login y consulta de una dirección sin «seven». Ver §10 |
| CR-06 | 2026-10-27 | Decisión del equipo | Retiro del botón de Telegram que quedaba en Configuración y mejoras visuales: importes completos en tarjetas, acciones móviles en dos filas, porcentajes con coma decimal. Ver §11 |

## 2. Requisitos afectados

| Estado | Requisitos |
|---|---|
| Nuevos | RF-02, RF-03, RF-06, RF-07, RF-08, RF-09, RF-10, RNF-01, RNF-03, RNF-04, RNF-05 |
| Cambiados | RF-04 (de una moneda por usuario a una por cartera), RF-05, RF-11, RF-12, RF-14, RF-15, RF-16, RF-17 |
| Estables | RF-01, RF-13, RNF-02, RNF-06, RNF-07, RNF-08 |

## 3. Atributos y riesgos

- **Exactitud:**
  - Riesgo nuevo: sumar USD con EUR, o redondear distinto en cliente y servidor.
  - Mitigación: centavos con BigInt y aritmética racional, half-up igual en las dos capas (CP-30), y total parcial cuando falta tasa (CP-09, CP-15).
- **Fiabilidad:**
  - Riesgo nuevo: dependencia externa (Frankfurter).
  - Mitigación: última tasa válida con su antigüedad, y vigencia de 4 días (CP-14).
- **Integridad:**
  - Riesgo nuevo: conversiones y transferencias entre monedas duplicadas o parciales.
  - Mitigación: transacción única con claves de idempotencia (CP-16, CP-18, CP-41).
- **Trazabilidad histórica:**
  - Riesgo nuevo: reinterpretar movimientos antiguos.
  - Mitigación: la valoración usa la tasa de la fecha (CP-19). Después de una conversión, un trigger impide editar los movimientos anteriores.
- **Seguridad:**
  - El cron nuevo es una superficie de ataque. Se protege con `CRON_SECRET` (CP-12).
  - CR-03 reduce dependencias vulnerables (D-01).
- **Usabilidad:** el selector de moneda de presentación va en la barra superior, y los textos dicen "no en tiempo real".

## 4. Impacto de la multidivisa por aspecto

| Aspecto | Antes (línea base `f3504d3`) | Después | Riesgo | Control | Evidencia | Estado |
|---|---|---|---|---|---|---|
| Saldos | Un saldo por cartera en la moneda del usuario | Un saldo por cartera en su propia moneda; el total del panel se consolida con tasa | Sumar monedas distintas; descuadre en transferencias | Totales por moneda y consolidado solo con tasa; transacción única por transferencia | CP-09, CP-16, CP-41; EV-REN-02 (0 descuadres en 5 usuarios) | Cumple en local |
| Historial | Importes sin moneda propia | Cada movimiento guarda importe y moneda originales; la valoración usa la tasa de su fecha | Reinterpretar meses anteriores con la tasa de hoy | Trigger que bloquea editar movimientos anteriores a una conversión; valoración por fecha | CP-19; BE 58 y 60 | Cumple en local |
| Precisión | `number` en pantalla | Centavos con BigInt en el cliente y aritmética racional en el servidor; half-up a 2 decimales; factores con 12 decimales | Diferencias de redondeo entre capas | La misma regla en las dos capas | CP-30; `money.spec` | Cumple |
| Conversión | No existía | Conversión explícita con confirmación de la tasa; idempotente | Doble cargo; tasa cambiada entre la vista y la confirmación | Clave de idempotencia y comprobación de la tasa | CP-16, CP-18 | Cumple en local |
| Tasas | No existían | BCE vía Frankfurter, cron diario 16:30 UTC, refresco si tienen más de 12 h, vigencia de 4 días; solo USD, EUR y MXN | Proveedor caído o tasa vieja | Última tasa válida con su antigüedad; nunca se inventa una tasa | CP-11, CP-14, CP-15; **CP-13 (tasa real en producción) sin ejecutar** | Local con tasas simuladas; producción sin verificar con sesión |
| Persistencia | Columna de moneda solo en el usuario | Columna `moneda` en carteras, movimientos y módulos; tablas `tasas_cambio`, `fin_conversiones`, `fin_transferencias` | Pérdida de datos al migrar | Migración aditiva e idempotente; respaldo y restauración probados | BE 1 a 3 y 7; CP-46 | Migración aplicada en producción (5 despliegues) |
| Seguridad | Sin endpoint de tasas | Endpoint del cron | Llamada externa al cron | `CRON_SECRET` | CP-12 | Cumple; D-08 (variable en producción) sin verificar |
| Reportes | Totales en una moneda | Reportes, administración, exportación e IA agrupan por moneda | Totales mezclados | Agrupación por moneda | BE 31, 32, 56, 57 | Cumple en local |
| Rendimiento (carga ×5) | 1 usuario | 5 usuarios simultáneos | Latencia y bloqueos | p95 ≤ 500 ms; 0 errores; 0 descuadres | EV-REN-02: ×1 p95 23,3 ms (135 peticiones); ×5 p95 35,0 ms (675 peticiones, 240 req/s), 0 errores | Cumple **solo en local** |
| Regresión | 56 pruebas backend y 38 frontend | 69 y 64 | Romper lo que ya funcionaba | Suite completa tras cada corrección; ninguna prueba desactivada | EV-PRU-03/04, EV-REG-01, EV-D20-01/02 | 133/133 |

**Limitación de la carga ×5.** La medimos solo sobre PostgreSQL 16 local con tasas simuladas. No la repetimos en producción para no escribir en la base real (Neon) ni gastar el límite de peticiones del plan de Vercel. Neon y las funciones serverless tienen arranque en frío y latencia de red que la medición local no incluye, así que el p95 de producción será mayor. El resultado sirve para descartar bloqueos y descuadres bajo concurrencia, no para garantizar tiempos en producción.

## 5. Pruebas invalidadas, insuficientes y nuevas

- **Invalidadas por CR-01:** las pruebas de la línea base que exigían el bloqueo de moneda tras la actividad. Se reescribieron en `0c40308` para comprobar lo contrario: cambiar la moneda de presentación con actividad está permitido y no reetiqueta importes (BE 27). La reescritura de una prueba por un cambio de requisito queda registrada aquí y no oculta ningún fallo.
- **Insuficientes:** la línea base no tenía pruebas de tasas, de conversión ni de valoración histórica.
- **Nuevas:**
  - backend, BE 53 a 61 y 66 a 69;
  - frontend, `money.spec`, `password-policy.spec`, `multidivisa.spec` y `finance.spec`;
  - sistema, carga ×5, axe, teclado y sondeo OWASP.
- **Total de pruebas automáticas:**

  | | Línea base | Ahora |
  |---|---:|---:|
  | Backend | 56 | 69 |
  | Frontend | 38 | 64 (54 tras CR-01, 59 tras CR-04 y 64 tras CR-06) |

## 6. Métricas afectadas

- Densidad de defectos: el cambio añadió unas 2.200 líneas de producto.
- Cobertura de requisitos: ahora se mide sobre 25 requisitos, 11 de ellos nuevos. La línea base no tenía un catálogo comparable.
- Nuevos indicadores SQA: antigüedad de la tasa, sumas entre monedas y descuadres.

## 7. Datos y migración

- **Tipo de migración:** `multidivisa-schema.sql` es aditiva. Agrega la columna `moneda` a carteras, movimientos y módulos, y la hereda de la moneda del usuario. Crea las tablas `tasas_cambio`, `fin_conversiones` y `fin_transferencias`. No borra ni reescribe importes.
- **Ejecución:** corre en cada build vía `prepare-cloud` y es idempotente (BE 7).
- **Recuperación:** como es aditiva, para volver atrás basta desplegar el commit anterior. Las columnas nuevas no rompen la versión previa. El respaldo y la restauración están probados (BE 1 a 3).
- **Producción:** cada paso a producción se hizo con autorización del equipo (CP-46).

## 8. Efecto en la decisión

El cambio pasa de «riesgo de diseño» en la línea base a «implementado, probado en local y publicado». La migración está aplicada en producción y el paquete publicado es el mismo que probamos. Falta verificar con sesión la tasa real y su fecha (CP-13), y la carga ×5 solo está medida en local. Mientras eso no ocurra, la decisión no puede ser GO pleno (ver 12).

## 9. CR-04: moneda de visualización en cada módulo y simplificación (2026-10-25)

**Qué cambia**
- Cada módulo (Panel, Carteras, Presupuestos, Fijos, Deudas, Metas, Grupos) tiene un selector de moneda arriba a la derecha. Al elegir EUR, MXN o USD, todos los importes se muestran convertidos con la tasa de referencia del BCE. Bajo el título se avisa la fecha de la tasa y que lo guardado no cambia.
- La barra superior ya no tiene selector de moneda; lleva los botones de tema oscuro, texto grande y alto contraste.
- Crear cartera pide solo nombre y saldo inicial. La cartera se crea en la moneda elegida en el selector. Lo mismo para presupuestos, deudas, metas y grupos nuevos.
- El módulo Movimientos (`/usuario`) se retira. Gastos e ingresos se registran con «Nuevo movimiento» y se consultan en el «Diario de movimientos» dentro de Carteras; los traspasos, con «Transferir». `/usuario` redirige a `/carteras`.
- El método de pago desaparece de formularios, listados y exportación CSV.
- Perfil queda solo con datos de perfil (sin moneda). La pestaña de Telegram ya se había retirado en la rama (D-13); la que aparecía en las capturas era la versión publicada. También se quita la columna Telegram del listado de administración.
- Paleta azul sobre negro en lugar de verde.

**Compatibilidad con el modelo multidivisa (CR-01)**
- No hay conflicto con la regla de no recalcular el historial: el selector solo cambia cómo se *muestran* los importes. Cada cartera y cada movimiento conservan su moneda y su importe guardados. Las tarjetas y el diario muestran el original al lado ("Guardada en USD 7,10").
- Solo USD, EUR y MXN tienen tasa de referencia. El selector ofrece esas tres; un importe en una moneda sin tasa (por ejemplo COP) se muestra en su moneda y se nombra aparte en los totales. Las capturas de referencia mostraban COP, ARS y CLP, pero no se ofrecen porque no se podrían convertir con una tasa real.
- Las operaciones que mueven dinero (transferir, abonar, aportar, convertir) siguen en la moneda real de la cartera y piden confirmar la tasa.

**Datos**
- Sin migración. La columna `metodo_pago` se conserva en la base y el servidor sigue poniendo `EFECTIVO` por defecto; la edición de administración conserva el valor guardado para no sobrescribirlo. Nada se borra.
- Servidor: `GET /finanzas/tasas?moneda=EUR` añade `tasas_a` (factor de cada moneda a la elegida, 12 decimales, mismo cálculo que el panel). Es aditivo.

**Pruebas**
- Backend: la prueba de `/finanzas/tasas` comprueba también `tasas_a` (BE sigue en 69).
- Frontend: los casos de `user-dashboard.spec` y `multidivisa.spec` se portaron a `movement-journal.spec` y `carteras.spec`; FE-T01..FE-T08 conservan su identificador y apuntan al diario (alta y CSV) y a «Transferir» (FE-T03, FE-T04). FE-T06 comprueba ahora que el CSV no tiene método de pago. Nuevas: conversión para mostrar en `currency.service.spec`, cartera sin campo de moneda, total de carteras en la moneda elegida. Ninguna prueba se desactivó.
- Accesibilidad, teclado y desborde: `/usuario` sale de los recorridos porque redirige; el botón del diálogo se llama ahora «Nueva cartera». Evidencias en `evidencias/cr04/`.

**Riesgos**
- Un importe convertido puede leerse como dinero real en esa moneda. Mitigación: aviso bajo el título, original al lado y la palabra "referencia".
- Si `/finanzas/tasas` falla, los importes se muestran en su moneda original (no se inventa una tasa).


## 10. CR-05: logo, acceso con Google y dirección (2026-10-25)

- **Logo:** se sustituye el icono por defecto de Angular y el cuadro «AF» por un logo propio (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`) en la pestaña, la barra superior y el login. Sin efecto en requisitos funcionales. Evidencia EV-LOGO-01/02.
- **Login (RF-01, RNF-03):** «Continuar con Google» pasa arriba del formulario, a todo el ancho, con un separador «o con tu correo» y el tema oscuro de Google. El flujo OAuth no cambia. Evidencia EV-LOGIN-01, con el botón de Google simulado; el iframe real queda por confirmar en producción.
- **Dirección:** `asistente-financiero.vercel.app`, `asistentefinanciero.vercel.app` y `mi-asistente-financiero.vercel.app` ya pertenecen a otras cuentas de Vercel (respuesta 409 de la API). El equipo decidió mantener `asistente-financiero-seven.vercel.app`. RNF-08 no cambia.
- **Pruebas:** frontend 60/60, axe 60 escaneos 0 violaciones, teclado 21/21, desborde 0. Ninguna prueba queda invalidada.
- **Decisión:** no cambia (sigue CONDITIONAL GO, ver 12).

## 11. CR-06: retiro del botón de Telegram y mejoras visuales (2026-10-27)

- **Configuración (RF-17):** se retira el campo y el botón de Telegram que seguían en la pantalla aunque el servidor lo ignora (D-18). El texto explica que IA, Google y correo dependen de las variables del servidor.
- **Carteras (RF-16):** los saldos largos ya no se recortan; la tarjeta usa una consulta de contenedor y reduce la letra solo cuando el importe pasa de 11 caracteres (D-17). En móvil, las acciones se ordenan en dos filas y «Nuevo movimiento» no se parte.
- **Gráficos (RF-05):** porcentajes con coma decimal (D-19).
- **Navegación (RF-15):** un usuario sin rol de administrador que abre una ruta de administración vuelve a su panel; una ruta desconocida lleva al panel (D-16).
- **Pruebas:** 3 nuevas del guard de administración, 1 de saldos largos; frontend 60 → 64; backend 69. Axe 60 escaneos sin violaciones, teclado 21/21, desborde 0 a 390 px y barrido de 12 rutas × 2 anchos sin errores (EV-REG-01 a 04, EV-D16-01/02). Ninguna prueba quedó invalidada.
- **Producción:** publicado en `5c7c8c5` con autorización del equipo; verificado sin sesión (EV-PROD-01).
- **Decisión:** no cambia por sí solo (ver 12).
