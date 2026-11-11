-- Propietaria: SPEC-101 (frecuencias de mantenimiento)
--
-- Nombres cortos para los tipos de regla. Se leen como insignia en la tabla de
-- frecuencias y en el formulario; los largos partían la insignia en varias
-- líneas. «Periodicidad estacional / cuota anual» además hacía pensar en
-- estaciones que esa regla no evalúa: solo cuenta ejecuciones dentro del año.
-- Solo cambian las etiquetas: los códigos, que es lo que evalúa el motor, siguen.

UPDATE catalog_items ci
SET label = v.label, updated_at = CURRENT_TIMESTAMP
FROM catalog_types ct, (VALUES
    ('INTERVAL_DAYS',   'Rango de días'),
    ('SEASONAL_PERIOD', 'Cuota anual'),
    ('ANNUAL_WINDOW',   'Ventana anual'),
    ('COVERAGE_CYCLE',  'Ciclo de cobertura'),
    ('ON_DEMAND',       'A demanda')
) AS v(code, label)
WHERE ct.id = ci.catalog_type_id
  AND ct.code = 'FREQUENCY_RULE_TYPE'
  AND ci.code = v.code;
