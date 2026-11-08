-- M7/D-03. Configurable campus window and an auditable exception on executed turns.
INSERT INTO system_parameters (code, label, value, value_type, description, is_editable)
VALUES ('IRRIGATION_OPERATING_WINDOW', 'Ventana horaria de riego', '06:30-11:30', 'STRING',
        'Horario local de inicio y fin, en formato HH:mm-HH:mm', TRUE);

INSERT INTO catalog_types (code, name, description, is_system)
VALUES ('IRRIGATION_WINDOW_EXCEPTION', 'Excepciones al horario de riego',
        'Motivo declarado al registrar un turno fuera de la ventana horaria', TRUE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT ct.id, seed.code, seed.label, seed.sort_order
FROM catalog_types ct
CROSS JOIN (VALUES ('EMERGENCY', 'Emergencia', 1),
                   ('SPECIAL_AUTHORIZATION', 'Autorización especial', 2)) AS seed(code, label, sort_order)
WHERE ct.code = 'IRRIGATION_WINDOW_EXCEPTION';

ALTER TABLE irrigation_turns
    ADD COLUMN window_exception_item_id BIGINT REFERENCES catalog_items(id);
