-- Esquema PostgreSQL local, reproducible e idempotente.
CREATE TABLE IF NOT EXISTS usuarios (
 id SERIAL PRIMARY KEY, telegram_id BIGINT UNIQUE, username VARCHAR(100), nombre VARCHAR(100) NOT NULL,
 correo VARCHAR(254), password TEXT, rol VARCHAR(20) NOT NULL DEFAULT 'USUARIO' CHECK (rol IN ('USUARIO','ADMIN','ADMINISTRADOR')),
 google_id TEXT UNIQUE, foto_url TEXT, fecha_nacimiento DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 moneda VARCHAR(3) NOT NULL DEFAULT 'USD' CHECK(moneda IN ('USD','COP','MXN','EUR','PEN','ARS','CLP')), moneda_fijada BOOLEAN NOT NULL DEFAULT FALSE,
 ultimo_login TIMESTAMPTZ, deleted_at TIMESTAMPTZ, codigo_recuperacion TEXT, codigo_expiracion TIMESTAMPTZ,
 codigo_verificacion BOOLEAN DEFAULT FALSE, reset_token_hash TEXT, reset_token_expires TIMESTAMPTZ, token_version INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS moneda_fijada BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_ci ON usuarios(lower(correo));
CREATE TABLE IF NOT EXISTS tipos_movimiento (id SERIAL PRIMARY KEY, nombre VARCHAR(50) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS categorias (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE, UNIQUE(nombre, usuario_id));
CREATE UNIQUE INDEX IF NOT EXISTS categorias_global_ci ON categorias(lower(nombre)) WHERE usuario_id IS NULL;
CREATE TABLE IF NOT EXISTS cuentas (
 id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 saldo_actual NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK(saldo_actual >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, UNIQUE(nombre,usuario_id)
);
CREATE TABLE IF NOT EXISTS movimientos (
 id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 tipo_movimiento_id INTEGER NOT NULL REFERENCES tipos_movimiento(id), categoria_id INTEGER REFERENCES categorias(id),
 cuenta_origen_id INTEGER REFERENCES cuentas(id), cuenta_destino_id INTEGER REFERENCES cuentas(id),
 monto NUMERIC(15,2) NOT NULL CHECK(monto > 0 AND monto <= 999999999.99), descripcion TEXT,
 metodo_pago VARCHAR(50), fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS configuracion(id SERIAL PRIMARY KEY, clave VARCHAR(100) UNIQUE NOT NULL, valor TEXT, actualizado_en TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS auditoria(id SERIAL PRIMARY KEY, usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, accion VARCHAR(50) NOT NULL, entidad VARCHAR(50), entidad_id INTEGER, detalle JSONB, ip VARCHAR(45), creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS movimientos_usuario_fecha ON movimientos(usuario_id,fecha DESC);
CREATE INDEX IF NOT EXISTS cuentas_usuario ON cuentas(usuario_id);
CREATE INDEX IF NOT EXISTS auditoria_fecha ON auditoria(creado_en DESC);
INSERT INTO tipos_movimiento(nombre) VALUES('INGRESO'),('GASTO'),('TRANSFERENCIA') ON CONFLICT DO NOTHING;
INSERT INTO categorias(nombre) SELECT x FROM unnest(ARRAY['Comida','Transporte','Servicios','Salud','Entretenimiento','Educación','Compras','Salario','Inversión','Otros']) x WHERE NOT EXISTS(SELECT 1 FROM categorias c WHERE lower(c.nombre)=lower(x) AND c.usuario_id IS NULL);
INSERT INTO configuracion(clave,valor) VALUES('tema','claro'),('color_principal','cyan'),('nombre_sistema','Asistente Financiero'),('logo_url',''),('idioma','es'),('moneda','USD'),('ia_modelo',''),('ia_api_key',''),('telegram_bot_token','') ON CONFLICT(clave) DO NOTHING;
CREATE OR REPLACE FUNCTION fx_buscar_por_correo(p_correo TEXT) RETURNS SETOF usuarios LANGUAGE SQL STABLE AS $$ SELECT * FROM usuarios WHERE lower(correo)=lower(p_correo) AND deleted_at IS NULL $$;
CREATE OR REPLACE FUNCTION fx_registro_completo(p_nombre TEXT,p_correo TEXT,p_password TEXT) RETURNS SETOF usuarios LANGUAGE plpgsql AS $$
DECLARE u usuarios;
BEGIN
 INSERT INTO usuarios(nombre,correo,password) VALUES(trim(p_nombre),lower(trim(p_correo)),p_password) RETURNING * INTO u;
 INSERT INTO cuentas(nombre,usuario_id) VALUES('Efectivo',u.id);
 RETURN NEXT u;
END $$;
CREATE OR REPLACE FUNCTION fx_buscar_o_crear_usuario(p_telegram BIGINT,p_username TEXT,p_nombre TEXT) RETURNS SETOF usuarios LANGUAGE plpgsql AS $$
DECLARE u usuarios;
BEGIN
 SELECT * INTO u FROM usuarios WHERE telegram_id=p_telegram AND deleted_at IS NULL;
 IF NOT FOUND THEN
  INSERT INTO usuarios(telegram_id,username,nombre) VALUES(p_telegram,p_username,COALESCE(NULLIF(p_nombre,''),'Usuario')) RETURNING * INTO u;
  INSERT INTO cuentas(nombre,usuario_id) VALUES('Efectivo',u.id);
 END IF;
 RETURN NEXT u;
END $$;
CREATE OR REPLACE FUNCTION fx_vincular_cuenta_web(p_telegram BIGINT,p_correo TEXT,p_password TEXT) RETURNS SETOF usuarios LANGUAGE SQL AS $$ UPDATE usuarios SET correo=lower(trim(p_correo)),password=p_password WHERE telegram_id=p_telegram AND deleted_at IS NULL RETURNING * $$;
CREATE OR REPLACE FUNCTION fx_listar_cuentas_usuario(p_usuario INTEGER) RETURNS SETOF cuentas LANGUAGE SQL STABLE AS $$ SELECT * FROM cuentas WHERE usuario_id=p_usuario AND deleted_at IS NULL ORDER BY id $$;
CREATE OR REPLACE FUNCTION fx_obtener_balance_general(p_usuario INTEGER) RETURNS NUMERIC LANGUAGE SQL STABLE AS $$ SELECT COALESCE(sum(saldo_actual),0) FROM cuentas WHERE usuario_id=p_usuario AND deleted_at IS NULL $$;
CREATE OR REPLACE FUNCTION fx_obtener_resumen_hoy(p_usuario INTEGER) RETURNS TABLE(tipo VARCHAR,total NUMERIC) LANGUAGE SQL STABLE AS $$ SELECT t.nombre,COALESCE(sum(m.monto),0) FROM movimientos m JOIN tipos_movimiento t ON t.id=m.tipo_movimiento_id WHERE m.usuario_id=p_usuario AND m.deleted_at IS NULL AND (m.fecha AT TIME ZONE 'America/Guayaquil')::date=(NOW() AT TIME ZONE 'America/Guayaquil')::date GROUP BY t.nombre $$;
CREATE OR REPLACE FUNCTION fx_obtener_resumen_mes(p_usuario INTEGER) RETURNS TABLE(tipo VARCHAR,total NUMERIC) LANGUAGE SQL STABLE AS $$ SELECT t.nombre,COALESCE(sum(m.monto),0) FROM movimientos m JOIN tipos_movimiento t ON t.id=m.tipo_movimiento_id WHERE m.usuario_id=p_usuario AND m.deleted_at IS NULL AND date_trunc('month',m.fecha AT TIME ZONE 'America/Guayaquil')=date_trunc('month',NOW() AT TIME ZONE 'America/Guayaquil') GROUP BY t.nombre $$;
CREATE OR REPLACE FUNCTION fx_obtener_gastos_categoria_mes(p_usuario INTEGER) RETURNS TABLE(categoria VARCHAR,total NUMERIC) LANGUAGE SQL STABLE AS $$ SELECT c.nombre,sum(m.monto) FROM movimientos m JOIN tipos_movimiento t ON t.id=m.tipo_movimiento_id LEFT JOIN categorias c ON c.id=m.categoria_id WHERE m.usuario_id=p_usuario AND m.deleted_at IS NULL AND t.nombre='GASTO' AND date_trunc('month',m.fecha AT TIME ZONE 'America/Guayaquil')=date_trunc('month',NOW() AT TIME ZONE 'America/Guayaquil') GROUP BY c.nombre ORDER BY 2 DESC $$;
CREATE OR REPLACE FUNCTION fx_listar_historial_movimientos(p_usuario INTEGER) RETURNS TABLE(id INTEGER,usuario_id INTEGER,tipo VARCHAR,categoria VARCHAR,monto NUMERIC,cuenta_origen VARCHAR,cuenta_destino VARCHAR,descripcion TEXT,metodo_pago VARCHAR,fecha TIMESTAMPTZ,deleted_at TIMESTAMPTZ) LANGUAGE SQL STABLE AS $$ SELECT m.id,m.usuario_id,t.nombre,c.nombre,m.monto,co.nombre,cd.nombre,m.descripcion,m.metodo_pago,m.fecha,m.deleted_at FROM movimientos m JOIN tipos_movimiento t ON t.id=m.tipo_movimiento_id LEFT JOIN categorias c ON c.id=m.categoria_id LEFT JOIN cuentas co ON co.id=m.cuenta_origen_id LEFT JOIN cuentas cd ON cd.id=m.cuenta_destino_id WHERE m.usuario_id=p_usuario AND m.deleted_at IS NULL ORDER BY m.fecha DESC,m.id DESC LIMIT 100 $$;
-- La edición usa ledgerService, transacción y validación conjunta de saldos.
CREATE OR REPLACE FUNCTION fx_editar_movimiento(INTEGER,INTEGER,TEXT,NUMERIC,TEXT,TEXT,TEXT,TEXT) RETURNS SETOF movimientos LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Utilice la API de movimientos para editar con validación atómica de saldos.' USING ERRCODE='22023'; END $$;

