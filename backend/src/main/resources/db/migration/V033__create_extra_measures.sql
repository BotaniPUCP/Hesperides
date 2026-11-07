-- Propiedad de SPEC-105 §4.4.
--
-- Cada medida es una fila de catalog_items (INV-2), con su unidad en metadata:
-- un catalogo global evita variantes como «Tallos» y «N.º de tallos». La nota de
-- referencia es texto orientativo y nunca se atribuye a un ejemplar (D-09).

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('EXTRA_MEASURE', 'Medidas adicionales', 'Medidas propias de algunas especies', FALSE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'SUPPORT_HEIGHT',      'Altura del soporte', 1, '{"unitCode":"M"}'),
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'COVERED_LENGTH',      'Largo cubierto',     2, '{"unitCode":"M"}'),
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'FLOWER_STALK_HEIGHT', 'Altura del quiote',  3, '{"unitCode":"M"}'),
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'STEM_COUNT',          'Número de tallos',   4, '{"unitCode":"UNIT"}'),
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'COVERAGE_AREA',       'Cobertura',          5, '{"unitCode":"M2"}');

CREATE TABLE species_extra_measures (
    id              BIGSERIAL PRIMARY KEY,
    species_id      BIGINT NOT NULL REFERENCES species(id),
    measure_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    reference_note  VARCHAR(200),
    sort_order      INTEGER   NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

CREATE UNIQUE INDEX idx_species_extra_measures_active
    ON species_extra_measures(species_id, measure_item_id) WHERE deleted_at IS NULL;

CREATE TABLE green_element_measurement_values (
    id              BIGSERIAL PRIMARY KEY,
    measurement_id  BIGINT NOT NULL REFERENCES green_element_measurements(id),
    measure_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    value           NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

CREATE UNIQUE INDEX idx_measurement_values_active
    ON green_element_measurement_values(measurement_id, measure_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_measurement_values_measure ON green_element_measurement_values(measure_item_id);

INSERT INTO species_extra_measures (species_id, measure_item_id, reference_note, sort_order)
SELECT s.id, ci.id, v.note, v.sort_order
  FROM (VALUES
    ('bougainvillea-glabra', 'SUPPORT_HEIGHT',      '≈ 2.5 m (estimación del equipo)', 1),
    ('bougainvillea-glabra', 'COVERED_LENGTH',      '≈ 3 m, estimación del equipo (máx. 2.5–4 m)', 2),
    ('agave-americana',      'FLOWER_STALK_HEIGHT', 'Solo si está en flor: ≈ 7 m (rango 5–10 m)', 1),
    ('dracaena-fragrans',    'STEM_COUNT',          '3 tallos (rango 2–4; puede tener 1)', 1),
    ('chlorophytum-comosum', 'COVERAGE_AREA',       'Si crece como macizo. Planta sola ≈ 0.13 m²; macizo ≈ 0.5–2 m² (macizo: estimación del equipo)', 1)
  ) AS v(slug, measure, note, sort_order)
  JOIN species s ON s.slug = v.slug AND s.deleted_at IS NULL
  JOIN catalog_types ct ON ct.code = 'EXTRA_MEASURE'
  JOIN catalog_items ci ON ci.catalog_type_id = ct.id AND ci.code = v.measure;
