CREATE TABLE IF NOT EXISTS fin_presupuestos (
 id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id), categoria_id INT NOT NULL REFERENCES categorias(id),
 mes CHAR(7) NOT NULL, limite NUMERIC(15,2) NOT NULL CHECK(limite>0), UNIQUE(usuario_id,categoria_id,mes)
);
CREATE TABLE IF NOT EXISTS fin_recurrentes (
 id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id), nombre VARCHAR(100) NOT NULL,
 tipo VARCHAR(10) NOT NULL CHECK(tipo IN ('INGRESO','GASTO')), monto NUMERIC(15,2) NOT NULL CHECK(monto>0),
 categoria_id INT NOT NULL REFERENCES categorias(id), cuenta_id INT NOT NULL REFERENCES cuentas(id),
 frecuencia VARCHAR(10) NOT NULL CHECK(frecuencia IN ('SEMANAL','MENSUAL','ANUAL')), proxima_fecha DATE NOT NULL,
 dia_ancla INT NOT NULL, mes_ancla INT NOT NULL, activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS fin_confirmaciones (
 id SERIAL PRIMARY KEY, recurrente_id INT NOT NULL REFERENCES fin_recurrentes(id), fecha_prevista DATE NOT NULL,
 movimiento_id INT NOT NULL UNIQUE REFERENCES movimientos(id), proxima_fecha DATE NOT NULL, UNIQUE(recurrente_id,fecha_prevista)
);
CREATE TABLE IF NOT EXISTS fin_deudas (
 id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id), nombre VARCHAR(100) NOT NULL,
 contraparte VARCHAR(100) NOT NULL, tipo VARCHAR(10) NOT NULL CHECK(tipo IN ('PAGAR','COBRAR')),
 monto NUMERIC(15,2) NOT NULL CHECK(monto>0), fecha_vencimiento DATE
);
CREATE TABLE IF NOT EXISTS fin_abonos (
 id SERIAL PRIMARY KEY, deuda_id INT NOT NULL REFERENCES fin_deudas(id), monto NUMERIC(15,2) NOT NULL CHECK(monto>0),
 cuenta_id INT NOT NULL REFERENCES cuentas(id), movimiento_id INT NOT NULL UNIQUE REFERENCES movimientos(id),
 idempotencia VARCHAR(80) NOT NULL, fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(deuda_id,idempotencia)
);
CREATE TABLE IF NOT EXISTS fin_metas (
 id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id), nombre VARCHAR(100) NOT NULL,
 objetivo NUMERIC(15,2) NOT NULL CHECK(objetivo>0), fecha_objetivo DATE, cuenta_id INT NOT NULL UNIQUE REFERENCES cuentas(id)
);
CREATE TABLE IF NOT EXISTS fin_aportes (
 id SERIAL PRIMARY KEY, meta_id INT NOT NULL REFERENCES fin_metas(id), monto NUMERIC(15,2) NOT NULL CHECK(monto>0),
 cuenta_id INT NOT NULL REFERENCES cuentas(id), movimiento_id INT NOT NULL UNIQUE REFERENCES movimientos(id),
 idempotencia VARCHAR(80) NOT NULL, fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(meta_id,idempotencia)
);
CREATE TABLE IF NOT EXISTS fin_grupos (
 id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, propietario_id INT NOT NULL REFERENCES usuarios(id)
);
CREATE TABLE IF NOT EXISTS fin_miembros (
 grupo_id INT NOT NULL REFERENCES fin_grupos(id), usuario_id INT NOT NULL REFERENCES usuarios(id), PRIMARY KEY(grupo_id,usuario_id)
);
CREATE TABLE IF NOT EXISTS fin_gastos_grupo (
 id SERIAL PRIMARY KEY, grupo_id INT NOT NULL REFERENCES fin_grupos(id), pagador_id INT NOT NULL REFERENCES usuarios(id),
 descripcion VARCHAR(250) NOT NULL, monto NUMERIC(15,2) NOT NULL CHECK(monto>0), fecha DATE NOT NULL,
 idempotencia VARCHAR(80) NOT NULL, UNIQUE(grupo_id,pagador_id,idempotencia)
);
CREATE TABLE IF NOT EXISTS fin_participaciones (
 gasto_id INT NOT NULL REFERENCES fin_gastos_grupo(id), usuario_id INT NOT NULL REFERENCES usuarios(id),
 monto NUMERIC(15,2) NOT NULL CHECK(monto>=0), PRIMARY KEY(gasto_id,usuario_id)
);
CREATE TABLE IF NOT EXISTS fin_cargas_rapidas (
 id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
 idempotencia VARCHAR(80) NOT NULL, solicitud TEXT NOT NULL, resultado TEXT NOT NULL,
 UNIQUE(usuario_id,idempotencia)
);
CREATE TABLE IF NOT EXISTS fin_liquidaciones (
 id SERIAL PRIMARY KEY, grupo_id INT NOT NULL REFERENCES fin_grupos(id), desde_id INT NOT NULL REFERENCES usuarios(id),
 hacia_id INT NOT NULL REFERENCES usuarios(id), monto NUMERIC(15,2) NOT NULL CHECK(monto>0),
 fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, idempotencia VARCHAR(80) NOT NULL,
 CHECK(desde_id<>hacia_id), UNIQUE(grupo_id,desde_id,idempotencia)
);
CREATE TABLE IF NOT EXISTS fin_movimiento_vinculos (
 movimiento_id INT PRIMARY KEY REFERENCES movimientos(id), modulo VARCHAR(30) NOT NULL, referencia_id INT
);
CREATE INDEX IF NOT EXISTS fin_recurrentes_vencimiento ON fin_recurrentes(usuario_id,proxima_fecha) WHERE activo;
CREATE INDEX IF NOT EXISTS fin_deudas_usuario ON fin_deudas(usuario_id);
CREATE INDEX IF NOT EXISTS fin_metas_usuario ON fin_metas(usuario_id);
CREATE INDEX IF NOT EXISTS fin_miembros_usuario ON fin_miembros(usuario_id);
