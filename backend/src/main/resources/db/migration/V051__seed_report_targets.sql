-- Owner: SPEC-202 §4. Metas del resumen de dirección; sin tablas nuevas.
-- Valor inicial: la meta que el cliente declaró (dominio §7, C16): 100 % al mes.
-- El ADMIN las cambia en /admin/parametros; SystemParametersService valida el rango 1 a 100.
INSERT INTO system_parameters (code, label, value, value_type, description, is_editable)
SELECT s.code, s.label, s.value, s.value_type, s.description, TRUE
FROM (VALUES
    ('REPORT_COVERAGE_TARGET_PERCENT', 'Meta de cobertura mensual (%)', '100', 'DECIMAL',
     'Porcentaje de la superficie de áreas verdes que debe recibir mantenimiento aprobado cada mes'),
    ('REPORT_IRRIGATION_TARGET_PERCENT', 'Meta de riego mensual (%)', '100', 'DECIMAL',
     'Porcentaje de la superficie de áreas verdes que debe regarse al menos una vez al mes')
) AS s(code, label, value, value_type, description)
WHERE NOT EXISTS (
    SELECT 1 FROM system_parameters p WHERE p.code = s.code AND p.deleted_at IS NULL);
