-- SPEC-200 R2: read-only input for vecindad.py. No migration and no inferred adjacency.
-- Run with psql -X -q -A -t -v ON_ERROR_STOP=1 -f this_file.sql > snapshot.json
BEGIN TRANSACTION READ ONLY;
WITH area_rows AS (
    SELECT z.id, z.code, z.name, z.boundary AS geom, z.area_m2
    FROM zones z
    JOIN catalog_items t ON t.id = z.zone_type_item_id
    JOIN catalog_types ct ON ct.id = t.catalog_type_id
    JOIN catalog_items landscape ON landscape.id = z.landscape_type_item_id
    WHERE z.deleted_at IS NULL AND z.is_active
      AND ct.code = 'ZONE_TYPE' AND t.code = 'SECTION'
      AND landscape.code IN ('GREEN_AREA', 'XEROPHYTIC')
), place_rows AS (
    -- Match the existing map's inherited outline, retaining the WHOLE V034 place outline.
    SELECT p.id, p.code, p.name, p.parent_place_id,
           COALESCE(o.geom, po.geom) AS geom,
           CASE WHEN o.geom IS NOT NULL THEN p.id ELSE pp.id END AS outline_source_place_id
    FROM places p
    LEFT JOIN place_outlines o ON o.place_id = p.id
    LEFT JOIN places pp ON pp.id = p.parent_place_id AND pp.deleted_at IS NULL
    LEFT JOIN place_outlines po ON po.place_id = pp.id
    WHERE p.deleted_at IS NULL
)
SELECT jsonb_build_object(
    'schemaVersion', 1,
    'places', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'code', code, 'name', name, 'parentPlaceId', parent_place_id,
        'outlineSourcePlaceId', outline_source_place_id,
        'geometryValid', COALESCE(ST_IsValid(geom), FALSE),
        'geometry', ST_AsGeoJSON(geom, 15)::jsonb) ORDER BY id) FROM place_rows), '[]'::jsonb),
    'zones', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'code', code, 'name', name, 'areaM2', area_m2,
        'geometryValid', COALESCE(ST_IsValid(geom), FALSE),
        'geometry', ST_AsGeoJSON(geom, 15)::jsonb) ORDER BY id) FROM area_rows), '[]'::jsonb)
);
COMMIT;
