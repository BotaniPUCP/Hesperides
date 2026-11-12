-- Owner: SPEC-200, reconciles SPEC-002 section 4.6 and SPEC-005.
-- Additive schema for one work with independently executed locations.
-- Existing catalog rows, data, tables and published migrations are preserved.
-- Photo requirements, completion acceptance and frequency counting remain service policies.
-- No incidents/contracts tables, no external publication and no business data are created here.

-- Owner: SPEC-200. Preserve all existing catalog rows and labels.
INSERT INTO catalog_types (code,name,description,is_system)
SELECT s.code,s.name,s.description,s.is_system
FROM (VALUES
    ('INTERVENTION_STATUS','Estados de intervención','Ciclo del trabajo',TRUE),
    ('INTERVENTION_ORIGIN','Origen de la intervención','Mantenimiento o hallazgo',TRUE),
    ('INCIDENT_SOURCE','Origen del reporte','Quién reporta el hallazgo',FALSE),
    ('EVIDENCE_MOMENT','Momentos de evidencia','Antes o después del trabajo',TRUE),
    ('MEASUREMENT_UNIT','Unidades de medida','Unidad de las cantidades de trabajo',FALSE)
) AS s(code,name,description,is_system)
WHERE NOT EXISTS (SELECT 1 FROM catalog_types ct WHERE ct.code=s.code);

INSERT INTO catalog_items (catalog_type_id,code,label,sort_order)
SELECT ct.id,s.code,s.label,s.sort_order
FROM (VALUES
    ('INTERVENTION_STATUS','PLANNED','Planificada',1),
    ('INTERVENTION_STATUS','ASSIGNED','Asignada',2),
    ('INTERVENTION_STATUS','IN_PROGRESS','En ejecución',3),
    ('INTERVENTION_STATUS','COMPLETED','Ejecutada',4),
    ('INTERVENTION_STATUS','VALIDATED','Validada',5),
    ('INTERVENTION_STATUS','OBSERVED','Observada',6),
    ('INTERVENTION_STATUS','CANCELLED','Cancelada',7),
    ('INTERVENTION_ORIGIN','MAINTENANCE','Mantenimiento',1),
    ('INTERVENTION_ORIGIN','FINDING','Hallazgo / incidencia',2),
    ('INCIDENT_SOURCE','SUPERVISION','Supervisión',1),
    ('INCIDENT_SOURCE','UNIT','Unidad',2),
    ('INCIDENT_SOURCE','NONE','Sin reporte previo',3),
    ('EVIDENCE_MOMENT','BEFORE','Antes',1),
    ('EVIDENCE_MOMENT','AFTER','Después',2),
    ('EVIDENCE_MOMENT','UNSPECIFIED','Sin especificar',3),
    ('MEASUREMENT_UNIT','UNIT','Unidad',1),
    ('MEASUREMENT_UNIT','M','Metro',2),
    ('MEASUREMENT_UNIT','M2','Metro cuadrado',3),
    ('MEASUREMENT_UNIT','M3','Metro cúbico',4)
) AS s(type_code,code,label,sort_order)
JOIN catalog_types ct ON ct.code=s.type_code
WHERE NOT EXISTS (SELECT 1 FROM catalog_items ci
    WHERE ci.catalog_type_id=ct.id AND ci.code=s.code);

CREATE SEQUENCE intervention_code_seq;
CREATE FUNCTION next_intervention_code() RETURNS TEXT LANGUAGE sql AS $$
    SELECT 'INT-' || lpad(n::text, GREATEST(6,length(n::text)), '0')
    FROM (SELECT nextval('intervention_code_seq') AS n) s;
$$;

CREATE TABLE interventions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL DEFAULT next_intervention_code(),
    version BIGINT NOT NULL DEFAULT 0,
    intervention_class_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    intervention_type_item_id BIGINT REFERENCES catalog_items(id),
    planning_status_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    team_id BIGINT REFERENCES teams(id),
    assigned_to_user_id BIGINT REFERENCES users(id),
    assigned_by_user_id BIGINT REFERENCES users(id),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    scheduled_date DATE NOT NULL,
    description TEXT,
    origin_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    reported_by_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    external_code VARCHAR(40),
    requested_at DATE,
    published_at TIMESTAMP,
    publication_attempts INTEGER NOT NULL DEFAULT 0 CHECK (publication_attempts >= 0),
    publication_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CHECK ((team_id IS NULL AND assigned_to_user_id IS NULL AND assigned_by_user_id IS NULL)
        OR (team_id IS NOT NULL AND assigned_to_user_id IS NOT NULL AND assigned_by_user_id IS NOT NULL))
);
CREATE UNIQUE INDEX idx_interventions_code_active ON interventions(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_team_plan ON interventions(team_id,planning_status_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_assignee ON interventions(assigned_to_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_date ON interventions(scheduled_date,id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_type ON interventions(intervention_type_item_id) WHERE deleted_at IS NULL;

CREATE TABLE intervention_locations (
    id BIGSERIAL PRIMARY KEY,
    intervention_id BIGINT NOT NULL REFERENCES interventions(id),
    client_reference UUID NOT NULL,
    zone_id BIGINT REFERENCES zones(id),
    place_id BIGINT REFERENCES places(id),
    location GEOMETRY(Point,4326),
    location_description TEXT,
    description TEXT,
    status_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    unit_item_id BIGINT REFERENCES catalog_items(id),
    requested_quantity NUMERIC(12,3) CHECK (requested_quantity >= 0),
    progress_quantity NUMERIC(12,3) CHECK (progress_quantity >= 0),
    executed_quantity NUMERIC(12,3) CHECK (executed_quantity >= 0),
    attempt_number INTEGER NOT NULL DEFAULT 0 CHECK (attempt_number >= 0),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    validated_at TIMESTAMP,
    executed_by_user_id BIGINT REFERENCES users(id),
    validated_by_user_id BIGINT REFERENCES users(id),
    execution_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE (id,intervention_id),
    UNIQUE (intervention_id,client_reference),
    CHECK (completed_at IS NULL OR (started_at IS NOT NULL AND completed_at >= started_at)),
    CHECK ((started_at IS NULL) = (executed_by_user_id IS NULL)),
    CHECK ((validated_at IS NULL) = (validated_by_user_id IS NULL)),
    CHECK (validated_at IS NULL OR (completed_at IS NOT NULL AND validated_at >= completed_at)),
    CHECK (validated_by_user_id IS NULL OR
        (executed_by_user_id IS NOT NULL AND validated_by_user_id <> executed_by_user_id)),
    CHECK ((requested_quantity IS NULL AND progress_quantity IS NULL AND executed_quantity IS NULL)
        OR unit_item_id IS NOT NULL)
);
CREATE INDEX idx_intervention_locations_parent ON intervention_locations(intervention_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_intervention_locations_zone ON intervention_locations(zone_id,intervention_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_intervention_locations_place ON intervention_locations(place_id,intervention_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_intervention_locations_status ON intervention_locations(status_item_id,intervention_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_intervention_locations_completed ON intervention_locations(completed_at) WHERE deleted_at IS NULL;

CREATE TABLE intervention_elements (
    id BIGSERIAL PRIMARY KEY,
    intervention_id BIGINT NOT NULL REFERENCES interventions(id),
    intervention_location_id BIGINT NOT NULL,
    green_element_id BIGINT NOT NULL REFERENCES green_elements(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (intervention_location_id,intervention_id)
        REFERENCES intervention_locations(id,intervention_id)
);
CREATE UNIQUE INDEX idx_intervention_elements_active
    ON intervention_elements(intervention_location_id,green_element_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_intervention_elements_element ON intervention_elements(green_element_id,intervention_id);

CREATE TABLE intervention_evidences (
    id BIGSERIAL PRIMARY KEY,
    intervention_id BIGINT NOT NULL REFERENCES interventions(id),
    intervention_location_id BIGINT NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
    green_element_id BIGINT REFERENCES green_elements(id),
    client_reference UUID NOT NULL,
    moment_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    storage_key VARCHAR(500),
    original_filename VARCHAR(255),
    content_type VARCHAR(100),
    size_bytes BIGINT CHECK (size_bytes > 0),
    content_sha256 VARCHAR(64),
    captured_at TIMESTAMP,
    captured_location GEOMETRY(Point,4326),
    caption VARCHAR(255),
    uploaded_by_user_id BIGINT NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (intervention_location_id,intervention_id)
        REFERENCES intervention_locations(id,intervention_id),
    CHECK ((uploaded_at IS NULL AND storage_key IS NULL AND content_type IS NULL
        AND size_bytes IS NULL AND content_sha256 IS NULL)
        OR (uploaded_at IS NOT NULL AND storage_key IS NOT NULL AND content_type IS NOT NULL
        AND size_bytes IS NOT NULL AND content_sha256 IS NOT NULL))
);
CREATE UNIQUE INDEX idx_intervention_evidences_reference ON intervention_evidences(client_reference);
CREATE INDEX idx_intervention_evidences_location
    ON intervention_evidences(intervention_location_id,attempt_number);
CREATE INDEX idx_intervention_evidences_pending
    ON intervention_evidences(intervention_id,intervention_location_id)
    WHERE uploaded_at IS NULL AND deleted_at IS NULL;

CREATE TABLE intervention_events (
    id BIGSERIAL PRIMARY KEY,
    intervention_id BIGINT NOT NULL REFERENCES interventions(id),
    intervention_location_id BIGINT,
    attempt_number INTEGER,
    action_code VARCHAR(60) NOT NULL,
    actor_user_id BIGINT NOT NULL REFERENCES users(id),
    from_status_item_id BIGINT REFERENCES catalog_items(id),
    to_status_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    reason TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (intervention_location_id,intervention_id)
        REFERENCES intervention_locations(id,intervention_id),
    CHECK ((intervention_location_id IS NULL AND attempt_number IS NULL)
        OR (intervention_location_id IS NOT NULL AND attempt_number IS NOT NULL AND attempt_number >= 0))
);
CREATE INDEX idx_intervention_events_history ON intervention_events(intervention_id,occurred_at,id);

CREATE TABLE intervention_submissions (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT NOT NULL REFERENCES users(id),
    operation VARCHAR(40) NOT NULL,
    idempotency_key UUID NOT NULL,
    request_sha256 VARCHAR(64) NOT NULL,
    intervention_id BIGINT NOT NULL REFERENCES interventions(id),
    evidence_id BIGINT REFERENCES intervention_evidences(id),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_intervention_submissions_active
    ON intervention_submissions(actor_user_id,operation,idempotency_key) WHERE deleted_at IS NULL;
