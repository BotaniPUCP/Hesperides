-- Propiedad de SPEC-105 §4.1.
--
-- La proyeccion por porcentajes guardaba sus resultados como MEASURED, con la
-- persona que cerro la poda como si la hubiera medido. Cada ejemplar afectado
-- vuelve a su ultima medida real o, si nunca tuvo una, a UNKNOWN. Las filas se
-- conservan con soft delete: registran lo que el sistema llego a mostrar.

CREATE TEMP TABLE estimated_specimens ON COMMIT DROP AS
SELECT DISTINCT green_element_id AS id
  FROM green_element_measurements
 WHERE notes LIKE 'Estimación por labor técnica%' AND deleted_at IS NULL;

UPDATE green_element_measurements
   SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE notes LIKE 'Estimación por labor técnica%' AND deleted_at IS NULL;

UPDATE green_elements g
   SET height_m = m.height_m,
       trunk_height_m = m.trunk_height_m,
       dbh_cm = m.dbh_cm,
       crown_radius_m = m.crown_radius_m,
       is_banded = m.is_banded,
       measured_at = m.measured_at,
       measured_by_user_id = m.measured_by_user_id,
       data_source = CASE WHEN m.id IS NULL THEN 'UNKNOWN' ELSE 'MEASURED' END,
       updated_at = CURRENT_TIMESTAMP
  FROM estimated_specimens e
  LEFT JOIN LATERAL (
       SELECT x.* FROM green_element_measurements x
        WHERE x.green_element_id = e.id AND x.deleted_at IS NULL
        ORDER BY x.measured_at DESC, x.id DESC
        LIMIT 1) m ON TRUE
 WHERE g.id = e.id;
