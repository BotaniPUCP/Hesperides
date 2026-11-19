-- Propiedad de SPEC-108 D-19. Pedido de Jean Piero del 15 nov 2026, revisando las rampas frente al CIA: el polígono
-- de AV-0409 era más grande que el jardín hundido que dibuja el modelo y se montaba sobre las rampas de su lado oeste;
-- el de AV-0408 se montaba sobre la rampa del lado del CIA. Como el visor quita el piso del modelo bajo los céspedes
-- (D-19), las rampas quedaban con un hueco.
-- AV-0409 pasa a ser el jardín del modelo (la planta de sus caras de arriba) sin las rampas: 519,1 m², antes 584,87.
-- AV-0408 pierde la esquina de ese jardín y la franja sobre la rampa: 461,9 m², antes 516. El área guardada es la de
-- su contorno, y su sector (SEC-VERDE-02) se recalcula como en V011: unión de sus áreas y suma de sus áreas.
-- El trigger de zones sube map_data_version.

UPDATE zones SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-77.079983421,-12.071587682],[-77.079783194,-12.071855386],[-77.079972917,-12.072030304],[-77.079975045,-12.071940435],[-77.079980886,-12.071740071],[-77.079983421,-12.071587682]]]]}'), 4326), updated_at = CURRENT_TIMESTAMP
 WHERE code = 'AV-0409' AND deleted_at IS NULL;

UPDATE zones SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-77.07997544,-12.072032603],[-77.079984126,-12.072035409],[-77.079973045,-12.072024919],[-77.079972917,-12.072030304],[-77.079783358,-12.071855537],[-77.079771082,-12.071871951],[-77.079823482,-12.072107597],[-77.079833637,-12.072129993],[-77.07983748,-12.072138468],[-77.079903298,-12.072283622],[-77.079928017,-12.072231506],[-77.079928453,-12.072230155],[-77.079911383,-12.072224639],[-77.079911381,-12.072224639],[-77.079911379,-12.072224638],[-77.079911378,-12.072224636],[-77.079911377,-12.072224634],[-77.079911376,-12.072224633],[-77.079911376,-12.072224631],[-77.079911376,-12.072224629],[-77.079911376,-12.072224627],[-77.079975426,-12.07203261],[-77.079975427,-12.072032609],[-77.079975427,-12.072032608],[-77.079975428,-12.072032607],[-77.079975428,-12.072032607],[-77.079975429,-12.072032606],[-77.079975429,-12.072032605],[-77.07997543,-12.072032605],[-77.07997543,-12.072032604],[-77.07997543,-12.072032604],[-77.079975432,-12.072032603],[-77.079975432,-12.072032603],[-77.079975434,-12.072032602],[-77.079975436,-12.072032602],[-77.079975436,-12.072032602],[-77.079975436,-12.072032602],[-77.079975438,-12.072032602],[-77.079975438,-12.072032602],[-77.079975439,-12.072032603],[-77.07997544,-12.072032603],[-77.07997544,-12.072032603]]]]}'), 4326), updated_at = CURRENT_TIMESTAMP
 WHERE code = 'AV-0408' AND deleted_at IS NULL;

UPDATE zones SET area_m2 = ROUND(ST_Area(boundary::geography)::numeric, 2)
 WHERE code IN ('AV-0408', 'AV-0409') AND deleted_at IS NULL;

UPDATE zones s SET boundary = u.geom, area_m2 = u.area, updated_at = CURRENT_TIMESTAMP FROM (
    SELECT parent_zone_id AS id, ST_Multi(ST_Union(boundary)) AS geom, SUM(area_m2) AS area
      FROM zones
     WHERE parent_zone_id = (SELECT id FROM zones WHERE code = 'SEC-VERDE-02' AND deleted_at IS NULL) AND deleted_at IS NULL
     GROUP BY parent_zone_id
) u WHERE s.id = u.id;
