-- Renumerada de V003 a V005: SPEC-002 §4 reserva V003 para PostGIS y V004 para
-- zonas. Esta migración es de SPEC-001 y había tomado ese hueco por error;
-- dejarla ahí habría roto Flyway al implementar el catastro.
--
-- V001 sembró el catálogo ROLE con solo ADMIN y un USER genérico. El dominio
-- real tiene cuatro roles (SPEC-001 Anexo A). No se edita V001: una migración
-- aplicada no se toca, rompería el checksum de Flyway.

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT (SELECT id FROM catalog_types WHERE code = 'ROLE'), v.code, v.label, v.sort_order
FROM (VALUES
    ('COORDINADOR', 'Coordinador', 2),
    ('SUPERVISOR',  'Supervisor de cuadrilla', 3),
    ('OPERARIO',    'Operario de campo', 4)
) AS v(code, label, sort_order);

-- ADMIN ya existía desde V001; solo se corrige su etiqueta y su orden.
UPDATE catalog_items SET label = 'Administrador', sort_order = 1
WHERE code = 'ADMIN'
  AND catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'ROLE');

-- El USER genérico se desactiva, no se borra: si alguna fila de prueba ya lo
-- referencia, un DELETE rompería la FK. Desactivado deja de ofrecerse en los
-- selects pero la referencia histórica sigue siendo válida (SPEC-003 §7.1).
UPDATE catalog_items SET is_active = FALSE
WHERE code = 'USER'
  AND catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'ROLE');
