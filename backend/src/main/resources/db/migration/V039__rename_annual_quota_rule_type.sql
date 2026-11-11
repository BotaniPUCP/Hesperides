-- Propietaria: SPEC-101 (frecuencias de mantenimiento)
--
-- «Periodicidad estacional / cuota anual» pasa a llamarse «Cuota anual». La regla
-- solo cuenta ejecuciones dentro del año; las estaciones viven en el modelo por
-- rango de días, así que el nombre anterior hacía pensar en ellas sin razón.
-- Solo cambia la etiqueta: el código SEASONAL_PERIOD, que es lo que evalúa el
-- motor, sigue igual.

UPDATE catalog_items ci
SET label = 'Cuota anual', updated_at = CURRENT_TIMESTAMP
FROM catalog_types ct
WHERE ct.id = ci.catalog_type_id
  AND ct.code = 'FREQUENCY_RULE_TYPE'
  AND ci.code = 'SEASONAL_PERIOD';
