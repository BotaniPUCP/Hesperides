-- Propiedad de SPEC-102 §4.1. Edificios del campus y de su entorno.
--
-- `source` separa el origen de cada contorno. Mientras haya filas 'OSM', el mapa
-- debe mostrar la atribucion a OpenStreetMap (licencia ODbL). Cuando lleguen los
-- planos de la PUCP, los contornos pasan a 'PUCP' y, sin filas 'OSM', la
-- atribucion deja de ser obligatoria.
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('BUILDING_CATEGORY', 'Categorías de edificio', 'Agrupación de los edificios del vocabulario', FALSE);

CREATE TABLE campus_buildings (
    id               BIGSERIAL PRIMARY KEY,
    source           VARCHAR(10) NOT NULL CHECK (source IN ('OSM', 'PUCP')),
    source_ref       VARCHAR(40),
    name             VARCHAR(200),
    -- TRUE si el nombre se dedujo y nadie del cliente lo confirmo.
    is_inferred_name BOOLEAN NOT NULL DEFAULT FALSE,
    category_item_id BIGINT REFERENCES catalog_items(id),
    -- 162 edificios del campus y 255 del entorno. Solo los del campus entran al
    -- algoritmo de cercania; los del entorno se dibujan como contexto.
    is_campus        BOOLEAN NOT NULL,
    footprint        GEOMETRY(MultiPolygon, 4326) NOT NULL,
    height_m         NUMERIC(6, 2),
    levels           SMALLINT,
    is_active        BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP
);

CREATE INDEX idx_campus_buildings_footprint ON campus_buildings USING GIST(footprint);
CREATE INDEX idx_campus_buildings_source_ref ON campus_buildings(source_ref);

CREATE TABLE campus_building_aliases (
    id          BIGSERIAL PRIMARY KEY,
    building_id BIGINT NOT NULL REFERENCES campus_buildings(id),
    alias       VARCHAR(200) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

CREATE INDEX idx_campus_building_aliases_building ON campus_building_aliases(building_id);
