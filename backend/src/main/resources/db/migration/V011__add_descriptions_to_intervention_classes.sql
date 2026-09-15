-- Propiedad de SPEC-005 §4.2. Fuente: columna de descripcion de la hoja
-- `tipo de actividades` del Excel DAF-OSG 2025-2026.
--
-- V009 sembro las nueve clases con su grupo responsable pero sin descripcion:
-- solo los tipos la llevaban. Estas nueve son TEXTUALES DEL CLIENTE, a
-- diferencia de las de los tipos, que estan redactadas por nosotros y siguen
-- pendientes de contrastar.
--
-- Se usa el operador || de JSONB y no una asignacion directa para no pisar lo
-- que cada clase ya tiene: responsible_group vincula la clase con las cuadrillas
-- de V005, y priority marca el orden de construccion del equipo.

UPDATE catalog_items ci
   SET metadata = COALESCE(ci.metadata, '{}'::jsonb) || jsonb_build_object('description', nuevo.description),
       updated_at = CURRENT_TIMESTAMP
  FROM (VALUES
        ('HABILITACION',   'Creación e implementación de nuevas áreas verdes'),
        ('REHABILITACION', 'Recuperación o renovación de jardines existentes'),
        ('MANTENIMIENTO',  'Conservación rutinaria de las áreas verdes'),
        ('PODA',           'Corte y manejo de árboles, arbustos y otras plantas'),
        ('PROPAGACION',    'Producción, multiplicación e instalación de plantas'),
        ('RIEGO',          'Aplicación de agua y mantenimiento del sistema de riego'),
        ('FITOSANITARIO',  'Prevención y control de plagas y enfermedades'),
        ('RESIDUOS',       'Recolección y aprovechamiento de residuos vegetales'),
        ('INSPECCION',     'Evaluación y seguimiento del estado de las áreas verdes')
       ) AS nuevo(code, description)
 WHERE ci.code = nuevo.code
   AND ci.catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS');
