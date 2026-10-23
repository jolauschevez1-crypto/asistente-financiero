# Asistente Financiero 2.1

## Acceso público

https://asistente-financiero-jolauschevez1-cryptos-projects.vercel.app

Crea una cuenta propia y elige tu moneda al registrarte. La base pública es independiente de la base local. Las cuentas demo locales no existen en producción. La IA y las integraciones de correo, Telegram y Google permanecen desactivadas.

## Cambios

- Categorías mediante lista desplegable, con sugerencias y opción de categoría personalizada.
- Moneda por usuario: USD, COP, MXN, EUR, PEN, ARS y CLP. No se convierten importes. La moneda queda bloqueada tras actividad financiera para evitar cambiar el significado de saldos existentes.
- Los grupos de gastos compartidos requieren que sus miembros usen la misma moneda.
- Informes administrativos y exportaciones filtrados por moneda; fechas de gráficos sin desplazamiento de mes por zona horaria.
- Publicación en Vercel con PostgreSQL de Neon, secretos en variables del servidor y límites de solicitudes compartidos entre instancias.

## Uso local

Descomprime el paquete y ejecuta INICIAR_LOCAL.cmd. Consulta LEEME_LOCAL.md para requisitos e instrucciones. La instalación local conserva su almacenamiento independiente y funciona sin la base pública. No se incluye ninguna base personal ni archivo .env con credenciales.

## Evidencias y alcance

Las evidencias nuevas están en EVIDENCIAS_LOCALES/v2.1. Los archivos de v2.0 se conservan como antecedentes, no como resultados de esta versión. Las pruebas automatizadas y las comprobaciones HTTP públicas son conjuntos distintos. La verificación pública usa exclusivamente cuentas e importes ficticios. No equivale a una auditoría completa de seguridad ni a una prueba de carga.
