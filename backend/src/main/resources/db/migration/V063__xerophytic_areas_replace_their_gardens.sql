-- Propiedad de SPEC-102 §4.3 (enmienda del 15 nov 2026). Pedido de Jean Piero: ocho jardines de V011 repetían el
-- polígono de un área xerofítica (scripts/mapa/zonas.py crea una sección por cada área de xerofitica.geojson, que trae
-- los mismos polígonos que areas_verdes.geojson). Esas áreas son xerofíticas, no jardines:
--   1. cada xerofítica hereda de su jardín el uso, el riego actual, el proyecto de riego, el sector, el código del
--      mapa del cliente y la reserva; conserva su código, su nombre, su clase («Ornato») y su polígono;
--   2. todo conjunto que tenía uno de esos jardines pasa a tener su xerofítica, una sola vez;
--   3. los jardines se borran lógicamente, y también XE-0007, que cae entero dentro de XE-0005 (E 31): AV-0455 estaba
--      dentro de AV-0383 y se contaba dos veces en SEC-VERDE-02.
-- «Mismo polígono» es con menos de 0,01 m² de diferencia: los pares coinciden al 100 %, pero no vértice a vértice.
-- El contorno de los sectores no cambia (cada xerofítica es el mismo polígono que su jardín); su área, que es la suma
-- de sus secciones (V011), se recalcula. Si algún par ya no coincide, falla sin tocar nada. El trigger de zones sube
-- map_data_version.

CREATE TEMP TABLE xerophytic_replacements (old_code VARCHAR(30) PRIMARY KEY, new_code VARCHAR(30) NOT NULL, inherits BOOLEAN NOT NULL)
    ON COMMIT DROP;
INSERT INTO xerophytic_replacements VALUES
    ('AV-0248', 'XE-0001', TRUE), ('AV-0253', 'XE-0002', TRUE), ('AV-0264', 'XE-0003', TRUE), ('AV-0287', 'XE-0004', TRUE),
    ('AV-0383', 'XE-0005', TRUE), ('AV-0466', 'XE-0008', TRUE), ('AV-0483', 'XE-0009', TRUE),
    ('AV-0455', 'XE-0005', FALSE), ('XE-0007', 'XE-0005', FALSE);

DO $$
DECLARE
    broken TEXT;
BEGIN
    SELECT string_agg(r.new_code || ' / ' || r.old_code, ', ' ORDER BY r.old_code) INTO broken
      FROM xerophytic_replacements r
      LEFT JOIN zones o ON o.code = r.old_code AND o.deleted_at IS NULL
      LEFT JOIN zones n ON n.code = r.new_code AND n.deleted_at IS NULL
     -- Los pares coinciden al 100 % pero no vértice a vértice (redondeo del GeoJSON): se comparan las áreas que sobran.
     WHERE o.id IS NULL OR n.id IS NULL
        OR (r.inherits AND ST_Area(ST_SymDifference(o.boundary, n.boundary)::geography) >= 0.01)
        OR (NOT r.inherits AND ST_Area(ST_Difference(o.boundary, n.boundary)::geography) >= 0.01);
    IF broken IS NOT NULL THEN
        RAISE EXCEPTION 'V063: estos pares ya no son el mismo polígono (o el de adentro ya no cae dentro): %. Revisar antes de reemplazar.', broken;
    END IF;
END $$;

UPDATE zones n SET
       use_type_item_id = o.use_type_item_id,
       irrigation_current_item_id = o.irrigation_current_item_id,
       irrigation_project_item_id = o.irrigation_project_item_id,
       parent_zone_id = o.parent_zone_id,
       map_code = o.map_code,
       is_reservable = o.is_reservable,
       reservation_owner_item_id = o.reservation_owner_item_id,
       updated_at = CURRENT_TIMESTAMP
  FROM xerophytic_replacements r
  JOIN zones o ON o.code = r.old_code AND o.deleted_at IS NULL
 WHERE r.inherits AND n.code = r.new_code AND n.deleted_at IS NULL;

CREATE TEMP TABLE xerophytic_set_links ON COMMIT DROP AS
SELECT gz.id AS link_id, gz.set_id, n.id AS new_zone_id
  FROM green_area_set_zones gz
  JOIN zones o ON o.id = gz.zone_id
  JOIN xerophytic_replacements r ON r.old_code = o.code
  JOIN zones n ON n.code = r.new_code AND n.deleted_at IS NULL
 WHERE gz.deleted_at IS NULL AND o.deleted_at IS NULL;

INSERT INTO green_area_set_zones (set_id, zone_id)
SELECT DISTINCT l.set_id, l.new_zone_id FROM xerophytic_set_links l
 WHERE NOT EXISTS (SELECT 1 FROM green_area_set_zones gz
                    WHERE gz.set_id = l.set_id AND gz.zone_id = l.new_zone_id AND gz.deleted_at IS NULL);

UPDATE green_area_set_zones SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE id IN (SELECT link_id FROM xerophytic_set_links);

-- Un conjunto cambió de secciones: quien lo tenga abierto con la versión anterior debe recargarlo.
UPDATE green_area_sets SET version = version + 1, updated_at = CURRENT_TIMESTAMP
 WHERE id IN (SELECT DISTINCT set_id FROM xerophytic_set_links);

UPDATE zones SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE code IN (SELECT old_code FROM xerophytic_replacements) AND deleted_at IS NULL;

UPDATE zones s SET area_m2 = u.area, updated_at = CURRENT_TIMESTAMP FROM (
    SELECT parent_zone_id AS id, SUM(area_m2) AS area
      FROM zones
     WHERE parent_zone_id IN (SELECT id FROM zones WHERE code IN ('SEC-VERDE-02', 'SEC-VERDE-03') AND deleted_at IS NULL)
       AND deleted_at IS NULL
     GROUP BY parent_zone_id
) u WHERE s.id = u.id AND s.area_m2 IS DISTINCT FROM u.area;
