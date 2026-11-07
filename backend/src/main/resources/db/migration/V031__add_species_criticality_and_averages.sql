-- Propiedad de SPEC-105 §4.2.
--
-- La criticidad es de la especie, no de su tipo: una trepadora puede necesitar
-- escalera. Nace en TRUE para que cualquier especie registrada en una base real
-- despues de la semilla quede del lado seguro y el CHECK final no impida migrar.

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('REFERENCE_VALUE_SOURCE', 'Fuente de valores de referencia', 'De dónde sale el promedio de una especie', FALSE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'REFERENCE_VALUE_SOURCE'), 'BOTANICAL_SHEET', 'Ficha botánica',        1),
    ((SELECT id FROM catalog_types WHERE code = 'REFERENCE_VALUE_SOURCE'), 'TEAM_ESTIMATE',   'Estimación del equipo', 2),
    ((SELECT id FROM catalog_types WHERE code = 'REFERENCE_VALUE_SOURCE'), 'CAMPUS_SAMPLE',   'Muestra en el campus',  3);

ALTER TABLE species
    ADD COLUMN is_critical BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN reference_height_m NUMERIC(5, 2) CHECK (reference_height_m IS NULL OR reference_height_m > 0),
    ADD COLUMN reference_height_source_item_id BIGINT REFERENCES catalog_items(id),
    ADD COLUMN reference_crown_radius_m NUMERIC(5, 2) CHECK (reference_crown_radius_m IS NULL OR reference_crown_radius_m > 0),
    ADD COLUMN reference_crown_radius_source_item_id BIGINT REFERENCES catalog_items(id),
    ADD COLUMN uses_trunk_height BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN uses_dbh BOOLEAN NOT NULL DEFAULT TRUE;

-- Valores entregados por el equipo el 6 nov 2026. El promedio del agave es por planta.
UPDATE species s
   SET is_critical = v.is_critical,
       reference_height_m = v.height,
       reference_height_source_item_id = (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                                           WHERE ct.code = 'REFERENCE_VALUE_SOURCE' AND ci.code = 'BOTANICAL_SHEET'),
       reference_crown_radius_m = v.crown,
       reference_crown_radius_source_item_id = (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                                                 WHERE ct.code = 'REFERENCE_VALUE_SOURCE' AND ci.code = v.crown_source),
       uses_trunk_height = v.uses_trunk,
       uses_dbh = v.uses_trunk
  FROM (VALUES
    ('coffea-arabica',         FALSE, 3.0, 1.0,  'BOTANICAL_SHEET', FALSE),
    ('jarava-ichu',            FALSE, 0.7, 0.25, 'TEAM_ESTIMATE',   FALSE),
    ('agave-americana',        FALSE, 1.4, 1.2,  'BOTANICAL_SHEET', FALSE),
    ('leea-guineensis',        FALSE, 2.5, 0.9,  'BOTANICAL_SHEET', FALSE),
    ('polyscias-guilfoylei',   FALSE, 2.5, 0.5,  'BOTANICAL_SHEET', FALSE),
    ('brunfelsia-australis',   FALSE, 2.5, 1.0,  'BOTANICAL_SHEET', FALSE),
    ('caesalpinia-gilliesii',  FALSE, 2.7, 1.2,  'BOTANICAL_SHEET', FALSE),
    ('hibiscus-rosa-sinensis', FALSE, 2.5, 1.1,  'BOTANICAL_SHEET', FALSE),
    ('matthiola-incana',       FALSE, 0.6, 0.2,  'BOTANICAL_SHEET', FALSE),
    ('piper-aduncum',          FALSE, 2.0, 0.8,  'TEAM_ESTIMATE',   FALSE),
    ('randia-aculeata',        FALSE, 2.4, 1.0,  'BOTANICAL_SHEET', FALSE),
    ('chlorophytum-comosum',   FALSE, 0.3, 0.2,  'BOTANICAL_SHEET', FALSE),
    -- Criticas: el promedio se conserva por si vuelven a ser no criticas (D-04).
    ('bougainvillea-glabra',   TRUE,  3.5, 1.1,  'BOTANICAL_SHEET', FALSE),
    -- Estas cuatro pueden crecer como arboles pequenos: conservan fuste y DAP.
    ('nerium-oleander',        TRUE,  3.0, 1.3,  'BOTANICAL_SHEET', TRUE),
    ('vachellia-farnesiana',   TRUE,  5.0, 2.5,  'BOTANICAL_SHEET', TRUE),
    ('euphorbia-umbellata',    TRUE,  3.0, 1.2,  'BOTANICAL_SHEET', TRUE),
    ('dracaena-fragrans',      TRUE,  2.5, 0.4,  'BOTANICAL_SHEET', TRUE)
  ) AS v(slug, is_critical, height, crown, crown_source, uses_trunk)
 WHERE s.slug = v.slug AND s.deleted_at IS NULL;

UPDATE species
   SET species_type_item_id = (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                                WHERE ct.code = 'SPECIES_TYPE' AND ci.code = 'HERB')
 WHERE slug IN ('matthiola-incana', 'chlorophytum-comosum') AND deleted_at IS NULL;

ALTER TABLE species
    ADD CONSTRAINT chk_species_reference_required CHECK (
        is_critical OR (reference_height_m IS NOT NULL AND reference_crown_radius_m IS NOT NULL)),
    ADD CONSTRAINT chk_species_height_source CHECK (
        (reference_height_m IS NULL) = (reference_height_source_item_id IS NULL)),
    ADD CONSTRAINT chk_species_crown_source CHECK (
        (reference_crown_radius_m IS NULL) = (reference_crown_radius_source_item_id IS NULL));

CREATE INDEX idx_species_is_critical ON species(is_critical);
