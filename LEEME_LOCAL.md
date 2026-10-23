# Asistente Financiero · versión local 2.0

Aplicación en español para organizar finanzas personales con dólares (USD). El servidor y la base de datos se ejecutan en tu computadora. No necesita Neon, Docker, PostgreSQL instalado, servicios de correo ni claves de IA.

## Abrir en Windows

1. Descomprime el ZIP en una carpeta propia. No ejecutes los archivos desde dentro del ZIP.
2. Instala **Node.js 24** desde [nodejs.org](https://nodejs.org/) si todavía no está instalado. También se admite la rama 22 desde 22.12; Node 23 no es compatible con la reconstrucción de esta interfaz.
3. Haz doble clic en **INICIAR_LOCAL.cmd**. La primera instalación descarga las dependencias y requiere Internet; los usos posteriores funcionan sin Internet.
4. Se abrirá **http://127.0.0.1:3001**. Deja abierta la ventana del servidor mientras utilizas el programa. Para detenerlo, presiona **Ctrl+C** en esa ventana.

El paquete incluye la interfaz compilada. Si se cambia el código del frontend, ejecuta `powershell -NoProfile -ExecutionPolicy Bypass -File .\INICIAR_LOCAL.ps1 -Reconstruir` con el servidor detenido. La reconstrucción requiere instalar dependencias del frontend la primera vez.

## Cuentas ficticias

| Perfil | Correo | Contraseña inicial |
|---|---|---|
| Usuario | demo@local.test | DemoLocal2026! |
| Segundo usuario, para grupos | amigo@local.test | AmigoLocal2026! |
| Administrador | admin@local.test | AdminLocal2026! |

Estas cuentas son para demostración académica, con saldos iniciales en cero. La siembra crea las cuentas que falten y conserva las contraseñas y los datos existentes. También puedes crear tu propia cuenta desde el inicio. Al cambiar una contraseña se cierran las sesiones anteriores.

## Funciones disponibles

- **Panel:** saldo total, ingresos, gastos y resultado del mes, carteras, alertas, presupuestos y metas.
- **Carteras y movimientos:** ingreso de apertura, ingresos, gastos, transferencias, historial y exportación. Las transferencias no cuentan como ingreso o gasto. Se impiden saldos negativos y operaciones sobre carteras ajenas.
- **Grupos:** miembros por correo de cuentas locales, reparto igualitario hasta el último centavo y registro de liquidaciones. Es un registro contable compartido: **no mueve dinero de carteras ni ejecuta pagos bancarios**. Solo el propietario incorpora miembros.
- **Presupuestos:** límite por categoría y mes, consumo, disponible y alerta por exceso.
- **Fijos:** recordatorios semanales, mensuales o anuales de ingresos y gastos. Solo se registran cuando confirmas el vencimiento. Volver a confirmar la misma fecha no duplica el movimiento. Enero 31 conserva el día original en meses posteriores.
- **Deudas:** obligaciones por pagar o cobrar y abonos desde una cartera, con historial. No se permite pagar más de lo pendiente.
- **Metas:** cartera de ahorro dedicada y aportes como transferencias. El saldo de ahorro sigue formando parte de tu saldo total.
- **Cuenta:** validación de contraseña, sesión expirada, perfil y avatar PNG/JPEG local de hasta 2 MB. La fecha de nacimiento es opcional; se valida que sea real y no futura, sin imponer mayoría de edad.
- **Accesibilidad:** navegación por teclado, enlace para saltar al contenido, tema claro/oscuro, texto grande y alto contraste.
- **Administración:** usuarios, estadísticas, auditoría y respaldo/restauración completa en JSON versión 2.

Los movimientos generados por apertura, recordatorios, abonos y aportes conservan vínculos con sus módulos y no se pueden editar o borrar desde el historial genérico. Deudas y metas con actividad conservan su historial; los recordatorios se desactivan. Los cambios destructivos requieren confirmación visible.

## Dónde se guardan los datos

- Base PostgreSQL embebida (PGlite): `BACKEND/data/local/`.
- Configuración privada de esta instalación: `BACKEND/.env`. Se genera automáticamente con secretos JWT aleatorios y servicios externos apagados.
- Respaldo: entra como administrador → Configuración → Descargar respaldo. Incluye también los módulos nuevos. Para restaurarlo, carga un respaldo versión 2 y escribe **RESTAURAR**. La restauración reemplaza los datos actuales dentro de una transacción; si falla una validación, se conserva el estado anterior. Límite de carga: 20 MB.

No borres `BACKEND/data/local` ni ejecutes dos servidores sobre la misma carpeta de datos. El programa detecta una segunda instancia. Para copiar la base como carpeta, detén primero el servidor y conserva toda la carpeta. El respaldo descargado contiene información privada y hashes de contraseñas; guárdalo de forma segura.

## Recuperar acceso sin correo

Como no hay servicio de correo, la recuperación por email muestra que está desactivada. Un administrador puede restablecer la contraseña desde Usuarios. Si tampoco puedes entrar como administrador:

1. Detén el servidor.
2. Abre una terminal en `BACKEND`.
3. Ejecuta `npm run password:local -- admin@local.test` e introduce una contraseña nueva. La entrada se muestra en esa terminal local.
4. Inicia el programa otra vez.

## Desarrollo y pruebas

Desde `BACKEND`: `npm ci`, `npm test`, `npm run db:init`, `npm run db:seed`, `npm start`.

Desde `FRONTEND`: `npm ci`, `npm run build`, `npm test -- --watch=false --browsers=ChromeHeadless`. Para desarrollo: `npm start`, que abre el servidor de desarrollo en `http://127.0.0.1:4201` y redirige `/api` al backend local 3001. Si Karma no detecta Chrome, define `CHROME_BIN` con la ruta de `chrome.exe`.

Las pruebas del backend crean bases temporales en memoria; no modifican tus datos. Los comandos `db:init`, `db:seed` y `password:local` requieren detener el servidor. Los resultados de esta versión se documentan por separado en `EVIDENCIAS_LOCALES` y `CAMBIOS_Y_PRUEBAS.md`.

## Alcance de esta entrega

La IA quedó pendiente por decisión del usuario. Groq, Telegram, Google OAuth, Cloudinary y SMTP están desactivados; los datos y fotos se guardan localmente. No se realizó despliegue ni migración de la base en la nube. Las claves compartidas en la conversación no se incluyen en el paquete.

El cambio a navbar y los módulos nuevos pertenecen a esta versión mejorada. El informe académico de la versión original permanece separado: sus métricas y su decisión de liberación no se sustituyen automáticamente por los resultados de estas pruebas. Esta entrega es una demostración local verificada, no una certificación para producción ni para operaciones bancarias reales.
