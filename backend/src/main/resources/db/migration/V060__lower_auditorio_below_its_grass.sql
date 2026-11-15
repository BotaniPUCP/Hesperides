-- Propiedad de SPEC-108 D-16. Pedido de Jean Piero del 15 nov 2026, al ver V059 en el mapa: el Auditorio Juan Pablo II
-- debe ir más abajo, porque desde arriba su techo bajo seguía tapando el césped del jardín hundido (AV-0166 y AV-0170,
-- a −0,05 m). Baja 1,065 m más, 5 m en total (el `liftM` de su ajuste en edificios-plano.json). Su base y su alto
-- bajan lo mismo; la huella no cambia. El trigger de campus_buildings sube map_data_version.

UPDATE campus_buildings SET height_m = height_m - 1.065, base_m = base_m - 1.065, updated_at = CURRENT_TIMESTAMP
 WHERE plan_key = '0587a436-a6b7-4214-8d74-9b4883986521' AND deleted_at IS NULL;
