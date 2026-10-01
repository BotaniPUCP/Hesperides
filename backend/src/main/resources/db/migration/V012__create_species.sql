-- Propiedad de SPEC-002 §4.4, con las enmiendas del inventario verde
-- (docs/inventario-verde/README.md).
--
-- Catalogo botanico. Las filas salen del catastro del cliente (V014); el
-- nombre cientifico se limpia antes de cargarlo (README §3).

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('SPECIES_TYPE', 'Tipos de vegetación', 'Forma biológica de la especie', FALSE),
    ('SPECIES_ORIGIN', 'Procedencia de especies', 'Nativa, introducida...', FALSE);

-- Los nueve tipos de la hoja «tipologia de flora» del cliente (SPEC-005 §4.5).
-- El catastro usa seis; los otros tres esperan su primer ejemplar.
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_TYPE'), 'TREE',        'Árbol',                 1),
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_TYPE'), 'SHRUB',       'Arbusto',               2),
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_TYPE'), 'GROUNDCOVER', 'Cubresuelo',            3),
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_TYPE'), 'POTTED_HERB', 'Macetones (herbáceas)', 4),
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_TYPE'), 'PALM',        'Palmera',               5),
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_TYPE'), 'HERB',        'Planta herbácea',       6),
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_TYPE'), 'SUCCULENT',   'Planta suculenta',      7),
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_TYPE'), 'HEDGE',       'Seto (cerco vivo)',     8),
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_TYPE'), 'CLIMBER',     'Trepadora',             9);

CREATE TABLE species (
    id                   BIGSERIAL PRIMARY KEY,
    scientific_name      VARCHAR(150) NOT NULL,
    -- Va en la direccion de la ficha (/especies/roystonea-regia): los ids
    -- cambian en cada recarga de la base, el nombre cientifico no.
    slug                 VARCHAR(150) NOT NULL,
    common_name          VARCHAR(150),
    family               VARCHAR(100),
    species_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    origin_item_id       BIGINT REFERENCES catalog_items(id),
    description          TEXT,
    care_notes           TEXT,
    attributes           JSONB,
    is_active            BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMP,

    CONSTRAINT chk_species_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX idx_species_scientific_name_active ON species(scientific_name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_species_slug_active ON species(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_species_common_name ON species(common_name);
CREATE INDEX idx_species_type ON species(species_type_item_id);

-- Otros nombres coloquiales de una especie («Palmera bruja» para la Palmera
-- reina). Se encuentran al buscar; el nombre comun principal sigue siendo uno.
CREATE TABLE species_common_names (
    id         BIGSERIAL PRIMARY KEY,
    species_id BIGINT       NOT NULL REFERENCES species(id),
    name       VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_species_common_names_species ON species_common_names(species_id);
