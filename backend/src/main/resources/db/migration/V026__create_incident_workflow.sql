-- SPEC-201: minimal incident capture, approval and linked interventions.
-- Renumbered from V022 at integration. The linked work lives in incident_interventions
-- because `interventions` belongs to SPEC-200 (V025), whose INTERVENTION_STATUS
-- catalog (ASSIGNED, COMPLETED) is reused here instead of being created twice.
INSERT INTO catalog_types (code, name, description, is_system) VALUES
('INCIDENT_STATUS', 'Estados de incidencia', 'Flujo de aprobación y atención', TRUE),
('INCIDENT_TYPE', 'Tipos de incidencia', 'Provisionales: validar con la matriz del cliente', FALSE),
('URGENCY_LEVEL', 'Urgencia', 'Evaluación del coordinador', TRUE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT ct.id, v.code, v.label, v.position FROM (VALUES
('INCIDENT_STATUS','PENDING_APPROVAL','Pendiente de aprobación',1),
('INCIDENT_STATUS','OPEN','Pendiente de atención',2),
('INCIDENT_STATUS','IN_PROGRESS','En atención',3),
('INCIDENT_STATUS','RESOLVED','Resuelta',4),
('INCIDENT_TYPE','FALLEN_BRANCH','Rama caída',1),
('INCIDENT_TYPE','WATER_LEAK','Fuga de agua',2),
('INCIDENT_TYPE','LEAF_LITTER','Acumulación de hojarasca',3),
('URGENCY_LEVEL','LOW','Baja',1),
('URGENCY_LEVEL','MEDIUM','Media',2),
('URGENCY_LEVEL','HIGH','Alta',3)
) AS v(type,code,label,position) JOIN catalog_types ct ON ct.code=v.type;

CREATE TABLE incidents (
 id BIGSERIAL PRIMARY KEY,
 original_description TEXT NOT NULL,
 description TEXT NOT NULL,
 location_reference VARCHAR(500),
 latitude DOUBLE PRECISION,
 longitude DOUBLE PRECISION,
 incident_type_item_id BIGINT REFERENCES catalog_items(id),
 urgency_item_id BIGINT REFERENCES catalog_items(id),
 status_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
 reported_by_user_id BIGINT NOT NULL REFERENCES users(id),
 team_id BIGINT REFERENCES teams(id),
 approved_by_user_id BIGINT REFERENCES users(id),
 approved_at TIMESTAMP WITH TIME ZONE,
 resolved_at TIMESTAMP WITH TIME ZONE,
 channel VARCHAR(20) NOT NULL DEFAULT 'WEB',
 client_reference UUID NOT NULL,
 request_hash VARCHAR(64) NOT NULL,
 version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP WITH TIME ZONE,
 CONSTRAINT chk_incident_description CHECK (length(trim(description)) > 0),
 CONSTRAINT chk_incident_coordinates CHECK (
   (latitude IS NULL AND longitude IS NULL) OR
   (latitude IS NOT NULL AND longitude IS NOT NULL AND
    latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
CREATE UNIQUE INDEX idx_incidents_reference ON incidents(reported_by_user_id,client_reference) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_team ON incidents(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_status ON incidents(status_item_id,created_at) WHERE deleted_at IS NULL;

CREATE TABLE incident_interventions (
 id BIGSERIAL PRIMARY KEY,
 incident_id BIGINT NOT NULL REFERENCES incidents(id),
 description TEXT NOT NULL,
 type_item_id BIGINT REFERENCES catalog_items(id),
 status_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
 recorded_by_user_id BIGINT NOT NULL REFERENCES users(id),
 completed_by_user_id BIGINT REFERENCES users(id),
 completed_at TIMESTAMP WITH TIME ZONE,
 client_reference UUID NOT NULL,
 request_hash VARCHAR(64) NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP WITH TIME ZONE,
 CONSTRAINT chk_intervention_description CHECK (length(trim(description)) > 0)
);
CREATE UNIQUE INDEX idx_incident_interventions_reference ON incident_interventions(incident_id,client_reference) WHERE deleted_at IS NULL;

CREATE TABLE incident_status_history (
 id BIGSERIAL PRIMARY KEY,
 incident_id BIGINT NOT NULL REFERENCES incidents(id),
 status_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
 changed_by_user_id BIGINT NOT NULL REFERENCES users(id),
 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_incident_history ON incident_status_history(incident_id,created_at);

CREATE TABLE incident_photos (
 id BIGSERIAL PRIMARY KEY,
 incident_id BIGINT NOT NULL REFERENCES incidents(id),
 storage_key VARCHAR(100) NOT NULL,
 content_type VARCHAR(30) NOT NULL,
 size_bytes BIGINT NOT NULL CHECK(size_bytes > 0),
 uploaded_by_user_id BIGINT NOT NULL REFERENCES users(id),
 client_reference UUID NOT NULL,
 request_hash VARCHAR(64) NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX idx_incident_photos_reference ON incident_photos(incident_id,client_reference) WHERE deleted_at IS NULL;
