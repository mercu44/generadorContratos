BEGIN;
CREATE TABLE IF NOT EXISTS contratos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL CHECK (length(trim(nombre)) > 0),
  dni VARCHAR(30) NOT NULL CHECK (length(trim(dni)) > 0),
  residencia VARCHAR(350) NOT NULL CHECK (length(trim(residencia)) > 0),
  trastero INTEGER NOT NULL CHECK (trastero BETWEEN 1 AND 34),
  superficie NUMERIC(8,2) NOT NULL CHECK (superficie > 0),
  fechainicio DATE NOT NULL,
  fechafinal DATE NOT NULL CHECK (fechafinal > fechainicio),
  fechafirma DATE NOT NULL,
  preciooriginal NUMERIC(10,2) NOT NULL CHECK (preciooriginal >= 0),
  iva NUMERIC(10,2) NOT NULL CHECK (iva >= 0),
  preciototal NUMERIC(11,2) GENERATED ALWAYS AS (preciooriginal + iva) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contratos_created_idx ON contratos (created_at DESC);
CREATE OR REPLACE FUNCTION actualizar_fecha_contrato() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER contratos_actualizados BEFORE UPDATE ON contratos
FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_contrato();
COMMIT;
