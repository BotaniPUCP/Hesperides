-- M7/D-02. The interval remains unset until it is agreed by the responsible team.
INSERT INTO system_parameters (code, label, value, value_type, description, is_editable)
VALUES ('IRRIGATION_COVERAGE_MAX_DAYS', 'Intervalo máximo sin riego (días)', '', 'INTEGER',
        'Intervalo para el semáforo provisional de cobertura de riego', TRUE);
