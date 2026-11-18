-- Propiedad de SPEC-108 D-16. Pedido de Jean Piero del 15 nov 2026, revisando el mapa: la Sub-estación N-7 y el
-- Desconocido_03, prismas de OpenStreetMap de 8 m, miden la mitad. La huella no cambia. El trigger de
-- campus_buildings sube map_data_version.

UPDATE campus_buildings SET height_m = height_m / 2, updated_at = CURRENT_TIMESTAMP
 WHERE plan_key IN ('249a8c11-620a-48d6-98aa-df74d1f90f69', '3b943ec1-4267-425f-a701-b5822d06c6ce') AND deleted_at IS NULL;
