-- No conversion: existing users and amounts retain USD, the former application currency.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS moneda_fijada BOOLEAN NOT NULL DEFAULT FALSE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='usuarios'::regclass AND conname='usuarios_moneda_check') THEN
  ALTER TABLE usuarios ADD CONSTRAINT usuarios_moneda_check CHECK(moneda IN ('USD','COP','MXN','EUR','PEN','ARS','CLP'));
 END IF;
END $$;
ALTER TABLE fin_grupos ADD COLUMN IF NOT EXISTS moneda VARCHAR(3);
UPDATE fin_grupos g SET moneda=u.moneda FROM usuarios u WHERE u.id=g.propietario_id AND g.moneda IS NULL;
ALTER TABLE fin_grupos ALTER COLUMN moneda SET NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='fin_grupos'::regclass AND conname='fin_grupos_moneda_check') THEN
  ALTER TABLE fin_grupos ADD CONSTRAINT fin_grupos_moneda_check CHECK(moneda IN ('USD','COP','MXN','EUR','PEN','ARS','CLP'));
 END IF;
END $$;
-- Sticky activity flag: deleting an activity must never make its old units reinterpretable.
UPDATE usuarios u SET moneda_fijada=TRUE WHERE NOT moneda_fijada AND (
 EXISTS(SELECT 1 FROM movimientos m WHERE m.usuario_id=u.id) OR
 EXISTS(SELECT 1 FROM cuentas c WHERE c.usuario_id=u.id AND c.saldo_actual<>0) OR
 EXISTS(SELECT 1 FROM fin_presupuestos x WHERE x.usuario_id=u.id) OR
 EXISTS(SELECT 1 FROM fin_recurrentes x WHERE x.usuario_id=u.id) OR
 EXISTS(SELECT 1 FROM fin_deudas x WHERE x.usuario_id=u.id) OR
 EXISTS(SELECT 1 FROM fin_metas x WHERE x.usuario_id=u.id) OR
 EXISTS(SELECT 1 FROM fin_miembros x WHERE x.usuario_id=u.id));
CREATE OR REPLACE FUNCTION proteger_moneda_usuario() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.moneda_fijada AND (NEW.moneda IS DISTINCT FROM OLD.moneda OR NOT NEW.moneda_fijada) THEN
  RAISE EXCEPTION 'La moneda no puede cambiar después de registrar actividad financiera.' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS usuarios_proteger_moneda ON usuarios;
CREATE TRIGGER usuarios_proteger_moneda BEFORE UPDATE OF moneda,moneda_fijada ON usuarios FOR EACH ROW EXECUTE FUNCTION proteger_moneda_usuario();
CREATE OR REPLACE FUNCTION fijar_moneda_actividad() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='cuentas' THEN
  IF NEW.saldo_actual=0 THEN RETURN NEW; END IF;
 END IF;
 -- An UPDATE takes the same user-row lock as preferences; concurrent first activity cannot
 -- commit while a previously active currency is being relabelled. No network calls in locks.
 UPDATE usuarios SET moneda_fijada=TRUE WHERE id=NEW.usuario_id;
 RETURN NEW;
END $$;
DO $$ DECLARE tab TEXT; BEGIN
 FOREACH tab IN ARRAY ARRAY['cuentas','movimientos','fin_presupuestos','fin_recurrentes','fin_deudas','fin_metas'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS fijar_moneda_actividad ON %I',tab);
  EXECUTE format('CREATE TRIGGER fijar_moneda_actividad BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fijar_moneda_actividad()',tab);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION moneda_grupo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE moneda_owner TEXT;
BEGIN
 SELECT moneda INTO moneda_owner FROM usuarios WHERE id=NEW.propietario_id FOR UPDATE;
 IF TG_OP='UPDATE' AND NEW.moneda IS DISTINCT FROM OLD.moneda THEN
  RAISE EXCEPTION 'La moneda del grupo no se puede cambiar.' USING ERRCODE='P0001';
 END IF;
 IF TG_OP='INSERT' THEN NEW.moneda:=moneda_owner; END IF;
 UPDATE usuarios SET moneda_fijada=TRUE WHERE id=NEW.propietario_id;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS grupo_moneda ON fin_grupos;
CREATE TRIGGER grupo_moneda BEFORE INSERT OR UPDATE ON fin_grupos FOR EACH ROW EXECUTE FUNCTION moneda_grupo();
CREATE OR REPLACE FUNCTION moneda_miembro_grupo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE moneda_user TEXT; moneda_group TEXT;
BEGIN
 SELECT moneda INTO moneda_user FROM usuarios WHERE id=NEW.usuario_id FOR UPDATE;
 SELECT moneda INTO moneda_group FROM fin_grupos WHERE id=NEW.grupo_id;
 IF moneda_user IS DISTINCT FROM moneda_group THEN
  RAISE EXCEPTION 'Los miembros del grupo deben usar la misma moneda.' USING ERRCODE='P0001';
 END IF;
 UPDATE usuarios SET moneda_fijada=TRUE WHERE id=NEW.usuario_id;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS miembro_moneda ON fin_miembros;
CREATE TRIGGER miembro_moneda BEFORE INSERT OR UPDATE ON fin_miembros FOR EACH ROW EXECUTE FUNCTION moneda_miembro_grupo();
CREATE INDEX IF NOT EXISTS usuarios_moneda_idx ON usuarios(moneda);
