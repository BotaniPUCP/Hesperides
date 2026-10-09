-- Catálogo de lugares: edificios, jardines, estacionamientos y complejos, con
-- perspectivas fotografiadas desde sus alrededores para ubicar un trabajo sin
-- volver al sitio. Convive con place_references hasta migrarlas (place_reference_links,
-- en una migración posterior).

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    -- De sistema: el código se comporta distinto según el tipo (perspectivas solo afuera).
    ('PLACE_KIND', 'Tipos de lugar', 'Exterior o interior', TRUE),
    -- De sistema: cada lado tiene su regla de nombre y de unicidad en el Engine.
    ('PERSPECTIVE_SIDE', 'Lados de perspectiva', 'Frente, espalda o al lado de un lugar', TRUE),
    ('INTERIOR_VIEW', 'Vistas interiores', 'Qué muestra una foto de un lugar interior', FALSE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'PLACE_KIND'), 'OUTDOOR', 'Exterior', 1),
    ((SELECT id FROM catalog_types WHERE code = 'PLACE_KIND'), 'INDOOR',  'Interior', 2),
    ((SELECT id FROM catalog_types WHERE code = 'PERSPECTIVE_SIDE'), 'FRONT', 'Frente',   1),
    ((SELECT id FROM catalog_types WHERE code = 'PERSPECTIVE_SIDE'), 'BACK',  'Espalda',  2),
    ((SELECT id FROM catalog_types WHERE code = 'PERSPECTIVE_SIDE'), 'SIDE',  'Al lado',  3),
    ((SELECT id FROM catalog_types WHERE code = 'INTERIOR_VIEW'), 'CORRIDOR', 'Pasillo',  1),
    ((SELECT id FROM catalog_types WHERE code = 'INTERIOR_VIEW'), 'STAIRS',   'Escalera', 2),
    ((SELECT id FROM catalog_types WHERE code = 'INTERIOR_VIEW'), 'ELEVATOR', 'Ascensor', 3),
    ((SELECT id FROM catalog_types WHERE code = 'INTERIOR_VIEW'), 'TERRACE',  'Terraza',  4),
    ((SELECT id FROM catalog_types WHERE code = 'INTERIOR_VIEW'), 'HALL',     'Hall',     5);

CREATE SEQUENCE place_code_seq;

CREATE TABLE places (
    id               BIGSERIAL PRIMARY KEY,
    code             VARCHAR(20)  NOT NULL UNIQUE DEFAULT 'LUG-' || lpad(nextval('place_code_seq')::text, 4, '0'),
    name             VARCHAR(200) NOT NULL,
    kind_item_id     BIGINT       NOT NULL REFERENCES catalog_items(id),
    -- Las mismas 24 categorías de las referencias: una sola lista para ambas.
    category_item_id BIGINT       NOT NULL REFERENCES catalog_items(id),
    parent_place_id  BIGINT       REFERENCES places(id),
    -- El contorno se reutiliza del mapa cuando existe; si no, se dibuja. Uno
    -- solo o ninguno (interior: toma el de su padre). La regla «exterior exige
    -- contorno» la hace cumplir el servicio, que conoce el código del tipo.
    building_id      BIGINT       REFERENCES campus_buildings(id),
    zone_id          BIGINT       REFERENCES zones(id),
    feature_id       BIGINT       REFERENCES campus_features(id),
    own_geometry     geometry(Geometry, 4326),
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP,
    CONSTRAINT chk_places_not_own_parent CHECK (parent_place_id IS NULL OR parent_place_id <> id),
    CONSTRAINT chk_places_single_outline CHECK (num_nonnulls(building_id, zone_id, feature_id, own_geometry) <= 1)
);

-- Dos lugares vigentes con el mismo nombre bajo el mismo padre serían el mismo
-- lugar escrito dos veces: justo lo que el catálogo viene a ordenar.
CREATE UNIQUE INDEX idx_places_name_per_parent ON places (COALESCE(parent_place_id, 0), lower(name))
    WHERE deleted_at IS NULL;
CREATE INDEX idx_places_parent ON places (parent_place_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_places_own_geometry ON places USING gist (own_geometry);

CREATE TABLE place_aliases (
    id         BIGSERIAL PRIMARY KEY,
    place_id   BIGINT       NOT NULL REFERENCES places(id),
    alias      VARCHAR(200) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_place_aliases_unique ON place_aliases (place_id, lower(alias)) WHERE deleted_at IS NULL;

CREATE TABLE place_perspectives (
    id                BIGSERIAL PRIMARY KEY,
    place_id          BIGINT        NOT NULL REFERENCES places(id),
    side_item_id      BIGINT        NOT NULL REFERENCES catalog_items(id),
    -- Desde dónde se tomaron las fotos y hacia dónde miran: es de la
    -- perspectiva, no de cada foto.
    location          geometry(Point, 4326) NOT NULL,
    heading_deg       NUMERIC(5, 2) NOT NULL,
    -- Calculados por el Engine al guardar. Se guardan, no se calculan al leer,
    -- porque un reporte necesita que el nombre no cambie mientras lo lee alguien.
    compass           VARCHAR(20),
    landmark_place_id BIGINT        REFERENCES places(id),
    display_name      VARCHAR(400)  NOT NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMP,
    CONSTRAINT chk_place_perspectives_heading CHECK (heading_deg >= 0 AND heading_deg < 360)
);

CREATE INDEX idx_place_perspectives_place ON place_perspectives (place_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_place_perspectives_location ON place_perspectives USING gist (location);

CREATE TABLE place_photos (
    id                    BIGSERIAL PRIMARY KEY,
    place_id              BIGINT       NOT NULL REFERENCES places(id),
    -- Sin perspectiva ni vista interior: es la foto principal del lugar.
    perspective_id        BIGINT       REFERENCES place_perspectives(id),
    interior_view_item_id BIGINT       REFERENCES catalog_items(id),
    storage_key           VARCHAR(500) NOT NULL,
    thumbnail_storage_key VARCHAR(500) NOT NULL,
    content_type          VARCHAR(100) NOT NULL,
    size_bytes            BIGINT       NOT NULL CHECK (size_bytes > 0),
    sort_order            INTEGER      NOT NULL CHECK (sort_order > 0),
    author                VARCHAR(255),
    taken_on              DATE,
    uploaded_by_user_id   BIGINT       NOT NULL REFERENCES users(id),
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP,
    CONSTRAINT chk_place_photos_one_purpose CHECK (perspective_id IS NULL OR interior_view_item_id IS NULL)
);

CREATE UNIQUE INDEX idx_place_photos_order ON place_photos (place_id, COALESCE(perspective_id, 0), sort_order)
    WHERE deleted_at IS NULL;

-- El contorno vigente de cada lugar, venga de donde venga. Los interiores no
-- tienen: se ubican por su padre. Las consultas de distancia leen solo esto.
CREATE VIEW place_outlines AS
SELECT p.id AS place_id, COALESCE(p.own_geometry, b.footprint, z.boundary, f.geom) AS geom
  FROM places p
  LEFT JOIN campus_buildings b ON b.id = p.building_id
  LEFT JOIN zones z ON z.id = p.zone_id
  LEFT JOIN campus_features f ON f.id = p.feature_id
 WHERE p.deleted_at IS NULL;
