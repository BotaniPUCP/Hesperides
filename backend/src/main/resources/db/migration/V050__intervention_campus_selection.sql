-- Campus-wide selection replaces place restrictions for new plans only.
-- Keep reviewed-place history and existing locations unchanged.
ALTER TABLE interventions ADD COLUMN campus_selection_revision VARCHAR(64)
    CHECK (campus_selection_revision IS NULL OR length(campus_selection_revision)=64);
ALTER TABLE intervention_locations DROP CONSTRAINT chk_intervention_locations_zone_selection;
ALTER TABLE intervention_locations ADD CONSTRAINT chk_intervention_locations_zone_selection CHECK (
    (zone_selection_revision IS NULL AND zone_boundary_snapshot IS NULL) OR
    (zone_selection_revision IS NOT NULL AND length(zone_selection_revision)=64
     AND zone_boundary_snapshot IS NOT NULL AND zone_id IS NOT NULL
     AND location IS NOT NULL AND unit_item_id IS NOT NULL
     AND requested_quantity IS NOT NULL AND requested_quantity>0
     AND COALESCE(zone_boundary_snapshot->>'type' IN ('Polygon','MultiPolygon'),FALSE))
);
