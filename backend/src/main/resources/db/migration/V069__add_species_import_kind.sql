-- Propiedad de SPEC-103 §6.6 y SPEC-105 §5.1.
--
-- Habilita el tipo de lote 'species' en import_batches para la importación
-- masiva de especies botánicas y registra en species el lote de origen o
-- última actualización masiva.
--
-- Nació como V035 en feat/inventario-verde; al integrarse (17 nov 2026) pasó a
-- V069 y su lista de tipos conserva los que entraron después (organizations y
-- contacts en V037, reservations en V039): sin ellos, esas cargas fallarían.

ALTER TABLE import_batches
    DROP CONSTRAINT IF EXISTS import_batches_kind_check,
    ADD CONSTRAINT import_batches_kind_check
        CHECK (kind IN ('specimens', 'waste-bins', 'drinking-fountains', 'species-photos',
                       'organizations', 'contacts', 'reservations', 'species'));

ALTER TABLE species
    ADD COLUMN IF NOT EXISTS import_batch_id BIGINT REFERENCES import_batches(id);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT id, 'NATIVE', 'Nativa', 2
  FROM catalog_types
 WHERE code = 'SPECIES_ORIGIN'
   AND NOT EXISTS (
       SELECT 1 FROM catalog_items ci
        WHERE ci.catalog_type_id = catalog_types.id AND ci.code = 'NATIVE'
   );
