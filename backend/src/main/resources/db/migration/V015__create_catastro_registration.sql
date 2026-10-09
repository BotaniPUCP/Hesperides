-- Propiedad de SPEC-103 (registro del catastro), con SPEC-002 §4.5 y §5.4.
--
-- Evaluaciones de los ejemplares, fotos en almacenamiento propio (nunca el
-- binario en la base) y trazabilidad de las cargas por CSV.

-- Lotes de carga. Se crean en la vista previa y se confirman despues: lo que
-- se confirma es exactamente lo que se vio (SPEC-103 §3.1).
CREATE TABLE import_batches (
    id                BIGSERIAL PRIMARY KEY,
    kind              VARCHAR(30)  NOT NULL
        CHECK (kind IN ('specimens', 'waste-bins', 'drinking-fountains', 'species-photos')),
    status            VARCHAR(12)  NOT NULL DEFAULT 'PREVIEWED'
        CHECK (status IN ('PREVIEWED', 'CONFIRMED', 'EXPIRED')),
    file_name         VARCHAR(255) NOT NULL,
    created_by_user_id BIGINT      NOT NULL REFERENCES users(id),
    -- El informe de la vista previa y, al confirmar, el resumen del lote.
    report            JSONB        NOT NULL,
    expires_at        TIMESTAMP    NOT NULL,
    confirmed_at      TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMP
);

CREATE INDEX idx_import_batches_status ON import_batches(status, expires_at);

ALTER TABLE green_elements ADD COLUMN import_batch_id BIGINT REFERENCES import_batches(id);
ALTER TABLE campus_features ADD COLUMN import_batch_id BIGINT REFERENCES import_batches(id);

-- El estado de un arbol cambia: cada revision queda en el historial con su
-- fecha (SPEC-103 D-06). Nulo significa «no se evaluo», distinto de «no».
CREATE TABLE green_element_assessments (
    id                             BIGSERIAL PRIMARY KEY,
    green_element_id               BIGINT  NOT NULL REFERENCES green_elements(id),
    assessed_on                    DATE    NOT NULL,
    -- Nulo cuando la evaluacion vino de una fuente y no de un usuario.
    assessed_by_user_id            BIGINT REFERENCES users(id),
    has_disease                    BOOLEAN,
    has_pests                      BOOLEAN,
    has_mechanical_damage          BOOLEAN,
    is_leaning                     BOOLEAN,
    has_dead_branches              BOOLEAN,
    has_cavities_or_rot            BOOLEAN,
    has_exposed_roots              BOOLEAN,
    interferes_with_infrastructure BOOLEAN,
    -- Texto libre hasta que el cliente fije la lista (SPEC-103 P-01).
    recommended_management         VARCHAR(200),
    observation                    TEXT,
    notes                          TEXT,
    import_batch_id                BIGINT REFERENCES import_batches(id),
    created_at                     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                     TIMESTAMP
);

CREATE INDEX idx_green_element_assessments_element ON green_element_assessments(green_element_id, assessed_on DESC);

-- Fotos. La base guarda la clave del objeto en el almacenamiento (un directorio
-- en desarrollo y on-premise, S3 en AWS), nunca el binario (SPEC-002 §5.4).
CREATE TABLE green_element_attachments (
    id                    BIGSERIAL PRIMARY KEY,
    green_element_id      BIGINT       NOT NULL REFERENCES green_elements(id),
    storage_key           VARCHAR(500) NOT NULL,
    thumbnail_storage_key VARCHAR(500) NOT NULL,
    original_filename     VARCHAR(255),
    content_type          VARCHAR(100) NOT NULL,
    size_bytes            BIGINT       NOT NULL CHECK (size_bytes > 0),
    caption               VARCHAR(255),
    -- El enlace del que se descargo, si vino de un CSV o del catastro.
    source_url            VARCHAR(500),
    uploaded_by_user_id   BIGINT       NOT NULL REFERENCES users(id),
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);

CREATE INDEX idx_green_element_attachments_element ON green_element_attachments(green_element_id);

CREATE TABLE campus_feature_attachments (
    id                    BIGSERIAL PRIMARY KEY,
    campus_feature_id     BIGINT       NOT NULL REFERENCES campus_features(id),
    storage_key           VARCHAR(500) NOT NULL,
    thumbnail_storage_key VARCHAR(500) NOT NULL,
    original_filename     VARCHAR(255),
    content_type          VARCHAR(100) NOT NULL,
    size_bytes            BIGINT       NOT NULL CHECK (size_bytes > 0),
    source_url            VARCHAR(500),
    uploaded_by_user_id   BIGINT       NOT NULL REFERENCES users(id),
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);

CREATE INDEX idx_campus_feature_attachments_feature ON campus_feature_attachments(campus_feature_id);

-- Foto generica de la especie (SPEC-103 D-08): una vigente por especie.
CREATE TABLE species_photos (
    id                    BIGSERIAL PRIMARY KEY,
    species_id            BIGINT       NOT NULL REFERENCES species(id),
    storage_key           VARCHAR(500) NOT NULL,
    thumbnail_storage_key VARCHAR(500) NOT NULL,
    content_type          VARCHAR(100) NOT NULL,
    size_bytes            BIGINT       NOT NULL CHECK (size_bytes > 0),
    source_url            VARCHAR(500),
    uploaded_by_user_id   BIGINT       NOT NULL REFERENCES users(id),
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);

CREATE UNIQUE INDEX idx_species_photos_current ON species_photos(species_id) WHERE deleted_at IS NULL;

-- Catalogos de los componentes con estandar de carga (SPEC-103 §4.3).
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('FOUNTAIN_KIND', 'Tipos de bebedero', 'Fuente o llenador de botella', FALSE),
    ('FOUNTAIN_STATUS', 'Estados de bebedero', 'Si el bebedero funciona', FALSE),
    ('WASTE_STREAM', 'Tipos de residuo', 'Los residuos que recibe un tacho', FALSE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'FEATURE_TYPE'), 'DRINKING_FOUNTAIN', 'Bebedero', 7),
    ((SELECT id FROM catalog_types WHERE code = 'SPECIES_ORIGIN'), 'INTRODUCED', 'Introducida', 1),
    ((SELECT id FROM catalog_types WHERE code = 'FOUNTAIN_KIND'), 'FOUNTAIN',      'Fuente',               1),
    ((SELECT id FROM catalog_types WHERE code = 'FOUNTAIN_KIND'), 'BOTTLE_FILLER', 'Llenador de botella',  2),
    ((SELECT id FROM catalog_types WHERE code = 'FOUNTAIN_KIND'), 'UNKNOWN',       'Sin dato',             3),
    ((SELECT id FROM catalog_types WHERE code = 'FOUNTAIN_STATUS'), 'OPERATIONAL',    'Operativo',       1),
    ((SELECT id FROM catalog_types WHERE code = 'FOUNTAIN_STATUS'), 'NEW',            'Nuevo',           2),
    ((SELECT id FROM catalog_types WHERE code = 'FOUNTAIN_STATUS'), 'REMODELING',     'En remodelación', 3),
    ((SELECT id FROM catalog_types WHERE code = 'FOUNTAIN_STATUS'), 'DETERIORATED',   'En deterioro',    4),
    ((SELECT id FROM catalog_types WHERE code = 'FOUNTAIN_STATUS'), 'DECOMMISSIONED', 'De baja',         5),
    -- Las once columnas de residuos del registro de baterias de tachos.
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'NON_RECYCLABLE',      'No Aprovechables',     1),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'PAPER',               'Papel y Cartón',       2),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'PLASTIC',             'Plástico',             3),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'GLASS',               'Vidrio',               4),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'BATTERIES',           'Pilas',                5),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'HAZARDOUS',           'Peligrosos',           6),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'WEEE',                'RAEE',                 7),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'METALS',              'Metales',              8),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'ANIQUEM',             'Aniquem',              9),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'INTERMEDIATE_PLASTIC','Intermedios Plastico', 10),
    ((SELECT id FROM catalog_types WHERE code = 'WASTE_STREAM'), 'INTERMEDIATE_METAL',  'Intermedios Metal',    11);
