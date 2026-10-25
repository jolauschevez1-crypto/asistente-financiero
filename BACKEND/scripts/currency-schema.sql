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
-- Los bloqueos de moneda por actividad se retiraron en v3: ver multidivisa-schema.sql,
-- donde cada cartera tiene su moneda y los triggers antiguos se eliminan de forma idempotente.
CREATE INDEX IF NOT EXISTS usuarios_moneda_idx ON usuarios(moneda);
