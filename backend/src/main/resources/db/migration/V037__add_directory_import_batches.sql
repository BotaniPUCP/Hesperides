-- El Directorio entra al ciclo común de cargas (SPEC-103 D-04, SPEC-106 §4.2):
-- sus lotes viven en import_batches y cada fila creada recuerda de qué lote vino.
ALTER TABLE import_batches DROP CONSTRAINT import_batches_kind_check;
ALTER TABLE import_batches ADD CONSTRAINT import_batches_kind_check
    CHECK (kind IN ('specimens', 'waste-bins', 'drinking-fountains', 'species-photos', 'organizations', 'contacts'));

-- Nulo para lo registrado uno por uno: el alta manual no tiene lote.
ALTER TABLE organizations ADD COLUMN import_batch_id BIGINT REFERENCES import_batches(id);
ALTER TABLE contacts ADD COLUMN import_batch_id BIGINT REFERENCES import_batches(id);
