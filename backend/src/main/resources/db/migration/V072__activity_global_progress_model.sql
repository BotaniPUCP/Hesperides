-- SPEC-200 §2.13, stage 2. Opt-in model: absence of activity_executions means legacy.
-- No historic work is converted, no published migration or shared catalog is relabeled.
INSERT INTO catalog_types(code,name,description,is_system)
VALUES ('ACTIVITY_STATUS','Estados de actividad','Flujo global de ejecución',TRUE),
       ('ACTIVITY_TARGET_STATUS','Avance de objetivos','Estado de jardín o ejemplar dentro de un avance',TRUE);

INSERT INTO catalog_items(catalog_type_id,code,label,sort_order)
SELECT t.id,v.code,v.label,v.sort_order FROM (VALUES
 ('ACTIVITY_STATUS','PLANNED','Planificada',1),
 ('ACTIVITY_STATUS','IN_PROGRESS','En ejecución',2),
 ('ACTIVITY_STATUS','EXECUTED','Ejecutada',3),
 ('ACTIVITY_STATUS','FINISHED','Terminada',4),
 ('ACTIVITY_STATUS','CANCELLED','Cancelada',5),
 ('ACTIVITY_TARGET_STATUS','NOT_STARTED','Sin avance',1),
 ('ACTIVITY_TARGET_STATUS','PARTIAL','Avance parcial',2),
 ('ACTIVITY_TARGET_STATUS','COMPLETED','Terminado',3)
) v(type_code,code,label,sort_order) JOIN catalog_types t ON t.code=v.type_code;

CREATE TABLE activity_executions (
 id BIGSERIAL PRIMARY KEY,
 intervention_id BIGINT NOT NULL UNIQUE REFERENCES interventions(id),
 version BIGINT NOT NULL DEFAULT 0 CHECK(version>=0),
 responsible_supervisor_user_id BIGINT REFERENCES users(id),
 status_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
 progress_percentage NUMERIC(5,2) CHECK(progress_percentage BETWEEN 0 AND 100),
 started_at TIMESTAMP,
 executed_at TIMESTAMP,
 finished_at TIMESTAMP,
 finished_by_user_id BIGINT REFERENCES users(id),
 cancelled_at TIMESTAMP,
 cancelled_by_user_id BIGINT REFERENCES users(id),
 cancellation_reason TEXT CHECK(length(cancellation_reason)<=2000),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP,
 CHECK((progress_percentage IS NULL)=(started_at IS NULL)),
 CHECK(started_at IS NULL OR responsible_supervisor_user_id IS NOT NULL),
 CHECK(executed_at IS NULL OR (started_at IS NOT NULL AND executed_at>=started_at)),
 CHECK((finished_at IS NULL)=(finished_by_user_id IS NULL)),
 CHECK(finished_at IS NULL OR (executed_at IS NOT NULL AND finished_at>=executed_at)),
 CHECK((cancelled_at IS NULL)=(cancelled_by_user_id IS NULL)),
 CHECK(cancelled_at IS NULL OR (finished_at IS NULL AND (started_at IS NULL OR cancelled_at>=started_at)))
);
CREATE INDEX idx_activity_execution_responsible ON activity_executions(responsible_supervisor_user_id,status_item_id) WHERE deleted_at IS NULL;

CREATE TABLE activity_progress_entries (
 id BIGSERIAL PRIMARY KEY,
 intervention_id BIGINT NOT NULL REFERENCES activity_executions(intervention_id),
 client_reference UUID NOT NULL UNIQUE,
 request_sha256 VARCHAR(64) NOT NULL CHECK(request_sha256 ~ '^[0-9a-f]{64}$'),
 actor_user_id BIGINT NOT NULL REFERENCES users(id),
 progress_percentage NUMERIC(5,2) NOT NULL CHECK(progress_percentage BETWEEN 0 AND 100),
 description TEXT NOT NULL CHECK(length(btrim(description))>0 AND length(description)<=4000),
 occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP CHECK(deleted_at IS NULL),
 UNIQUE(id,intervention_id)
);
CREATE INDEX idx_activity_progress_history ON activity_progress_entries(intervention_id,occurred_at,id);

CREATE TABLE activity_progress_targets (
 id BIGSERIAL PRIMARY KEY,
 progress_entry_id BIGINT NOT NULL,
 intervention_id BIGINT NOT NULL,
 intervention_location_id BIGINT NOT NULL,
 status_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
 partial_description TEXT CHECK(length(partial_description)<=4000),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP CHECK(deleted_at IS NULL),
 FOREIGN KEY(progress_entry_id,intervention_id) REFERENCES activity_progress_entries(id,intervention_id),
 FOREIGN KEY(intervention_location_id,intervention_id) REFERENCES intervention_locations(id,intervention_id),
 UNIQUE(progress_entry_id,intervention_location_id)
);

-- Global evidence has no attempt number. Files may be uploaded before binding to a saved
-- progress entry. Legacy evidence remains in intervention_evidences with its original links.
CREATE TABLE activity_evidences (
 id BIGSERIAL PRIMARY KEY,
 intervention_id BIGINT NOT NULL REFERENCES activity_executions(intervention_id),
 progress_entry_id BIGINT,
 intervention_location_id BIGINT,
 client_reference UUID NOT NULL UNIQUE,
 moment_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
 caption VARCHAR(255),
 uploaded_by_user_id BIGINT NOT NULL REFERENCES users(id),
 storage_key VARCHAR(500), original_filename VARCHAR(255), content_type VARCHAR(100),
 size_bytes BIGINT CHECK(size_bytes>0), content_sha256 VARCHAR(64), uploaded_at TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP,
 FOREIGN KEY(progress_entry_id,intervention_id) REFERENCES activity_progress_entries(id,intervention_id),
 FOREIGN KEY(intervention_location_id,intervention_id) REFERENCES intervention_locations(id,intervention_id),
 CHECK((uploaded_at IS NULL AND storage_key IS NULL AND content_type IS NULL AND size_bytes IS NULL AND content_sha256 IS NULL)
    OR (uploaded_at IS NOT NULL AND storage_key IS NOT NULL AND content_type IS NOT NULL AND size_bytes IS NOT NULL AND content_sha256 IS NOT NULL AND content_sha256 ~ '^[0-9a-f]{64}$'))
);
CREATE INDEX idx_activity_evidences_parent ON activity_evidences(intervention_id,progress_entry_id) WHERE deleted_at IS NULL;

CREATE FUNCTION activity_validate_catalog() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual_type TEXT; code TEXT;
BEGIN
 SELECT t.code,i.code INTO actual_type,code FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE i.id=NEW.status_item_id;
 IF TG_TABLE_NAME='activity_progress_targets' THEN
   IF actual_type IS DISTINCT FROM 'ACTIVITY_TARGET_STATUS' OR code NOT IN ('NOT_STARTED','PARTIAL','COMPLETED') THEN
     RAISE EXCEPTION 'Invalid activity target status' USING ERRCODE='23514';
   END IF;
   IF (code='PARTIAL' AND coalesce(length(btrim(NEW.partial_description)),0)=0)
       OR (code<>'PARTIAL' AND NEW.partial_description IS NOT NULL) THEN
     RAISE EXCEPTION 'Only a partial target requires a description' USING ERRCODE='23514';
   END IF;
 ELSE
   IF actual_type IS DISTINCT FROM 'ACTIVITY_STATUS' OR code NOT IN ('PLANNED','IN_PROGRESS','EXECUTED','FINISHED','CANCELLED') THEN
     RAISE EXCEPTION 'Invalid activity status' USING ERRCODE='23514';
   END IF;
   IF NOT COALESCE(CASE code
     WHEN 'PLANNED' THEN NEW.progress_percentage IS NULL AND NEW.started_at IS NULL AND NEW.executed_at IS NULL AND NEW.finished_at IS NULL AND NEW.cancelled_at IS NULL
     WHEN 'IN_PROGRESS' THEN NEW.progress_percentage IS NOT NULL AND NEW.progress_percentage<100 AND NEW.started_at IS NOT NULL AND NEW.executed_at IS NULL AND NEW.finished_at IS NULL AND NEW.cancelled_at IS NULL
     WHEN 'EXECUTED' THEN NEW.progress_percentage=100 AND NEW.started_at IS NOT NULL AND NEW.executed_at IS NOT NULL AND NEW.finished_at IS NULL AND NEW.cancelled_at IS NULL
     WHEN 'FINISHED' THEN NEW.progress_percentage=100 AND NEW.finished_at IS NOT NULL AND NEW.cancelled_at IS NULL
     WHEN 'CANCELLED' THEN NEW.cancelled_at IS NOT NULL AND NEW.finished_at IS NULL
     ELSE FALSE END,FALSE) THEN
     RAISE EXCEPTION 'Activity state, percentage and dates disagree' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER activity_execution_catalog BEFORE INSERT OR UPDATE ON activity_executions FOR EACH ROW EXECUTE FUNCTION activity_validate_catalog();
CREATE TRIGGER activity_target_catalog BEFORE INSERT ON activity_progress_targets FOR EACH ROW EXECUTE FUNCTION activity_validate_catalog();

CREATE FUNCTION activity_progress_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Activity progress history is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER activity_progress_no_changes BEFORE UPDATE OR DELETE ON activity_progress_entries FOR EACH ROW EXECUTE FUNCTION activity_progress_immutable();
CREATE TRIGGER activity_targets_no_changes BEFORE UPDATE OR DELETE ON activity_progress_targets FOR EACH ROW EXECUTE FUNCTION activity_progress_immutable();

-- A snapshot must contain every currently active objective exactly once. Deferred checks
-- let the service insert the header and all children in one transaction, including 100%.
CREATE FUNCTION activity_progress_complete_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entry_id BIGINT; parent_id BIGINT; percentage NUMERIC; expected BIGINT; actual BIGINT; done BIGINT;
BEGIN
 IF TG_TABLE_NAME='activity_progress_entries' THEN entry_id=NEW.id; ELSE entry_id=NEW.progress_entry_id; END IF;
 SELECT intervention_id,progress_percentage INTO parent_id,percentage FROM activity_progress_entries WHERE id=entry_id;
 SELECT count(*) INTO expected FROM intervention_locations WHERE intervention_id=parent_id AND deleted_at IS NULL;
 SELECT count(*),count(*) FILTER(WHERE s.code='COMPLETED') INTO actual,done
 FROM activity_progress_targets p JOIN catalog_items s ON s.id=p.status_item_id
 JOIN intervention_locations l ON l.id=p.intervention_location_id
 WHERE p.progress_entry_id=entry_id AND l.deleted_at IS NULL;
 IF expected=0 OR expected<>actual OR (percentage=100) IS DISTINCT FROM (done=expected)
   OR EXISTS(SELECT 1 FROM activity_progress_targets p JOIN intervention_locations l ON l.id=p.intervention_location_id
             WHERE p.progress_entry_id=entry_id AND l.deleted_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Progress requires a complete target snapshot and consistent 100 percent' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER activity_progress_snapshot AFTER INSERT ON activity_progress_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION activity_progress_complete_snapshot();
CREATE CONSTRAINT TRIGGER activity_target_snapshot AFTER INSERT ON activity_progress_targets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION activity_progress_complete_snapshot();
