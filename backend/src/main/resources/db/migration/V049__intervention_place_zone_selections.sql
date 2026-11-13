-- SPEC-200 R3: reviewed direct associations and immutable planning geometry snapshots.
-- No inferred associations, local IDs, historic conversions or changes to place/map masters.
CREATE TABLE intervention_place_zone_reviews (
    id BIGSERIAL PRIMARY KEY,
    place_id BIGINT NOT NULL REFERENCES places(id),
    version BIGINT NOT NULL CHECK (version > 0),
    dataset_revision VARCHAR(64) NOT NULL CHECK (length(dataset_revision) = 64),
    reviewed_by_user_id BIGINT NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_intervention_place_zone_reviews_live
    ON intervention_place_zone_reviews(place_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_intervention_place_zone_reviews_version
    ON intervention_place_zone_reviews(place_id, version);

CREATE TABLE intervention_place_zone_links (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES intervention_place_zone_reviews(id),
    zone_id BIGINT NOT NULL REFERENCES zones(id),
    multipart_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_intervention_place_zone_links_live
    ON intervention_place_zone_links(review_id, zone_id) WHERE deleted_at IS NULL;

ALTER TABLE intervention_locations
    ADD COLUMN zone_selection_revision VARCHAR(64),
    ADD COLUMN zone_boundary_snapshot JSONB,
    ADD CONSTRAINT chk_intervention_locations_zone_selection CHECK (
        (zone_selection_revision IS NULL AND zone_boundary_snapshot IS NULL) OR
        (zone_selection_revision IS NOT NULL AND length(zone_selection_revision) = 64
         AND zone_boundary_snapshot IS NOT NULL AND zone_id IS NOT NULL AND place_id IS NOT NULL
         AND location IS NOT NULL AND unit_item_id IS NOT NULL AND requested_quantity > 0
         AND requested_quantity IS NOT NULL
         AND COALESCE(zone_boundary_snapshot->>'type' IN ('Polygon', 'MultiPolygon'),FALSE))
    );
