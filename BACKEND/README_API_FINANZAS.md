# Contrato de finanzas

Base `/api/finanzas`; todas las rutas requieren Bearer. Respuestas `{success:true,data:...}`; error `{success:false,message,code}`. Importes en la moneda elegida por el usuario, máximo 2 decimales. Las fechas son `YYYY-MM-DD`; los meses `YYYY-MM`. IDs numéricos. Nunca se acepta usuario propietario enviado por el cliente.

## Moneda por usuario

- Monedas disponibles: `USD`, `COP`, `MXN`, `EUR`, `PEN`, `ARS` y `CLP`. El registro admite `moneda`; omitirla conserva USD como valor predeterminado. Login y perfil devuelven `moneda`.
- GET `/preferencias`: `{moneda,puede_cambiar,motivo,monedas:[{codigo,nombre}]}`.
- PATCH `/preferencias` con `{moneda:'COP'}` cambia la moneda únicamente antes de registrar actividad financiera o pertenecer a un grupo. No aplica conversiones ni altera cifras. Una cartera vacía por sí sola permite elegir otra moneda.
- El primer movimiento, saldo distinto de cero, presupuesto, fijo, deuda, meta o grupo fija la moneda. El bloqueo es permanente aunque después se borre el registro, y los triggers de PostgreSQL usan la misma fila del usuario que el cambio de preferencias para serializar escrituras concurrentes.
- Los grupos conservan la moneda de su creador y solo admiten miembros con esa misma moneda.
- Administración: `?moneda=COP` en `/api/reportes/web/dashboard-admin`, `/api/reportes/web/metricas-globales`, `/api/reportes/admin/generar`, `/api/reportes/admin/exportar`, `/api/movimientos/admin/todos` y `/api/movimientos/admin/exportar`. Predeterminado USD; las consultas filtran antes de sumar. Las respuestas y exportaciones identifican la divisa.

## Consultas

- GET `/panel?mes=2026-10`: `{moneda,mes,saldo_total,ingresos,gastos,neto,carteras,presupuestos,recurrentes,deudas,metas,grupos,alertas}`. Importes como strings salvo porcentajes.
- GET `/carteras`: `[{id,nombre,saldo_actual}]`; usa cuentas del sistema.
- GET `/categorias`: `[{id,nombre}]` globales y propias.
- GET `/presupuestos?mes=YYYY-MM`: `[{id,categoria_id,categoria,mes,limite,gastado,restante,porcentaje}]`.
- GET `/recurrentes`: `[{id,nombre,tipo,monto,categoria_id,cuenta_id,cuenta,categoria,frecuencia,proxima_fecha,activo,vencido}]`.
- GET `/deudas`: `[{id,nombre,contraparte,tipo,monto,fecha_vencimiento,pagado,pendiente,estado}]`, tipos `PAGAR`/`COBRAR`.
- GET `/metas`: `[{id,nombre,objetivo,fecha_objetivo,cuenta_id,cuenta,ahorrado,restante,porcentaje}]`.
- GET `/grupos`: `[{id,nombre,propietario_id,miembros,total_gastos}]`.
- GET `/grupos/:id`: `{grupo:{id,nombre,propietario_id},miembros:[{id,nombre,correo,saldo}],gastos:[{id,descripcion,monto,pagador_id,fecha,participaciones:[{usuario_id,monto}]}],liquidaciones:[{id,desde_id,hacia_id,monto,fecha}]}`. Saldo positivo: le deben; negativo: debe. Todos los miembros ven únicamente su grupo.

## Escrituras

- POST `/carteras` `{nombre,saldo_inicial?}`. Opcional saldo inicial >=0 crea ingreso de apertura trazable; predeterminado cero.
- POST `/presupuestos` `{categoria_id,mes,limite}`. Uno por categoría/mes/usuario.
- PUT `/presupuestos/:id` `{limite}`; DELETE `/presupuestos/:id`.
- POST `/recurrentes` `{nombre,tipo:'INGRESO'|'GASTO',monto,categoria_id,cuenta_id,frecuencia:'SEMANAL'|'MENSUAL'|'ANUAL',proxima_fecha}`. Solo recordatorio, no crea movimiento.
- PUT `/recurrentes/:id` mismos campos que creación (reemplazo completo); DELETE `/recurrentes/:id` desactiva.
- POST `/recurrentes/:id/confirmar` `{fecha_prevista:'YYYY-MM-DD',confirmar:true}`. Solo cuando vence, registra una única vez esa fecha y avanza siguiente vencimiento; repetición devuelve mismo movimiento `{movimiento_id,proxima_fecha,repetido}`. Meses respetan día original (31enero→28febrero→31marzo).
- POST `/deudas` `{nombre,contraparte,tipo:'PAGAR'|'COBRAR',monto,fecha_vencimiento?}`. Registra obligación, no duplica dinero en cartera.
- POST `/deudas/:id/abonos` `{monto,cuenta_id,idempotencia}`. Pago PAGAR crea gasto, COBRAR ingreso. No admite exceder pendiente. `idempotencia`: UUID/texto 8–80 caracteres único por operación, reutilizar al reintentar la misma operación. Devuelve `{id,movimiento_id,monto,repetido}`.
- GET `/deudas/:id/abonos`: historial de abonos propios.
- DELETE `/deudas/:id`: únicamente sin abonos.
- POST `/metas` `{nombre,objetivo,fecha_objetivo?}`. Crea cartera dedicada de ahorro con cero; forma parte del saldo total.
- POST `/metas/:id/aportes` `{monto,cuenta_id,idempotencia}`. Transfiere de cartera origen propia a cartera de la meta; no es gasto ni ingreso. La meta muestra saldo real de su cartera y no permite superar objetivo en este aporte. Idempotencia igual que abonos.
- GET `/metas/:id/aportes`: historial propio de aportes.
- DELETE `/metas/:id`: solamente si saldo y número de aportes son cero; conserva cartera existente.
- POST `/grupos` `{nombre}`: creador pasa a ser miembro y propietario.
- POST `/grupos/:id/miembros` `{correo}`: propietario agrega cuenta existente por correo exacto. Acción local, no envía mensajes.
- POST `/grupos/:id/gastos` `{descripcion,monto,fecha?,idempotencia}`: el usuario autenticado registra que él pagó; reparte en partes iguales entre miembros actuales. Centavos residuales se asignan por ID ascendente. No altera carteras, pues es contabilidad compartida (evita duplicar gastos personales).
- POST `/grupos/:id/liquidaciones` `{hacia_id,monto,idempotencia,confirmar:true}`: quien debe confirma pago contable a un acreedor miembro; limitado a la deuda/crédito vigentes. No ejecuta pago bancario ni altera carteras. La UI debe explicarlo.

Los movimientos generados por recurrentes/deudas/metas quedan vinculados y no se pueden editar o eliminar desde el historial general. No se envían notificaciones externas, dinero ni solicitudes de IA desde estos módulos.
