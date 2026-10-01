-- Propiedad de SPEC-102 §4.2. Mobiliario y elementos del campus que se ven y se
-- buscan en el mapa, sin reglas propias todavia. Cuando un tipo gane
-- comportamiento (p. ej. incidencias sobre un tacho), se promueve a su tabla.
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('FEATURE_TYPE', 'Tipos de elemento del campus', 'Mobiliario y elementos que muestra el mapa', TRUE);

-- is_system: el visor dibuja cada tipo con un modelo propio; un tipo creado
-- desde la pantalla de catalogos seria una capa que nadie sabe dibujar.
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'FEATURE_TYPE'), 'CAMPUS_BOUNDARY', 'Límite del campus', 1),
    ((SELECT id FROM catalog_types WHERE code = 'FEATURE_TYPE'), 'WASTE_BIN',       'Tacho',             2),
    ((SELECT id FROM catalog_types WHERE code = 'FEATURE_TYPE'), 'GATE',            'Puerta',            3),
    ((SELECT id FROM catalog_types WHERE code = 'FEATURE_TYPE'), 'FAUNA',           'Fauna',             4),
    ((SELECT id FROM catalog_types WHERE code = 'FEATURE_TYPE'), 'PARKING',         'Estacionamiento',   5),
    ((SELECT id FROM catalog_types WHERE code = 'FEATURE_TYPE'), 'RISKY_SIDEWALK',  'Vereda en riesgo',  6);

CREATE TABLE campus_features (
    id                   BIGSERIAL PRIMARY KEY,
    code                 VARCHAR(30),
    feature_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    name                 VARCHAR(200),
    -- Punto o poligono segun el tipo: un tacho es un punto, un estacionamiento
    -- un poligono.
    geom                 GEOMETRY(Geometry, 4326) NOT NULL,
    attributes           JSONB,
    is_active            BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMP
);

CREATE INDEX idx_campus_features_type ON campus_features(feature_type_item_id);
CREATE INDEX idx_campus_features_geom ON campus_features USING GIST(geom);
