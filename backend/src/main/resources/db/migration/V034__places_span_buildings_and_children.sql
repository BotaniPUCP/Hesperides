-- Un lugar no siempre es un único edificio. Dos casos:
--   * un mismo lugar que el mapa dibuja en varios bloques: el lugar tiene varios edificios;
--   * un complejo con partes que tienen nombre propio: su contorno es el de sus lugares hijos.

CREATE TABLE place_buildings (
    id          BIGSERIAL PRIMARY KEY,
    place_id    BIGINT    NOT NULL REFERENCES places(id),
    building_id BIGINT    NOT NULL REFERENCES campus_buildings(id),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

-- Un edificio es de un solo lugar. Lo hace cumplir el servicio, que puede decir de cuál;
-- un índice único haría fallar esta migración si dos lugares ya compartían edificio.
CREATE INDEX idx_place_buildings_place ON place_buildings (place_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_place_buildings_building ON place_buildings (building_id) WHERE deleted_at IS NULL;

INSERT INTO place_buildings (place_id, building_id)
SELECT id, building_id FROM places WHERE building_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE places ADD COLUMN outline_from_children BOOLEAN NOT NULL DEFAULT FALSE;

-- La vista lee la columna que se va: hay que quitarla primero y volver a crearla al final.
DROP VIEW place_outlines;
ALTER TABLE places DROP CONSTRAINT chk_places_single_outline;
ALTER TABLE places DROP COLUMN building_id;
-- Los edificios están en otra tabla: que no se mezclen con estas fuentes lo cuida el servicio.
ALTER TABLE places ADD CONSTRAINT chk_places_single_outline
    CHECK (num_nonnulls(zone_id, feature_id, own_geometry) + outline_from_children::int <= 1);

-- El contorno vigente de cada lugar. Un complejo suma el de sus hijos, y si un hijo
-- también es complejo, el de los suyos: el árbol tiene tres niveles como mucho.
CREATE VIEW place_outlines AS
WITH RECURSIVE own AS (
    SELECT p.id, p.parent_place_id, p.outline_from_children,
           COALESCE(p.own_geometry, z.boundary, f.geom,
                    (SELECT ST_Union(b.footprint) FROM place_buildings pb
                       JOIN campus_buildings b ON b.id = pb.building_id
                      WHERE pb.place_id = p.id AND pb.deleted_at IS NULL)) AS geom
      FROM places p
      LEFT JOIN zones z ON z.id = p.zone_id
      LEFT JOIN campus_features f ON f.id = p.feature_id
     WHERE p.deleted_at IS NULL
),
descendants AS (
    SELECT id AS root, id AS node FROM own WHERE outline_from_children
    UNION ALL
    SELECT d.root, c.id FROM descendants d
      JOIN own n ON n.id = d.node AND n.outline_from_children
      JOIN own c ON c.parent_place_id = d.node
)
SELECT o.id AS place_id,
       CASE WHEN o.outline_from_children
            THEN (SELECT ST_Union(c.geom) FROM descendants d JOIN own c ON c.id = d.node
                   WHERE d.root = o.id AND d.node <> o.id)
            ELSE o.geom END AS geom
  FROM own o;
