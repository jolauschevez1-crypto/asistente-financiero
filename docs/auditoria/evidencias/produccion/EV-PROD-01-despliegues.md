# EV-PROD-01 · Despliegues a producción y verificación técnica

Proyecto de Vercel `asistente-financiero` (`prj_rywIXFBeQO5WCjrl6ULyQLqWlRQk`), dominio https://asistente-financiero-seven.vercel.app.
Consultado con la API de Vercel (lista de despliegues, registro de build) y con peticiones a la URL oficial el 2026-10-25, el 2026-10-27 y el 2026-10-28. Cada fusión a `main` se hizo con autorización escrita del equipo.

| Fecha (UTC) | Commit en main | PR | Despliegue | Estado | Qué se publicó | Verificación |
|---|---|---|---|---|---|---|
| 2026-10-25 15:10 | `d185b19` | #1 | `dpl_GC6FGda4m496ifMon6arsVPSxnaa` | READY | Multidivisa, rediseño, política de contraseña, D-01..D-10 | Registro de build: "Esquema público verificado" (la migración aditiva se aplicó en Neon). `/api/health` UP, versión 3.0.0 |
| 2026-10-25 16:37 | `b24d805` | #2 | `dpl_AL2F2t2Y1WKMN4gpEzNbhJyZWd27` | READY | Pulido visual, D-11..D-14, CR-04 | `main-QR2SU4ZC.js` y `styles-DCLTPGYM.css` iguales al build local probado. `/api/health` UP |
| 2026-10-25 17:41 | `7192a02` | #3 | `dpl_3LdAvGHSabMtSSp94rE6nWqnf51d` | READY | D-15 (crear cartera) y logo propio | `index.html` carga `main-EB6ACJLE.js`, igual al build local probado; `/favicon.svg` 200 `image/svg+xml`; `/api/health` UP (17:39Z) |
| 2026-10-25 17:48 | `5514da0` | #4 | `dpl_6ErENcDY1tUXAxgrVnip4Z1KRFSC` | READY | Login: botón de Google primero (CR-05) | `index.html` carga `main-KT33EXTE.js`, igual al build local probado (17:50Z) |
| 2026-10-27 03:32 | `5c7c8c5` | #5 | `dpl_BoCAWYRVjLJ9vHCyVbqGBw3MH81n` | READY | D-16 a D-19 y retiro del botón de Telegram (CR-06) | `index.html` carga `main-G7GWPR2K.js`, igual al build local probado; `/api/health` UP (03:33:50Z) |
| 2026-10-28 01:14 | `7c09956` | #6 | `dpl_goBVsNb2nDbm8dZdALLhp8V9zSao` | READY | D-20 (mensajes sin «modo local») y expediente final | `index.html` carga `main-R4RK5IAX.js`, igual al build local de `7c09956`; `chunk-NKXK2436.js` servido contiene el texto nuevo del perfil; `/api/health` UP (01:14:22Z). Los mensajes del servidor de D-20 responden a peticiones POST y no se comprobaron en producción |

## Qué demuestra y qué no

- **Demuestra:** que cada versión probada en local es la que corre en producción (mismo nombre de paquete con hash de contenido), que la migración se aplicó sin error y que la API responde.
- **No demuestra** (sigue pendiente): la tasa real de Frankfurter con fecha ≤ 4 días (CP-13), el cron autorizado con respuesta 200 (D-08), el LCP móvil en la URL oficial (CP-40) y que crear «Ecuabet» funciona en producción tras D-15. Tampoco demuestra D-11 a D-19 con sesión (D-09 se verificó el 2026-10-28 en las variables de Vercel, EV-SEG-04). Estas comprobaciones necesitan una sesión iniciada en producción con la cuenta de prueba, que no estuvo disponible desde el entorno de verificación: el dominio no responde desde ese entorno y la contraseña de la cuenta no se guardó en el expediente. Los registros de ejecución de Vercel (plan Hobby) solo se conservan 1 hora y en las consultas de las 16:38Z y 17:05Z del 2026-10-25 y de las 16:46Z del 2026-10-28 no apareció la llamada del cron. En el plan Hobby el cron puede ejecutarse en cualquier minuto de la hora programada, así que la ausencia no prueba que falle.
- **Uso real en producción:** el equipo tomó capturas de la aplicación en producción con la sesión iniciada (diálogo «Nueva cartera» con el error de D-15 y pantalla de login). No se archivan porque muestran datos personales; D-15 se reprodujo en local (EV-D15-01).

## Vistas previas (Preview)

Los despliegues de vista previa de cada PR fallan a propósito: `prepare-cloud.cjs` exige `DB_ENGINE=postgres` y `DATABASE_URL`, y el proyecto solo tiene variables de Production para no conectar previews a la base real. Comentado en los PR #2 y #3.
