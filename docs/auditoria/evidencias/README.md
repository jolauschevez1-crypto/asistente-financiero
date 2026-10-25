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
