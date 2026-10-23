# Asistente Financiero 2.2

## Interfaz y funciones

- Nuevo movimiento en ventana emergente con selección Gasto / Ingreso / Traspaso, categorías, saldo de cada cartera, cancelación y foco de teclado contenido en el formulario.
- Diario de movimientos con concepto, fecha, categoría, cartera y signo del importe, búsqueda y exportación.
- Formularios de creación, incluido Nuevo grupo, en ventanas emergentes. Los miembros se agregan por correo desde el grupo y deben tener cuenta con la misma moneda.
- Panel general con saldo destacado, distribución por cartera, ingresos y gastos fijos estimados por mes, deudas, cobros, presupuestos, metas, grupos y gráficos de ingresos/gastos y categorías por importe.
- Los cálculos estimados explican su fórmula y se distinguen de movimientos confirmados. Las cuentas compartidas no se suman automáticamente a los gastos personales.

## Validación y sesión

- Nombres personales con letras, espacios, guiones y apóstrofes; correo con formato válido; contraseña distinta del nombre, correo y usuario, de al menos 10 caracteres y máximo 72 bytes.
- Importes positivos con dos decimales y límites tanto en interfaz como en servidor. Los campos numéricos bloquean exponentes, signos y pegado de texto no numérico. Las descripciones admiten texto y números.
- Sesión absoluta de 30 minutos desde el inicio. La renovación no amplía el plazo. El navegador cierra la sesión y el servidor rechaza tokens vencidos, aunque se manipule el cliente.

## IA y Google

Groq se configura en Production mediante GROQ_API_KEY, AI_PROVIDER=groq y GROQ_MODEL. Las pruebas públicas incluyen una consulta con datos ficticios. Cada consulta transmite la pregunta y un resumen financiero a Groq; la interfaz lo informa y la IA no modifica movimientos.

Google usa el botón oficial y verifica el ID token en el servidor, incluyendo correo verificado. Se configura GOOGLE_ENABLED=true y GOOGLE_CLIENT_ID. Este flujo no requiere GOOGLE_CLIENT_SECRET. Los dominios publicados deben estar en Orígenes JavaScript autorizados en Google Cloud. El botón y el rechazo de tokens falsos se verifican; el inicio completo con una cuenta Google requiere la interacción de su titular.

No se incluyen credenciales en este paquete. La instalación local continúa usando su propia base, sin copiar datos personales de producción. Las evidencias de esta versión están en EVIDENCIAS_LOCALES/v2.2; las anteriores se conservan como antecedentes.

## Estado verificado el 23 de octubre de 2026

52 pruebas de backend, 38 de frontend y 13 comprobaciones HTTP públicas aprobadas; compilación de producción correcta. Groq respondió a una consulta con datos ficticios. En navegador se verificó un gasto de COP 3.500 y la persistencia del saldo resultante de COP 16.500 después de iniciar una nueva sesión, además de errores de formulario y la pantalla de sesión expirada.

Pendiente externo: Google todavía devolvió «The given origin is not allowed for the given client ID» tras la confirmación del usuario de que añadió ambos dominios al cliente correcto. No se considera aprobado el inicio completo con Google. Consultar verificacion-navegador.json para el alcance exacto de la evidencia; los 13 checks HTTP no equivalen a una prueba OAuth completa.
