-- M7/D-01. Water source and method used for an executed irrigation turn.
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('IRRIGATION_WATER_SOURCE', 'Fuentes de agua para riego', 'Fuente de agua utilizada en el turno', TRUE),
    ('IRRIGATION_METHOD', 'Métodos de riego', 'Método utilizado durante el turno', TRUE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT ct.id, seed.code, seed.label, seed.sort_order
FROM (VALUES
    ('IRRIGATION_WATER_SOURCE', 'NETWORK',   'Red',       1),
    ('IRRIGATION_WATER_SOURCE', 'TANKER',    'Cisterna',  2),
    ('IRRIGATION_WATER_SOURCE', 'WELL',      'Pozo',      3),
    ('IRRIGATION_METHOD',       'SPRINKLER', 'Aspersión', 1),
    ('IRRIGATION_METHOD',       'HOSE',      'Manguera',  2),
    ('IRRIGATION_METHOD',       'DRIP',      'Goteo',     3)
) AS seed(type_code, code, label, sort_order)
JOIN catalog_types ct ON ct.code = seed.type_code;

ALTER TABLE irrigation_turns
    ADD COLUMN water_source_item_id BIGINT REFERENCES catalog_items(id),
    ADD COLUMN irrigation_method_item_id BIGINT REFERENCES catalog_items(id),
    ADD COLUMN tanker_trips INTEGER,
    ADD COLUMN tanker_volume_m3 NUMERIC(12, 3),
    ADD CONSTRAINT chk_irrigation_turn_water_details CHECK (
        (water_source_item_id IS NULL) = (irrigation_method_item_id IS NULL)
        AND (water_source_item_id IS NOT NULL OR (tanker_trips IS NULL AND tanker_volume_m3 IS NULL))
        AND (tanker_trips IS NULL OR tanker_trips > 0)
        AND (tanker_volume_m3 IS NULL OR tanker_volume_m3 > 0)
    );
