# Índice de evidencias

Cada evidencia tiene un ID, la fecha de captura (UTC), la versión del código, el entorno, el requisito o riesgo al que responde, el resultado y la ruta.
Los datos de prueba son ficticios (usuario `amigo@local.test`, base PostgreSQL local aislada). No hay datos de producción ni secretos.

| ID | Fecha | Versión | Entorno | Requisito / riesgo | Resultado | Ruta |
|---|---|---|---|---|---|---|
| EV-BASE-01 | 2026-10-25 05:31Z | f3504d3 | Local, PostgreSQL 16 | RF multidivisa: cambio de moneda | Reproduce la restricción: cambiar a EUR sin actividad da 200; tras crear una cartera, el API responde 409 MONEDA_BLOQUEADA y el trigger de BD rechaza el UPDATE directo | antes/local-f3504d3/EV-BASE-01-restriccion-moneda.log |
| EV-BASE-02 | 2026-10-25 | f3504d3 | Local, Chromium 1366×850 | Diseño y navegación (escritorio) | Seis capturas: login, panel, carteras, presupuestos, perfil, IA | antes/local-f3504d3/BASE-desktop-*.png |
| EV-BASE-03 | 2026-10-25 | f3504d3 | Local, Chromium 390×844 | Diseño responsive y menú móvil | Siete capturas, incluida la del menú abierto | antes/local-f3504d3/BASE-movil-*.png |
| EV-BASE-04 | 2026-10-25 | f3504d3 | Local, Chromium | Rendimiento percibido y errores de consola | Login 1097 ms (escritorio) y 759 ms (móvil); panel tras login 185 ms y 156 ms. Sin errores de consola. Cuatro peticiones ERR_ABORTED por vista, a verificar (hipótesis: cancelación por navegación) | antes/local-f3504d3/BASE-registro-navegador.json |

## Limitaciones

- La URL de producción no es accesible desde el contenedor de trabajo (proxy), así que la línea base se tomó localmente con el mismo commit que está desplegado en producción (f3504d3, despliegue `dpl_DXhimEwhkZdoV2Txosgmg6vmRwKT`).
- Las capturas "antes" de producción las aporta el usuario en la carpeta compartida `antes`; se incorporarán sin sobrescribir estas.
- Los tiempos son de una sola ejecución en local, no una medición estadística.

## Evidencias manuales reportadas por el usuario

| ID | Fecha | Versión | Entorno | Requisito / riesgo | Resultado | Fuente |
|---|---|---|---|---|---|---|
| EV-MAN-01 | 2026-10-25 05:45Z | f3504d3 (despliegue de producción vigente) | Producción, https://asistente-financiero-seven.vercel.app | Inicio de sesión con Google tras agregar el origen autorizado en Google Cloud | El usuario informa: "si me deja iniciar nomas sin fallos". No hay captura; la verificación es testimonial, no automatizada | Mensaje del usuario en el hilo del proyecto |

## Evidencias "después" (rediseño v3 y multidivisa)

Datos ficticios: usuario `amigo@local.test` en una copia local de la base de la línea base (`af_after`), con carteras de prueba en USD, EUR (nombre largo) y COP. Las tasas provienen de un proveedor simulado local con valores ficticios (USD/EUR 0,9 y USD/MXN 18, fecha de ayer); no son tasas reales del BCE, porque el proxy del contenedor bloquea api.frankfurter.dev. El código ejercitado es el mismo flujo de refresco perezoso que usa producción.

| ID | Fecha | Versión | Entorno | Requisito / riesgo | Resultado | Ruta |
|---|---|---|---|---|---|---|
| EV-DESP-01 | 2026-10-25 06:24Z | 7ba309a | Local, Chromium 1366×850 (tema oscuro por defecto y claro) | Rediseño, barra superior, panel multidivisa, modal Crear nueva cartera, conversión, transferencia | 12 capturas. Total parcial rotulado y COP mostrado aparte; sello de tasa con antigüedad; nombre largo visible | despues/local-7ba309a/DESP-desktop-*.png |
| EV-DESP-02 | 2026-10-25 06:24Z | 7ba309a | Local, Chromium 390×844 | Responsive y menú hamburguesa | 11 capturas, incluida la del menú a pantalla completa | despues/local-7ba309a/DESP-movil-*.png |
| EV-DESP-03 | 2026-10-25 06:24Z | 7ba309a | Local, Chromium | Rendimiento percibido y errores | Login 733 ms (escritorio) y 720 ms (móvil); panel tras login 174 ms y 177 ms. Sin errores de consola ni HTTP ≥400. Tres peticiones ERR_ABORTED tras el login (panel, carteras, categorías), por investigar | despues/local-7ba309a/DESP-registro-navegador.json |
| EV-SEG-01 | 2026-10-25 06:31Z | 015fed5 | Local, PostgreSQL 16 (copia af_after) | OWASP Top 10:2025 (A01, A02, A05, A06, A07, A08, A10) | 20 de 20 controles PASA: aislamiento entre usuarios (IDOR), sin token 401, JWT alg none rechazado, contraseñas débiles o con el nombre rechazadas, cron sin CRON_SECRET 401, CORS de origen ajeno 403, cabeceras de seguridad. Es un sondeo automatizado local, no una prueba de penetración | seguridad/EV-SEG-01-sondeo-owasp-015fed5.json, seguridad/owasp-probe.cjs |
| EV-SEG-02 | 2026-10-25 06:31Z | 015fed5 | Local, npm audit (BACKEND) | A03 Cadena de suministro | 2 moderadas: uuid <11.1.1 por exceljs. Riesgo aceptado: exceljs llama a uuidv4() sin buffer, que es la ruta no afectada por GHSA-w5hq-g745-h8pq; la corrección propuesta degrada exceljs a 3.4.0 | seguridad/EV-SEG-02-npm-audit-backend-015fed5.txt |
| EV-SEG-03 | 2026-10-25 06:31Z | 015fed5 | Local, npm audit (FRONTEND) | A03 Cadena de suministro | 0 vulnerabilidades | seguridad/EV-SEG-03-npm-audit-frontend-015fed5.txt |
| EV-SEG-04 | 2026-10-25 | sin cambio de código | Vercel, variables del proyecto (consultadas sin descifrar) | A02 Configuración de seguridad | Solo hay variables para Production; Preview y Development no tienen ninguna. CORS_ORIGINS apunta al dominio oficial. APP_ORIGIN apunta a otra URL del mismo proyecto en vercel.app (solo amplía la lista CORS, sin otro uso). CRON_SECRET no existe, así que el cron diario de tasas responde 401 y en producción las tasas no se actualizan solas | Consulta al panel de Vercel; sin archivo |
