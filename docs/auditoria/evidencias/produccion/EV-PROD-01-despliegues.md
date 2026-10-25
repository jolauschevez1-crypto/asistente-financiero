# EV-PROD-01 · Despliegues a producción y verificación técnica

Proyecto de Vercel `asistente-financiero` (`prj_rywIXFBeQO5WCjrl6ULyQLqWlRQk`), dominio https://asistente-financiero-seven.vercel.app.
Consultado con la API de Vercel (lista de despliegues, registro de build) y con peticiones a la URL oficial el 2026-10-25. Cada fusión a `main` se hizo con el OK escrito del usuario en el hilo del proyecto.

| Fecha (UTC) | Commit en main | PR | Despliegue | Estado | Qué se publicó | Verificación |
|---|---|---|---|---|---|---|
| 2026-10-25 15:10 | `d185b19` | #1 | `dpl_GC6FGda4m496ifMon6arsVPSxnaa` | READY | Multidivisa, rediseño, política de contraseña, D-01..D-10 | Registro de build: "Esquema público verificado" (la migración aditiva se aplicó en Neon). `/api/health` UP, versión 3.0.0 |
| 2026-10-25 16:37 | `b24d805` | #2 | `dpl_AL2F2t2Y1WKMN4gpEzNbhJyZWd27` | READY | Pulido visual, D-11..D-14, CR-04 | `main-QR2SU4ZC.js` y `styles-DCLTPGYM.css` iguales al build local probado. `/api/health` UP |
| 2026-10-25 17:41 | `7192a02` | #3 | `dpl_3LdAvGHSabMtSSp94rE6nWqnf51d` | READY | D-15 (crear cartera) y logo propio | `index.html` carga `main-EB6ACJLE.js`, igual al build local probado; `/favicon.svg` 200 `image/svg+xml`; `/api/health` UP (17:39Z) |
| 2026-10-25 17:48 | `5514da0` | #4 | `dpl_6ErENcDY1tUXAxgrVnip4Z1KRFSC` | READY | Login: botón de Google primero (CR-05) | `index.html` carga `main-KT33EXTE.js`, igual al build local probado (17:50Z) |

## Qué demuestra y qué no

- **Demuestra:** que cada versión probada en local es la que corre en producción (mismo nombre de paquete con hash de contenido), que la migración se aplicó sin error y que la API responde.
- **No demuestra** (sigue pendiente): la tasa real de Frankfurter con fecha ≤ 4 días (CP-13), el cron autorizado con respuesta 200 (D-08), el LCP móvil en la URL oficial (CP-40) y que crear «Ecuabet» funciona en producción tras D-15. Estas comprobaciones necesitan una sesión iniciada en producción, y este trabajo no usa la cuenta ni los datos reales del usuario. Los registros de ejecución de Vercel (plan Hobby) solo se conservan 1 hora y en las consultas de las 16:38Z y 17:05Z no apareció la llamada del cron.
- **Uso real reportado por el usuario:** el usuario envió capturas de la aplicación en producción con la sesión iniciada (diálogo «Nueva cartera» y pantalla de login). Son testimoniales y no se archivan porque pueden contener datos personales.

## Vistas previas (Preview)

Los despliegues de vista previa de cada PR fallan a propósito: `prepare-cloud.cjs` exige `DB_ENGINE=postgres` y `DATABASE_URL`, y el proyecto solo tiene variables de Production para no conectar previews a la base real. Comentado en los PR #2 y #3.
