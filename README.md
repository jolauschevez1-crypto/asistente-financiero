# Asistente Financiero

Aplicación de finanzas personales con Angular y Express: carteras, movimientos, carga rápida con vista previa, presupuestos, recordatorios, deudas, metas, grupos y asistente Groq.

## Desarrollo local

1. Instala Node.js 24.
2. Ejecuta `npm ci --prefix BACKEND` y `npm ci --prefix FRONTEND`.
3. Copia `BACKEND/.env.example` a `BACKEND/.env` y configura secretos locales nuevos.
4. Ejecuta `npm run db:init --prefix BACKEND`.
5. Ejecuta `npm run build --prefix FRONTEND` y `npm start --prefix BACKEND`.

También puedes utilizar `INICIAR_LOCAL.cmd`. Consulta `LEEME_LOCAL.md` para detalles. La base local usa PostgreSQL embebido (PGlite); producción requiere PostgreSQL persistente.

## Pruebas

```sh
npm test --prefix BACKEND
npm test --prefix FRONTEND -- --watch=false --browsers=ChromeHeadless
npm run build --prefix FRONTEND
```

## Publicación en Vercel

El proyecto incluye `vercel.json`. Conecta este repositorio al proyecto existente de Vercel y utiliza `main` como rama de producción. Los commits a `main` publicarán los cambios una vez configurada la integración Git.

Configura las variables privadas directamente en Vercel: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_JWT_SECRET`, `CRON_SECRET` y, si utilizas IA, `GROQ_API_KEY`. Consulta los ejemplos sin secretos. No subas archivos `.env`, bases locales ni credenciales.

## Reglas del producto

- Multidivisa: cada cartera tiene su propia moneda. El panel usa USD por defecto y el usuario elige la moneda de presentación (USD, EUR o MXN, las que tienen tasa de referencia). Cambiarla solo cambia la valoración mostrada, nunca los importes guardados.
- Tasas de referencia del BCE vía Frankfurter, actualizadas una vez al día por un cron de Vercel (`CRON_SECRET`); no son tasas en tiempo real. Si el proveedor falla se usa la última tasa válida y se muestra su antigüedad; sin tasa, los saldos se muestran por separado y el total se rotula como parcial.
- Los importes históricos se valoran con la tasa de su fecha. Convertir la moneda de una cartera exige vista previa y confirmación, queda registrado con tasa, fuente y fecha, y se hace en una sola transacción.
- Contraseñas de al menos 10 caracteres con mayúscula, minúscula, número y carácter especial, sin espacios y sin contener el nombre ni el correo.
- Los recordatorios requieren confirmación; crear un recordatorio no mueve dinero.
- La carga rápida acepta hasta 30 gastos y guarda todo en una transacción. Los reintentos con la misma clave no duplican movimientos.
- El asistente IA es de consulta: no realiza movimientos ni pagos.
- Las sesiones duran 30 minutos desde el inicio; renovarlas no prolonga ese plazo.
- Google requiere configurar el Client ID y los orígenes autorizados. Su presencia en la interfaz no acredita que la autorización externa esté completada.

El expediente de auditoría está en `docs/auditoria` (sin secretos ni datos reales). Los datos de prueba son ficticios.
