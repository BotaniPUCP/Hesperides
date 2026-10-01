-- Propiedad de SPEC-005 §4.4.7. Puntos con nombre para buscar en el mapa e
-- importar ubicaciones. No forman parte de la jerarquia de zonas.
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('REFERENCE_CATEGORY', 'Categorías de referencia', 'Tipo de lugar al que alude una referencia', FALSE);

CREATE TABLE place_references (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(20)  NOT NULL,
    -- No es unico: un lugar tiene varios nombres y un nombre, varios puntos.
    name                VARCHAR(200) NOT NULL,
    category_item_id    BIGINT NOT NULL REFERENCES catalog_items(id),
    parent_reference_id BIGINT REFERENCES place_references(id),
    location            GEOMETRY(Point, 4326) NOT NULL,
    notes               TEXT,
    is_active           BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_place_references_not_self_parent
        CHECK (parent_reference_id IS NULL OR parent_reference_id <> id)
);

CREATE UNIQUE INDEX idx_place_references_code_active ON place_references(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_place_references_parent   ON place_references(parent_reference_id);
CREATE INDEX idx_place_references_category ON place_references(category_item_id);
CREATE INDEX idx_place_references_location ON place_references USING GIST(location);

-- Otra forma de llamar a una referencia. Se encuentra al buscar e importar, pero
-- no se dibuja: describe un lugar, no lo ubica.
CREATE TABLE place_reference_aliases (
    id           BIGSERIAL PRIMARY KEY,
    reference_id BIGINT NOT NULL REFERENCES place_references(id),
    alias        VARCHAR(200) NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP
);

CREATE INDEX idx_place_reference_aliases_reference ON place_reference_aliases(reference_id);
