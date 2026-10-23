# Asistente Financiero local 2.0 — cambios y verificación

Fecha de cierre: **20 de octubre de 2026**, zona America/Guayaquil.

Esta entrega implementa los módulos solicitados en una copia mejorada del programa. Se ejecuta en la computadora con Express, Angular y PostgreSQL embebido mediante PGlite. La IA queda desactivada, conforme al alcance acordado. La guía de instalación está en [LEEME_LOCAL.md](LEEME_LOCAL.md).

## Resultado de la verificación

| Comprobación | Aprobadas | Fallidas | Evidencia |
|---|---:|---:|---|
| Backend: lógica, HTTP, base de datos, concurrencia y seguridad | 37 | 0 | `EVIDENCIAS_LOCALES/backend-tests.log` |
| Frontend: regresión, validadores, sesión y navegación | 23 | 0 | `EVIDENCIAS_LOCALES/frontend-tests.log` |
| Comprobaciones HTTP sobre la instalación local en ejecución | 8 | 0 | `EVIDENCIAS_LOCALES/http-local.json` |
| Instalación limpia del ZIP, arranque y comprobaciones de sus datos iniciales | 8 | 0 | `EVIDENCIAS_LOCALES/instalacion-limpia.json` |
| Compilación de producción de la interfaz | Correcta | — | `EVIDENCIAS_LOCALES/frontend-build.log` |

Son **60 pruebas automatizadas de las suites y 8 comprobaciones HTTP adicionales**. No son 68 recorridos completos de navegador ni un porcentaje de cobertura del código. Las capturas documentan recorridos manuales y se relacionan con los requisitos de la siguiente tabla.

También se realizaron **8 comprobaciones de instalación limpia**: extracción nueva, instalación de dependencias, configuración y base propias, inicio de sesión, estado financiero inicial en cero, módulos vacíos, respaldo de 20 tablas y cierre correcto. Se usó el puerto 3002 para aislar esa prueba del programa de trabajo en 3001. El paquete final añade este resultado; los hashes de los archivos ejecutables probados se conservan en el JSON y coinciden con los del manifiesto final.

Algunas pruebas negativas provocan respuestas 400, 401, 403 o 409 de forma intencional. Sus mensajes de error en el log no representan fallos de la suite: el resultado se determina mediante las aserciones y el resumen de pruebas aprobadas/fallidas.

Entorno observado: Windows, Node.js 24.14.1, npm 11.12.1, Angular 20.3.25, PGlite 0.5.10 y Chrome Headless 155 para las pruebas de interfaz. Los registros conservan sus marcas de tiempo UTC: la ejecución automática terminó el 20 de octubre UTC, que corresponde a la noche del 19 de octubre en Ecuador. La comprobación HTTP y el reinicio final se realizaron el 20 de octubre en Ecuador.

## Trazabilidad de esta versión

Los identificadores `LOC-REQ` pertenecen a esta ampliación; no sustituyen los identificadores ni los resultados del expediente original.

| Requisito | Criterio verificable | Prueba o fuente ejecutable | Evidencia / resultado |
|---|---|---|---|
| LOC-REQ-01 Navbar y panel general | Navegación a todos los módulos; saldo igual a suma de carteras y neto mensual igual a ingresos menos gastos | `FRONTEND/src/app/app.spec.ts`; `BACKEND/tests/finance.test.js`; LOC-02 y LOC-04 | `UI-01-panel.png`, `UI-01-panel.txt`, `http-local.json`: 605 = 200 + 355 + 50; 605 = 700 − 95 |
| LOC-REQ-02 Carteras y movimientos | Apertura trazable; transferencias conservan el total; ningún usuario opera con carteras ajenas; transacciones impiden sobregiro | `BACKEND/tests/core.test.js` y `finance.test.js` | Suites aprobadas; `UI-02-carteras.png` |
| LOC-REQ-03 Grupos compartidos | Solo miembros acceden; propietario incorpora cuentas; reparto conserva cada centavo; liquidación no supera deuda | `BACKEND/tests/finance.test.js`, caso de grupos | Suite aprobada; `UI-09-grupo.png` y `.txt`: gasto 10,01 repartido en 5,01 + 5,00 |
| LOC-REQ-04 Presupuestos | Límite por categoría y mes; exceso visible; mes calculado en hora de Ecuador | `BACKEND/tests/finance.test.js`, presupuestos, panel y límites de mes | `UI-06-presupuesto.png`: gasto 70, límite 60, exceso 10 |
| LOC-REQ-05 Ingresos y gastos fijos | No crean movimientos sin confirmar; una fecha no se duplica; conserva el día de referencia mensual | `BACKEND/tests/finance.test.js`, recurrencias y reintentos | Suite aprobada; `UI-05-recordatorio.png`: siguiente vencimiento 19/11/2026 |
| LOC-REQ-06 Deudas | Crear deuda no mueve dinero; abono modifica saldo y pendiente una sola vez; no permite sobrepago | `BACKEND/tests/finance.test.js`, deudas, pagos y cobros | Suite aprobada; `UI-04-abono.png`: deuda 100, abono 25, pendiente 75 |
| LOC-REQ-07 Metas de ahorro | Aporte es transferencia a cartera dedicada; no aumenta el saldo total ni supera el objetivo | `BACKEND/tests/finance.test.js`, meta | `UI-03-meta.png` y `.txt`: ahorro 50 de 200, avance 25 % |
| LOC-REQ-08 Validación y sesiones | Contraseña distinta de la identidad; importes y fechas válidos; acceso y recuperación caducados no autorizan; no se revelan errores SQL | `BACKEND/tests/core.test.js`, `errors.test.js`; `FRONTEND/src/app/core/input-validation.spec.ts`, `auth.interceptor.spec.ts`; LOC-07 | Suites aprobadas; petición sin sesión devuelve 401 |
| LOC-REQ-09 Accesibilidad y alertas | Navbar utilizable por teclado, salto al contenido, tema oscuro, texto grande, alto contraste y mensajes visibles | `FRONTEND/src/app/app.spec.ts`; comprobación visual manual | `UI-07-tema-oscuro.png`, `UI-08-accesibilidad.png`; no constituye certificación WCAG |
| LOC-REQ-10 Respaldo completo | Incluye módulos nuevos; valida formato e integridad; un error revierte la restauración; solo administra el rol autorizado | `BACKEND/tests/backup-local.test.cjs`; LOC-08 | 3 pruebas aprobadas; exportación HTTP de versión 2 con 20 tablas; usuario normal recibe 403 |
| LOC-REQ-11 Funcionamiento local | Escucha en 127.0.0.1:3001; base persistente local; IA apagada; no necesita servicios externos para finanzas | `BACKEND/tests/ia-local.test.cjs`, `core.test.js`; LOC-01, LOC-02, LOC-06; lanzador | Suites aprobadas; reinicio conserva saldo 605; `inicio-local.txt` |

Cada archivo de prueba contiene las aserciones y los datos que originan su resultado. El inventario `resultados-automatizados.json` relaciona los nombres de las 60 pruebas con la suite de backend o frontend; los logs son la fuente de esos resultados.

## Cambios relevantes y defectos corregidos

| Problema o riesgo | Cambio realizado | Comprobación |
|---|---|---|
| El programa dependía de configuración y base externas | PGlite persistente, esquema completo, cuentas ficticias, configuración local generada y lanzador Windows | Arranque y reinicio; LOC-01 a LOC-06 |
| Navegación lateral y ausencia de módulos solicitados | Navbar adaptable, panel y siete áreas financieras integradas | Recorridos manuales, app.spec.ts y finance.test.js |
| Operaciones simultáneas podían comprometer saldos | Operaciones contables transaccionales, validación en servidor y comprobación de propietario | Dos gastos de 80 sobre saldo 100: solo uno se acepta; prueba de concurrencia |
| Reintentos podían duplicar operaciones financieras | Confirmación explícita e identificadores de operación para fijos, abonos, aportes y gastos compartidos | Pruebas de concurrencia e idempotencia |
| Cambiar o borrar movimientos vinculados podía romper otros módulos | Protección de movimientos de apertura, fijos, deudas y metas frente a edición genérica | Prueba de movimiento vinculado |
| Recuperación y cambio de contraseña necesitaban protección adicional | Token de recuperación temporal de un uso; validación de contraseña actual; revocación de sesiones y protección del último administrador | core.test.js y auth.interceptor.spec.ts |
| El respaldo antiguo no incluía todos los módulos | Formato 2 con esquema, 20 tablas, checksum y restauración transaccional | backup-local.test.cjs y LOC-08 |
| Los errores técnicos podían revelar detalles internos | Respuestas públicas controladas para validación, integridad y fallos internos | errors.test.js |
| Resultados HTTP no se pintaban inmediatamente en los módulos nuevos | Notificación de actualización de la vista tras finalizar las solicitudes | Recorridos de creación, aporte, abono y confirmación |
| La optimización CSS de producción impedía cargar estilos bajo CSP | Desactivación de inlineCritical y recursos de fuente locales | LOC-02 y comprobación visual de temas/contraste |
| CSV podía separar mal campos o interpretar fórmulas | Escape de comillas/separadores y neutralización de fórmulas en todas las columnas | quality-regression.spec.ts |

La fecha de nacimiento es **opcional** y se valida como fecha real no futura. No se impuso una edad mínima porque no existe un requisito confirmado para ello. Las opciones externas apagadas muestran su estado; no se inventan respuestas de IA ni envíos de correo.

## Recorridos manuales reproducibles

Precondición: iniciar una instalación local, entrar como `demo@local.test` y usar exclusivamente datos ficticios. En una instalación limpia las cuentas empiezan en cero. Las capturas corresponden a la instalación de trabajo; **su base de datos no se incluye en el ZIP**.

| Caso | Pasos y datos | Resultado esperado y observado | Evidencia |
|---|---|---|---|
| MAN-01 Apertura | Carteras → crear “Demostración local”, saldo inicial 500 | Cartera con 500 y apertura trazable en ingresos | Suite de apertura; `UI-02-carteras.png` muestra el saldo posterior a los demás casos |
| MAN-02 Ahorro | Metas → “Fondo de emergencia”, objetivo 200 → aportar 50 desde la cartera anterior | Origen 450, ahorro 50, total conservado en 500 y avance 25 % | `UI-03-meta.png`, prueba de meta |
| MAN-03 Reparto | Grupos → crear grupo, agregar `amigo@local.test` → registrar “Almuerzo de prueba”, 10,01 | Reparto 5,01 + 5,00; carteras personales sin cambios | `UI-09-grupo.png`, `.txt`, prueba de grupos |
| MAN-04 Abono | Deudas → obligación por pagar 100 → confirmar abono 25 desde Demostración local | Pendiente 75; cartera baja de 450 a 425 | `UI-04-abono.png`, prueba de deuda |
| MAN-05 Recordatorio | Presupuesto Servicios 60 en octubre; fijo de gasto Servicios 70 con vencimiento 19/10/2026 → confirmar en diálogo | Un gasto de 70; cartera 355; siguiente fecha 19/11/2026 y no admite confirmar antes del vencimiento | `UI-05-recordatorio.png`, pruebas de recurrencia |
| MAN-06 Alerta | Abrir presupuesto de Servicios y panel | Consumo 70/60, 116,67 %, exceso 10 | `UI-06-presupuesto.png`, `UI-01-panel.png` |
| MAN-07 Apariencia | Activar tema oscuro, texto grande y alto contraste; después restablecer texto/contraste | Controles y contenido cambian visualmente; quedan legibles y con foco visible | `UI-07-tema-oscuro.png`, `UI-08-accesibilidad.png` |
| MAN-08 Persistencia | Detener y volver a iniciar con INICIAR_LOCAL; consultar panel, metas y grupo | Se conserva el estado final; no se crean otra vez las cuentas ni se pierden saldos | `inicio-local.txt`, LOC-04, capturas finales |

En la instalación también se registró un ingreso ficticio adicional de 200 en Efectivo y otro gasto compartido de 1. Esto explica el estado final: carteras 200 + 355 + 50 = **605**; ingresos 700 y gastos 25 + 70 = **95**; saldo a favor en el grupo **5,50**. El gasto compartido se registra por separado y no afecta a las carteras. Las capturas del grupo muestran ambos gastos.

Los casos del 19 de octubre son históricos: si se repiten en otro mes, usar el mes y vencimiento adecuados, manteniendo las mismas reglas y cifras. El panel muestra el mes seleccionado; no hay que confundirlo con el saldo acumulado de las carteras.

## Repetir la verificación

1. Con Node instalado, ejecutar `npm ci` en BACKEND y FRONTEND si faltan sus dependencias.
2. En BACKEND: `npm test`. Las pruebas usan bases en memoria separadas de los datos del usuario.
3. En FRONTEND: `npm test -- --watch=false --browsers=ChromeHeadless` y `npm run build`. Si hace falta, definir `CHROME_BIN` con la ruta de Chrome instalado.
4. Iniciar el programa con `INICIAR_LOCAL.cmd`.
5. En BACKEND: `node scripts/verify-local.cjs`. Emplea las cuentas ficticias por defecto; si se cambiaron sus contraseñas, admite variables `TEST_EMAIL`, `TEST_PASSWORD`, `TEST_ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD`. El script consulta datos y exporta un respaldo solo a memoria; no restaura ni modifica los movimientos. Los inicios de sesión pueden generar registros normales de acceso.
6. Consultar `EVIDENCIAS_LOCALES/http-local.json`. Una instalación nueva tiene saldos cero; la prueba verifica consistencia, no exige el saldo de la captura.

La prueba de restauración destructiva se ejecutó únicamente contra una base en memoria. En la instalación con datos se verificó la exportación y los permisos; no se sustituyeron los datos del usuario.

## Alcance y relación con la entrega académica

Hay evidencia favorable para **usar y demostrar esta versión en modo local con cuentas ficticias**. La IA sigue pendiente; no se comprobaron servicios externos, pagos bancarios, despliegue multiusuario remoto, cargas de producción ni cumplimiento completo de WCAG. Los grupos son un registro contable, no un sistema de transferencias reales.

Los archivos Word, Excel y PowerPoint de la auditoría original se conservan en la carpeta `outputs` del trabajo. Sus defectos, métricas y decisión NO-GO describen aquella versión. Este anexo no cambia esa decisión de forma automática ni afirma que todo el expediente académico haya sido actualizado a la versión 2.0. Para la defensa, distinguir la línea base auditada de la copia corregida y mostrar las pruebas de regresión correspondientes.

El archivo `EVIDENCIAS_LOCALES/manifest-sha256.json` identifica por hash los archivos incluidos en esta entrega, salvo el propio manifiesto. El ZIP excluye claves privadas, dependencias instaladas y bases de datos de trabajo.
