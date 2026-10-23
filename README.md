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

Configura las variables privadas directamente en Vercel: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_JWT_SECRET` y, si utilizas IA, `GROQ_API_KEY`. Consulta los ejemplos sin secretos. No subas archivos `.env`, bases locales ni credenciales.

## Reglas del producto

- Una moneda por cuenta; no se convierten importes ni se permite cambiar la moneda después de registrar actividad financiera.
- Los recordatorios requieren confirmación; crear un recordatorio no mueve dinero.
- La carga rápida acepta hasta 30 gastos y guarda todo en una transacción. Los reintentos con la misma clave no duplican movimientos.
- El asistente IA es de consulta: no realiza movimientos ni pagos.
- Las sesiones duran 30 minutos desde el inicio; renovarlas no prolonga ese plazo.
- Google requiere configurar el Client ID y los orígenes autorizados. Su presencia en la interfaz no acredita que la autorización externa esté completada.

Las evidencias de auditoría académica se mantienen fuera del repositorio público. Los datos de prueba son ficticios.
