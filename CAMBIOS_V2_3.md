# Versión 2.3 — diseño y carga rápida

- Panel con saldo principal, compromisos, resumen del mes, gastos fijos por categoría, balance disponible y confirmación individual de pagos pendientes.
- Diseño coherente en temas claro y oscuro, tipografía más legible, tarjetas con nombres de alto contraste y formularios en ventanas emergentes.
- Nueva cartera con saldo inicial tanto desde Carteras como desde Movimientos.
- Moneda siempre visible en la navegación, con acceso a las preferencias. Se conserva la regla de una moneda por cuenta; no se convierten saldos.
- Carga rápida desde Carteras y Movimientos. Admite hasta 30 gastos separados por coma, punto y coma o salto de línea, decimales con punto y sufijo `k` para miles.
- Vista previa antes de confirmar; guardado atómico, validación del saldo total, aislamiento por propietario y protección contra duplicados al reintentar. Categoría inicial: Otros.
- Pantalla de IA más compacta, con el aviso de uso de datos junto al estado del servicio.

## Validación

56 pruebas de servidor y 38 de frontend aprobadas. Compilación de producción correcta. En navegador local, dos gastos de 1.50 y 4.00 redujeron la cartera de 1387.50 a 1382.00 tras confirmar la vista previa.

Los cálculos del panel distinguen el saldo total del dinero fuera de las carteras de metas. Los compromisos incluyen el saldo de deudas por pagar y el próximo vencimiento activo de gastos fijos del mes seleccionado o anterior. No proyectan todas las ocurrencias futuras de una recurrencia.

Google sigue sujeto a la autorización de orígenes en su configuración externa; esta versión no declara resuelto el error OAuth observado en la versión anterior.
