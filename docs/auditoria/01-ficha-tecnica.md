# 01 · Ficha técnica del producto bajo juicio

| Campo | Valor |
|---|---|
| Producto | Asistente Financiero (finanzas personales) |
| Repositorio | `jolauschevez1-crypto/asistente-financiero` |
| Rama de trabajo | `claude/project-thread-noiuro` (ver desvío en §5) |
| Línea base | `f3504d3`, el mismo commit que estaba en producción al empezar (despliegue `dpl_DXhimEwhkZdoV2Txosgmg6vmRwKT`) |
| Producción | https://asistente-financiero-seven.vercel.app (proyecto de Vercel `asistente-financiero`) |
| Equipo | [Integrante 1], [Integrante 2], [Integrante 3], [Integrante 4]. Docente: Ing. Jimmy Molina Ríos, Ph.D. Asistencia técnica: Claude (asistente de IA) |
| Periodo | 2026-10-25 (línea base 05:09Z; última evidencia 14:52Z) |

## 1. Arquitectura

- **Frontend:** Angular 20.3 (componentes standalone, señales), Angular Material y ApexCharts. La aritmética de dinero en pantalla usa BigInt en centavos (`core/money.ts`).
- **Backend:** Express 4 sobre Node 24. Funciona como función serverless en Vercel (`api/index.js`) y como servidor local (`BACKEND/index.js`).
- **Datos:** PostgreSQL. Neon en producción, PGlite en las pruebas y PostgreSQL 16 aislado para la línea base y las pruebas de sistema locales. La migración multidivisa (`BACKEND/scripts/multidivisa-schema.sql`) es aditiva e idempotente.
- **Tasas de cambio:** tasas de referencia del BCE vía Frankfurter (sin clave ni coste). El cron de Vercel corre a las 16:30 UTC sobre `/api/tasas/actualizar`, protegido con `CRON_SECRET`. Si las tasas tienen más de 12 horas, se refrescan al consultar. Una tasa se considera vigente durante 4 días como máximo. Monedas con tasa: USD, EUR y MXN. COP, PEN, ARS y CLP se muestran aparte.
- **Autenticación:** JWT con sesión absoluta de 30 minutos, refresh que no prolonga ese plazo, bcrypt e inicio con Google (GIS).

## 2. Alcance evaluado

- **Dentro:** registro e inicio de sesión, política de contraseña, carteras, movimientos, transferencias, conversión de moneda, panel, presupuestos, recurrentes, deudas, metas, grupos, carga rápida, reportes y exportación, administración, IA de consulta, navegación y accesibilidad.
- **Fuera:** Telegram (desactivado para otra versión, CR-03), envío de correo (SMTP apagado en producción) y pruebas con usuarios reales.

## 3. Entornos de prueba

| Entorno | Uso | Datos |
|---|---|---|
| PGlite en memoria | Pruebas automáticas del backend (`npm test`) | Generados por cada prueba |
| PostgreSQL 16 local, base `af_baseline` | Línea base en `f3504d3` | Usuario ficticio `amigo@local.test` |
| PostgreSQL 16 local, base `af_after` (copia de la anterior con la migración aplicada) | Pruebas de sistema, accesibilidad, seguridad y carga | Mismo usuario ficticio y usuarios de carga `carga*@local.test` |
| Proveedor de tasas simulado (local, puerto 3199) | Pruebas de sistema | Tasas FICTICIAS: USD/EUR 0,9 y USD/MXN 18. El proxy del contenedor bloquea `api.frankfurter.dev` |
| Chromium (Playwright) | Capturas, axe, teclado y rendimiento | 1366×850, 390×844 y 320×640 |

No se usaron datos reales ni la base de producción en ninguna prueba.

## 4. Commits desde la línea base

Ver `git log f3504d3..HEAD`. Los cambios del producto son:

- `8cc3b6c`: migración.
- `6d91964`: tasas.
- `df2e40f`, `bb52abb`: multidivisa en el backend.
- `0c40308`: pruebas de multidivisa.
- `db0814c`: política de contraseña.
- `89f156b`, `1d71018`, `067caac`: multidivisa en el frontend.
- `7ba309a`: rediseño.
- `0baef03`: navegación.
- `015fed5`: dependencias y Telegram.
- `19b56de`: accesibilidad.
- `cf81359`: rendimiento.

El resto de los commits son de documentación y evidencias.

## 5. Desvíos respecto de la consigna

- **Ramas:** la consigna pide `feature/multidivisa`, `feature/redesign-ui`, `audit/baseline` y `audit/lab`. El entorno de trabajo solo autoriza a subir la rama `claude/project-thread-noiuro`, así que todo el trabajo está ahí, en commits pequeños con los prefijos pedidos.
- **Rama `audit/lab`:** no se creó porque no hizo falta sembrar defectos. Hubo 14 defectos reales (ver `04-registro-defectos.csv`).
- **Preview de Vercel:** el proyecto no tiene variables para Preview, así que una vista previa no tendría base de datos. Las pruebas de sistema y de carga se hicieron en local.
