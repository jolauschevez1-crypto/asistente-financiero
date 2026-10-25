# 11 · Análisis de impacto del cambio

## 1. Cambios recibidos

| ID | Fecha | Origen | Cambio |
|---|---|---|---|
| CR-01 | 2026-10-25 | Consigna ("cambio inesperado") y el usuario: "q el usuario elija q moneda quiere usar y esa queda definida pa todos los módulos" | **Multidivisa USD/EUR.** Cada cartera tiene su moneda; el panel se consolida en la moneda de presentación (USD por defecto); hay conversión explícita. Sustituye la restricción anterior: "la moneda no se puede cambiar después de registrar actividad" (`MONEDA_BLOQUEADA`) |
| CR-02 | 2026-10-25 | Usuario | Contraseña de al menos 10 caracteres (el usuario confirmó 10) con mayúscula, número y carácter especial, que no sea ni contenga el nombre ni el correo. Además, campos de texto solo con texto y campos numéricos solo con números |
| CR-03 | 2026-10-25 | Usuario: "desactiva que quede para otra version" | Telegram fuera de esta versión |
| CR-04 | 2026-10-25 | Usuario, con 6 capturas de referencia: "en todos los modulos salga asi la opcion de escoger monedas, y si yo aplasto euro se ponga todo en euro", "para crear cartera no salga la moneda", "quita el modulo moviemintos", "quita el metodo de pago en todo lado", "quita del navbar la moneda de cambio", "ponlos en el navbar los botones de accesibilidad", "en perfil unicamente q va a en perfil", "q use otros colores no me gusta ese verde" | **Moneda de visualización por módulo y simplificación.** Ver §8 |

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

## 4. Pruebas invalidadas, insuficientes y nuevas

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
  | Frontend | 38 | 54 (59 tras CR-04, ver §8) |

## 5. Métricas afectadas

- Densidad de defectos: el cambio añadió unas 2.200 líneas de producto.
- Cobertura de requisitos: ahora se mide sobre 25 requisitos, 11 de ellos nuevos. La línea base no tenía un catálogo comparable.
- Nuevos indicadores SQA: antigüedad de la tasa, sumas entre monedas y descuadres.

## 6. Datos y migración

- **Tipo de migración:** `multidivisa-schema.sql` es aditiva. Agrega la columna `moneda` a carteras, movimientos y módulos, y la hereda de la moneda del usuario. Crea las tablas `tasas_cambio`, `fin_conversiones` y `fin_transferencias`. No borra ni reescribe importes.
- **Ejecución:** corre en cada build vía `prepare-cloud` y es idempotente (BE 7).
- **Recuperación:** como es aditiva, para volver atrás basta desplegar el commit anterior. Las columnas nuevas no rompen la versión previa. El respaldo y la restauración están probados (BE 1 a 3).
- **Producción:** el paso a producción necesita el OK del usuario (CP-46).

## 7. Efecto en la decisión

El cambio pasa de "riesgo de diseño" en la línea base a "implementado y probado en local". Solo falta verificarlo en producción: tasa real y migración aplicada. Mientras eso no ocurra, la decisión no puede ser GO pleno (ver 12).

## 8. CR-04: moneda de visualización en cada módulo y simplificación (2026-10-25)

**Qué cambia**
- Cada módulo (Panel, Carteras, Presupuestos, Fijos, Deudas, Metas, Grupos) tiene un selector de moneda arriba a la derecha. Al elegir EUR, MXN o USD, todos los importes se muestran convertidos con la tasa de referencia del BCE. Bajo el título se avisa la fecha de la tasa y que lo guardado no cambia.
- La barra superior ya no tiene selector de moneda; lleva los botones de tema oscuro, texto grande y alto contraste.
- Crear cartera pide solo nombre y saldo inicial. La cartera se crea en la moneda elegida en el selector. Lo mismo para presupuestos, deudas, metas y grupos nuevos.
- El módulo Movimientos (`/usuario`) se retira. Gastos e ingresos se registran con «Nuevo movimiento» y se consultan en el «Diario de movimientos» dentro de Carteras; los traspasos, con «Transferir». `/usuario` redirige a `/carteras`.
- El método de pago desaparece de formularios, listados y exportación CSV.
- Perfil queda solo con datos de perfil (sin moneda). La pestaña de Telegram ya se había retirado en la rama (D-13); la que vio el usuario era la versión publicada. También se quita la columna Telegram del listado de administración.
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

