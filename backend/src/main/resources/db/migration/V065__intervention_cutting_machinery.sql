-- SPEC-115: la maquinaria de corte solo se programa sabados, domingos y feriados (REQ 5.11).
-- Las intervenciones anteriores quedan sin la marca: no se sabe cuales la usaron (D-06).
ALTER TABLE interventions ADD COLUMN uses_cutting_machinery BOOLEAN NOT NULL DEFAULT FALSE;

-- D-05: los tipos de poda sugieren la marca. La lista la valida el cliente y se ajusta en el catalogo.
UPDATE catalog_items i
   SET metadata = COALESCE(i.metadata, '{}'::jsonb) || '{"suggestsCuttingMachinery": true}'::jsonb
  FROM catalog_types t
 WHERE t.id = i.catalog_type_id AND t.code = 'INTERVENTION_TYPE'
   AND i.code IN ('PODA_MANTENIMIENTO', 'PODA_FORMACION', 'PODA_SANITARIA', 'PODA_DESPEJE');
