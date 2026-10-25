-- Multidivisa (v3): cada cartera tiene su propia moneda y usuarios.moneda pasa a ser la
-- moneda de presentación elegida por la persona. Migración aditiva e idempotente: no convierte
-- importes; cada cartera, movimiento y registro hereda la moneda que su usuario ya tenía.

-- 1. La moneda del usuario deja de bloquearse: ahora solo decide cómo se presenta el panel.
DROP TRIGGER IF EXISTS usuarios_proteger_moneda ON usuarios;
DO $$ DECLARE tab TEXT; BEGIN
 FOREACH tab IN ARRAY ARRAY['cuentas','movimientos','fin_presupuestos','fin_recurrentes','fin_deudas','fin_metas'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS fijar_moneda_actividad ON %I',tab);
 END LOOP;
END $$;
DROP TRIGGER IF EXISTS miembro_moneda ON fin_miembros;

-- 2. Columnas de moneda heredadas del usuario (backfill solo donde falta).
DO $$ DECLARE tab TEXT; BEGIN
 FOREACH tab IN ARRAY ARRAY['cuentas','movimientos','fin_presupuestos','fin_recurrentes','fin_deudas','fin_metas'] LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS moneda VARCHAR(3)',tab);
  EXECUTE format('UPDATE %I x SET moneda=u.moneda FROM usuarios u WHERE u.id=x.usuario_id AND x.moneda IS NULL',tab);
  EXECUTE format('ALTER TABLE %I ALTER COLUMN moneda SET NOT NULL',tab);
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=tab::regclass AND conname=tab||'_moneda_check') THEN
   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK(moneda IN (''USD'',''COP'',''MXN'',''EUR'',''PEN'',''ARS'',''CLP''))',tab,tab||'_moneda_check');
  END IF;
 END LOOP;
END $$;

-- 3. Transferencias entre monedas: el importe de destino y la tasa quedan guardados en la fila.
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS moneda_destino VARCHAR(3);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS monto_destino NUMERIC(15,2);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS tasa NUMERIC(24,12);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS tasa_fuente VARCHAR(40);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS tasa_fecha DATE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='movimientos'::regclass AND conname='movimientos_conversion_check') THEN
  ALTER TABLE movimientos ADD CONSTRAINT movimientos_conversion_check CHECK(
   (moneda_destino IS NULL AND monto_destino IS NULL AND tasa IS NULL AND tasa_fuente IS NULL AND tasa_fecha IS NULL) OR
   (moneda_destino IS NOT NULL AND moneda_destino<>moneda AND monto_destino>0 AND tasa>0 AND tasa_fuente IS NOT NULL AND tasa_fecha IS NOT NULL));
 END IF;
END $$;

-- 4. Tasas de referencia obtenidas por el backend. Se guarda cada cotización; nunca se sobrescribe.
CREATE TABLE IF NOT EXISTS tasas_cambio (
 id SERIAL PRIMARY KEY,
 base VARCHAR(3) NOT NULL,
 cotizada VARCHAR(3) NOT NULL,
 tasa NUMERIC(24,12) NOT NULL CHECK(tasa>0),
 fuente VARCHAR(40) NOT NULL,
 fecha_cotizacion DATE NOT NULL,
 obtenida_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(base<>cotizada),
 UNIQUE(fuente,base,cotizada,fecha_cotizacion)
);
CREATE INDEX IF NOT EXISTS tasas_cambio_par_fecha ON tasas_cambio(base,cotizada,fecha_cotizacion DESC);

-- 5. Conversión explícita de una cartera: evento trazable; el historial original no se toca.
CREATE TABLE IF NOT EXISTS fin_conversiones (
 id SERIAL PRIMARY KEY,
 usuario_id INT NOT NULL REFERENCES usuarios(id),
 cuenta_id INT NOT NULL REFERENCES cuentas(id),
 moneda_origen VARCHAR(3) NOT NULL,
 moneda_destino VARCHAR(3) NOT NULL,
 saldo_origen NUMERIC(15,2) NOT NULL CHECK(saldo_origen>=0),
 saldo_destino NUMERIC(15,2) NOT NULL CHECK(saldo_destino>=0),
 tasa NUMERIC(24,12) NOT NULL CHECK(tasa>0),
 tasa_fuente VARCHAR(40) NOT NULL,
 tasa_fecha DATE NOT NULL,
 idempotencia VARCHAR(80) NOT NULL,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(moneda_origen<>moneda_destino),
 UNIQUE(usuario_id,idempotencia)
);
CREATE INDEX IF NOT EXISTS fin_conversiones_cuenta ON fin_conversiones(cuenta_id,id);

-- Transferencias entre carteras registradas desde Finanzas (idempotentes, con o sin conversión).
CREATE TABLE IF NOT EXISTS fin_transferencias (
 id SERIAL PRIMARY KEY,
 usuario_id INT NOT NULL REFERENCES usuarios(id),
 movimiento_id INT NOT NULL UNIQUE REFERENCES movimientos(id),
 idempotencia VARCHAR(80) NOT NULL,
 solicitud TEXT NOT NULL,
 UNIQUE(usuario_id,idempotencia)
);

-- 6. Integridad en la base: la moneda de una cartera solo cambia mediante una conversión
-- registrada en la misma transacción, o mientras la cartera no tenga ninguna actividad.
CREATE OR REPLACE FUNCTION moneda_cartera() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.moneda IS NULL THEN SELECT moneda INTO NEW.moneda FROM usuarios WHERE id=NEW.usuario_id; END IF;
  RETURN NEW;
 END IF;
 IF NEW.moneda IS DISTINCT FROM OLD.moneda THEN
  IF COALESCE(current_setting('af.conversion_cartera',true),'')=OLD.id::text THEN RETURN NEW; END IF;
  IF OLD.saldo_actual=0 AND NOT EXISTS(SELECT 1 FROM movimientos WHERE cuenta_origen_id=OLD.id OR cuenta_destino_id=OLD.id)
   AND NOT EXISTS(SELECT 1 FROM fin_recurrentes WHERE cuenta_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM fin_metas WHERE cuenta_id=OLD.id) THEN
   RETURN NEW;
  END IF;
  RAISE EXCEPTION 'La moneda de una cartera con actividad solo cambia mediante una conversión confirmada.' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cuentas_moneda ON cuentas;
CREATE TRIGGER cuentas_moneda BEFORE INSERT OR UPDATE OF moneda ON cuentas FOR EACH ROW EXECUTE FUNCTION moneda_cartera();

-- Cada movimiento queda etiquetado con la moneda de sus carteras al registrarse; después no se
-- reinterpreta. Una cartera convertida conserva sus movimientos anteriores en la moneda original.
CREATE OR REPLACE FUNCTION moneda_movimiento() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m_origen TEXT; m_destino TEXT;
BEGIN
 SELECT moneda INTO m_origen FROM cuentas WHERE id=NEW.cuenta_origen_id;
 SELECT moneda INTO m_destino FROM cuentas WHERE id=NEW.cuenta_destino_id;
 IF TG_OP='INSERT' THEN
  NEW.moneda:=COALESCE(m_origen,m_destino,NEW.moneda);
  IF m_origen IS NOT NULL AND m_destino IS NOT NULL AND m_origen<>m_destino THEN
   IF NEW.monto_destino IS NULL OR NEW.tasa IS NULL THEN
    RAISE EXCEPTION 'Las carteras usan monedas distintas. Usa la transferencia con conversión, que muestra la tasa.' USING ERRCODE='P0001';
   END IF;
   NEW.moneda_destino:=m_destino;
  ELSIF NEW.moneda_destino IS NOT NULL THEN
   RAISE EXCEPTION 'La conversión solo aplica entre carteras de monedas distintas.' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.moneda IS DISTINCT FROM OLD.moneda OR NEW.moneda_destino IS DISTINCT FROM OLD.moneda_destino
  OR NEW.monto_destino IS DISTINCT FROM OLD.monto_destino OR NEW.tasa IS DISTINCT FROM OLD.tasa
  OR NEW.tasa_fuente IS DISTINCT FROM OLD.tasa_fuente OR NEW.tasa_fecha IS DISTINCT FROM OLD.tasa_fecha THEN
  RAISE EXCEPTION 'La moneda y la tasa de un movimiento registrado no se modifican.' USING ERRCODE='P0001';
 END IF;
 -- Editar o anular solo es posible mientras las carteras sigan en la moneda del movimiento.
 IF COALESCE(m_origen,m_destino) IS DISTINCT FROM OLD.moneda
  OR (OLD.moneda_destino IS NULL AND m_origen IS NOT NULL AND m_destino IS NOT NULL AND m_destino<>OLD.moneda)
  OR (OLD.moneda_destino IS NOT NULL AND m_destino IS DISTINCT FROM OLD.moneda_destino) THEN
  RAISE EXCEPTION 'El movimiento está en una moneda distinta a la actual de la cartera; se conserva como historial.' USING ERRCODE='P0001';
 END IF;
 IF OLD.moneda_destino IS NOT NULL AND (NEW.monto IS DISTINCT FROM OLD.monto OR NEW.cuenta_origen_id IS DISTINCT FROM OLD.cuenta_origen_id
  OR NEW.cuenta_destino_id IS DISTINCT FROM OLD.cuenta_destino_id OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
  RAISE EXCEPTION 'Una transferencia con conversión no se edita ni se anula; registra la operación inversa.' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS movimientos_moneda ON movimientos;
CREATE TRIGGER movimientos_moneda BEFORE INSERT OR UPDATE ON movimientos FOR EACH ROW EXECUTE FUNCTION moneda_movimiento();

-- Recordatorios y metas toman la moneda de su cartera; presupuestos y deudas, la del usuario
-- salvo que se indique otra.
CREATE OR REPLACE FUNCTION moneda_registro() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME IN ('fin_recurrentes','fin_metas') THEN
  -- Solo se reetiqueta al elegir otra cartera; marcar fechas o desactivar no cambia la moneda.
  IF TG_OP='INSERT' OR NEW.cuenta_id IS DISTINCT FROM OLD.cuenta_id THEN
   SELECT moneda INTO NEW.moneda FROM cuentas WHERE id=NEW.cuenta_id;
  ELSE
   NEW.moneda:=OLD.moneda;
  END IF;
 ELSIF NEW.moneda IS NULL THEN
  SELECT moneda INTO NEW.moneda FROM usuarios WHERE id=NEW.usuario_id;
 END IF;
 IF TG_OP='UPDATE' AND TG_TABLE_NAME IN ('fin_presupuestos','fin_deudas') AND NEW.moneda IS DISTINCT FROM OLD.moneda THEN
  RAISE EXCEPTION 'La moneda de un registro existente no se modifica.' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE tab TEXT; BEGIN
 FOREACH tab IN ARRAY ARRAY['fin_presupuestos','fin_recurrentes','fin_deudas','fin_metas'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I',tab||'_moneda',tab);
  EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION moneda_registro()',tab||'_moneda',tab);
 END LOOP;
END $$;

-- Los grupos son contables: su moneda se elige al crearlos (por defecto, la del propietario) y no
-- depende de la moneda de presentación de cada miembro.
CREATE OR REPLACE FUNCTION moneda_grupo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.moneda IS DISTINCT FROM OLD.moneda THEN
  RAISE EXCEPTION 'La moneda del grupo no se puede cambiar.' USING ERRCODE='P0001';
 END IF;
 IF TG_OP='INSERT' AND NEW.moneda IS NULL THEN SELECT moneda INTO NEW.moneda FROM usuarios WHERE id=NEW.propietario_id; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS grupo_moneda ON fin_grupos;
CREATE TRIGGER grupo_moneda BEFORE INSERT OR UPDATE ON fin_grupos FOR EACH ROW EXECUTE FUNCTION moneda_grupo();

CREATE INDEX IF NOT EXISTS cuentas_moneda_idx ON cuentas(moneda);
CREATE INDEX IF NOT EXISTS movimientos_moneda_idx ON movimientos(moneda);
