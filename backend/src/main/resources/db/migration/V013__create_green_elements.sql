-- Propiedad de SPEC-002 §4.5, con las enmiendas de SPEC-005 §4.7 (legacy_code),
-- C-08 (procedencia de la altura) y del inventario verde
-- (docs/inventario-verde/README.md §2).

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('GREEN_ELEMENT_TYPE', 'Tipos de elemento verde', 'Si el registro es un ejemplar o una agrupación', FALSE),
    ('ELEMENT_CONDITION', 'Estados de elementos verdes', 'Estado fitosanitario o general', FALSE);

-- Los jardines son secciones (SPEC-005 §4.4) y el porte lo da la especie: lo
-- que distingue a un registro del catastro es si es una planta o una mata.
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'GREEN_ELEMENT_TYPE'), 'INDIVIDUAL', 'Ejemplar',   1),
    ((SELECT id FROM catalog_types WHERE code = 'GREEN_ELEMENT_TYPE'), 'GROUP',      'Agrupación', 2);

-- El codigo propio (EV-000001) va en el QR y en las ordenes de trabajo: es
-- neutro y nunca cambia, por eso no lleva tipo, especie ni seccion.
CREATE SEQUENCE green_element_code_seq;

CREATE TABLE green_elements (
    id                    BIGSERIAL PRIMARY KEY,
    code                  VARCHAR(12) NOT NULL
        DEFAULT ('EV-' || LPAD(nextval('green_element_code_seq')::TEXT, 6, '0')),
    name                  VARCHAR(150),
    element_type_item_id  BIGINT NOT NULL REFERENCES catalog_items(id),
    species_id            BIGINT REFERENCES species(id),
    condition_item_id     BIGINT REFERENCES catalog_items(id),
    -- Sin zone_id: la seccion se calcula por posicion, como la zona de
    -- supervision. Un tercio del catastro esta en veredas y plazas, fuera de
    -- toda seccion, y una seccion redibujada dejaria desactualizado lo guardado.
    location              GEOMETRY(Point, 4326),
    area                  GEOMETRY(Polygon, 4326),
    quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    planting_date         DATE,

    -- Lo que dijo la fuente, tal cual. Ninguno es unico: la «Referencia» la
    -- puso cada levantamiento y las placas antiguas se reciclaron.
    source_reference      VARCHAR(40),
    source_location       VARCHAR(150),
    legacy_code           VARCHAR(40),
    photo_url             VARCHAR(500),

    -- Medidas. La altura decide quien poda (C-08): solo cuenta si se midio, y
    -- ninguna altura ilustrativa se guarda.
    height_m              NUMERIC(5, 2) CHECK (height_m IS NULL OR height_m > 0),
    trunk_height_m        NUMERIC(5, 2) CHECK (trunk_height_m IS NULL OR trunk_height_m >= 0),
    -- 0 es una medida real: una planta que no llega a 1.3 m no tiene DAP.
    dbh_cm                NUMERIC(6, 1) CHECK (dbh_cm IS NULL OR dbh_cm >= 0),
    crown_radius_m        NUMERIC(5, 2) CHECK (crown_radius_m IS NULL OR crown_radius_m > 0),
    is_banded             BOOLEAN,
    data_source           VARCHAR(10) NOT NULL DEFAULT 'UNKNOWN'
        CHECK (data_source IN ('MEASURED', 'GENERIC', 'UNKNOWN')),
    measured_at           DATE,
    measured_by_user_id   BIGINT REFERENCES users(id),

    registered_by_user_id BIGINT NOT NULL REFERENCES users(id),
    notes                 TEXT,
    is_active             BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP,

    CONSTRAINT chk_green_elements_geometry CHECK (location IS NOT NULL OR area IS NOT NULL),
    -- UNKNOWN dice «nadie lo sabe»: con una altura guardada mentiria. Que
    -- GENERIC solo valga para arbustos y herbaceas (C-08) es regla del servicio.
    CONSTRAINT chk_green_elements_height_known CHECK (height_m IS NULL OR data_source <> 'UNKNOWN')
);

ALTER SEQUENCE green_element_code_seq OWNED BY green_elements.code;

CREATE UNIQUE INDEX idx_green_elements_code_active ON green_elements(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_green_elements_species_id ON green_elements(species_id);
CREATE INDEX idx_green_elements_element_type ON green_elements(element_type_item_id);
CREATE INDEX idx_green_elements_source_reference ON green_elements(source_reference);
CREATE INDEX idx_green_elements_legacy_code ON green_elements(legacy_code) WHERE legacy_code IS NOT NULL;
CREATE INDEX idx_green_elements_location ON green_elements USING GIST(location);
CREATE INDEX idx_green_elements_area ON green_elements USING GIST(area);

-- El mapa dibuja la vegetacion: un cambio aqui invalida su copia local.
CREATE TRIGGER trg_species_map_version AFTER INSERT OR UPDATE OR DELETE ON species
    FOR EACH STATEMENT EXECUTE FUNCTION bump_map_data_version();
CREATE TRIGGER trg_green_elements_map_version AFTER INSERT OR UPDATE OR DELETE ON green_elements
    FOR EACH STATEMENT EXECUTE FUNCTION bump_map_data_version();
