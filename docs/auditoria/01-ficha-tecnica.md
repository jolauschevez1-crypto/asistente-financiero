# 01 · Ficha técnica del producto bajo juicio

| Campo | Valor |
|---|---|
| Producto | Asistente Financiero (finanzas personales) |
| Repositorio | `jolauschevez1-crypto/asistente-financiero` |
| Rama de trabajo | `claude/project-thread-noiuro` (ver desvío en §6) |
| Línea base | `f3504d3`, el mismo commit que estaba en producción al empezar (despliegue `dpl_DXhimEwhkZdoV2Txosgmg6vmRwKT`) |
| Producción | https://asistente-financiero-seven.vercel.app (proyecto de Vercel `asistente-financiero`). Versión en producción: `7c09956` (despliegue `dpl_goBVsNb2nDbm8dZdALLhp8V9zSao`, sexto despliegue verificado en EV-PROD-01, 2026-10-28), con la corrección de D-20. Las direcciones sin «seven» (`asistente-financiero.vercel.app` y otras) pertenecen a otras cuentas de Vercel |
| Equipo | Jolaus Chévez, Steven González, Manuel Hurtado, Pablo Jara |
| Institución | Universidad Técnica de Machala, Facultad de Ingeniería Civil, carrera de Tecnologías de la Información, 6.º semestre, paralelo A. Docente: Ing. Jimmy Molina Ríos, Ph.D. |
| Fecha de entrega | 29/06/2026 |
| Periodo de la auditoría | Del 2026-10-25 05:09Z (línea base) al 2026-10-27 03:45Z (fecha de corte), según las marcas de tiempo de los commits y de las evidencias |

## 1. Arquitectura

- **Frontend:** Angular 20.3 (componentes standalone, señales), Angular Material y ApexCharts. La aritmética de dinero en pantalla usa BigInt en centavos (`core/money.ts`).
- **Backend:** Express 4 sobre Node 24. Funciona como función serverless en Vercel (`api/index.js`) y como servidor local (`BACKEND/index.js`).
- **Datos:** PostgreSQL. Neon en producción, PGlite en las pruebas y PostgreSQL 16 aislado para la línea base y las pruebas de sistema locales. La migración multidivisa (`BACKEND/scripts/multidivisa-schema.sql`) es aditiva e idempotente.
- **Tasas de cambio:** tasas de referencia del BCE vía Frankfurter (sin clave ni coste). El cron de Vercel corre a las 16:30 UTC sobre `/api/tasas/actualizar`, protegido con `CRON_SECRET`. Si las tasas tienen más de 12 horas, se refrescan al consultar. Una tasa se considera vigente durante 4 días como máximo. Monedas con tasa: USD, EUR y MXN. COP, PEN, ARS y CLP se muestran aparte.
- **Autenticación:** JWT con sesión absoluta de 30 minutos, refresh que no prolonga ese plazo, bcrypt e inicio con Google (GIS).

## 2. Módulos: reales, configurables y desactivados

| Módulo | En producción | En las pruebas locales | Cómo se activa |
|---|---|---|---|
| Finanzas (carteras, movimientos, transferencias, presupuestos, recurrentes, deudas, metas, grupos, reportes) | Real, sobre Neon | Real, sobre PostgreSQL 16 y PGlite | Siempre activo |
| Tasas de cambio | Real (Frankfurter/BCE) con cron diario | **Simuladas** (proveedor local con tasas ficticias) porque el proxy del entorno bloquea Frankfurter | `CRON_SECRET` y la URL del proveedor |
| Inicio de sesión con Google | Activo | Apagado | `GOOGLE_ENABLED` y el ID de cliente |
| Asistente de consulta (IA) | Activo con el proveedor configurado en las variables del servidor | Apagado o con respuestas locales en las pruebas | Variables del proveedor |
| Recuperación de contraseña por correo | **Apagada** (sin SMTP); el administrador restablece la contraseña | Apagada | `SMTP_ENABLED` y credenciales SMTP |
| Telegram | **Desactivado** (CR-03); la librería no se carga | Desactivado | `TELEGRAM_ENABLED` (ignorada en esta versión) |

Los nombres de las variables se leyeron en Vercel sin descifrar sus valores.

## 3. Alcance evaluado

- **Dentro:** registro e inicio de sesión, política de contraseña, carteras, movimientos, transferencias, conversión de moneda, panel, presupuestos, recurrentes, deudas, metas, grupos, carga rápida, reportes y exportación, administración, IA de consulta, navegación y accesibilidad.
- **Fuera:** Telegram (desactivado para otra versión, CR-03), envío de correo (SMTP apagado en producción) y pruebas con usuarios reales.

## 4. Entornos de prueba

| Entorno | Uso | Datos |
|---|---|---|
| PGlite en memoria | Pruebas automáticas del backend (`npm test`) | Generados por cada prueba |
| PostgreSQL 16 local, base `af_baseline` | Línea base en `f3504d3` | Usuario ficticio `amigo@local.test` |
| PostgreSQL 16 local, base `af_after` (copia de la anterior con la migración aplicada) | Pruebas de sistema, accesibilidad, seguridad y carga | Mismo usuario ficticio y usuarios de carga `carga*@local.test` |
| Proveedor de tasas simulado (local, puerto 3199) | Pruebas de sistema | Tasas FICTICIAS: USD/EUR 0,9 y USD/MXN 18. El proxy del contenedor bloquea `api.frankfurter.dev` |
| Chromium (Playwright) | Capturas, axe, teclado y rendimiento | 1366×850, 390×844 y 320×640 |

No se usaron datos reales ni la base de producción en ninguna prueba.

## 5. Commits desde la línea base

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
- `dd5c808`, `b1102c9`: pulido visual y D-11 a D-14.
- `2590741`: moneda de visualización en cada módulo.
- `2445d2c`: nombres de cartera con letras (D-15).
- `e67cb13`, `a43c78f`: logo e inicio con Google primero.
- `d4badd7`, `05e0b01`, `c2d4c82`: D-16 a D-19 y retiro del botón de Telegram.
- `c9c33b4`: D-20 (publicado en `7c09956`).

El resto de los commits son de documentación y evidencias.

## 6. Desvíos respecto de la consigna

- **Ramas:** la consigna pide `feature/multidivisa`, `feature/redesign-ui`, `audit/baseline` y `audit/lab`. El entorno de trabajo solo autoriza a subir la rama `claude/project-thread-noiuro`, así que todo el trabajo está ahí, en commits pequeños con los prefijos pedidos.
- **Rama `audit/lab`:** no se creó porque no hizo falta sembrar defectos. Hubo 20 defectos reales (ver `04-registro-defectos.csv`).
- **Preview de Vercel:** el proyecto no tiene variables para Preview, así que una vista previa no tendría base de datos. Las pruebas de sistema y de carga se hicieron en local.
