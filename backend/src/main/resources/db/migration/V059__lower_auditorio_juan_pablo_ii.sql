-- Propiedad de SPEC-108 D-16. Pedido de Jean Piero del 15 nov 2026, revisando el mapa: el Auditorio Juan Pablo II
-- baja 3,935 m (el `liftM` de su ajuste en edificios-plano.json). Así su escalera en L llega al fondo de la zanja del
-- jardín hundido y su losa queda en la terraza de césped. Su base y su alto bajan lo mismo; la huella no cambia.
-- El trigger de campus_buildings sube map_data_version.

UPDATE campus_buildings SET height_m = height_m - 3.935, base_m = base_m - 3.935, updated_at = CURRENT_TIMESTAMP
 WHERE plan_key = '0587a436-a6b7-4214-8d74-9b4883986521' AND deleted_at IS NULL;
