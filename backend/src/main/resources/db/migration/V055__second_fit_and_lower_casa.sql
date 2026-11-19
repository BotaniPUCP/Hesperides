-- Propiedad de SPEC-108 D-16. Segunda tanda del pedido de Jean Piero del 14 nov 2026, revisando el mapa con V054.
-- Desconocido_05 (malla del plano) se corre 1,35 m al centro del hueco de su pasto; su malla lleva el mismo ajuste
-- en el manifiesto. La casa autosostenible (prisma de OpenStreetMap) baja a la mitad de su altura: «no es tan alto».
-- El trigger de campus_buildings sube map_data_version.

-- Desconocido_05: corrido al centro del hueco de su pasto, sin cambiar su tamaño.
UPDATE campus_buildings SET footprint = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-77.07943801,-12.07334129],[-77.07941631,-12.07330456],[-77.07933452,-12.07335135],[-77.07935622,-12.07338808],[-77.07943801,-12.07334129]]]]}'), 4326)), updated_at = CURRENT_TIMESTAMP
 WHERE plan_key = '16717028-8cbc-4d0f-a3cd-81599caa6223' AND deleted_at IS NULL;

-- Prototipo Casa Autosostenible: de 8 m a 4 m.
UPDATE campus_buildings SET height_m = 4.00, updated_at = CURRENT_TIMESTAMP
 WHERE plan_key = '3bd329ba-5612-4e0d-bfd3-2a3142bf81a8' AND deleted_at IS NULL;
