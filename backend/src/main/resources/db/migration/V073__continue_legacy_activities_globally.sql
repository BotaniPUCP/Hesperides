-- SPEC-200: confirmed continuation of existing open work in the global workflow.
-- Original work, local history, authors, attempts and evidence are never rewritten.
-- Unknown global percentages stay NULL until a supervisor explicitly records them.
ALTER TABLE activity_executions ADD COLUMN legacy_snapshot JSONB CHECK(legacy_snapshot IS NULL OR jsonb_typeof(legacy_snapshot)='object');
ALTER TABLE activity_executions ADD COLUMN legacy_imported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE activity_executions ADD COLUMN legacy_baseline_pending BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE activity_evidences ADD COLUMN legacy_evidence_id BIGINT UNIQUE REFERENCES intervention_evidences(id);
ALTER TABLE activity_evidences ADD COLUMN legacy_counts_for_completion BOOLEAN NOT NULL DEFAULT FALSE;
DO $$ DECLARE c RECORD; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='activity_executions'::regclass AND contype='c'
   AND (pg_get_constraintdef(oid) LIKE '%progress_percentage%started_at%'
     OR pg_get_constraintdef(oid) LIKE '%started_at%responsible_supervisor_user_id%') LOOP
   EXECUTE format('ALTER TABLE activity_executions DROP CONSTRAINT %I',c.conname);
 END LOOP;
END $$;
ALTER TABLE activity_executions ADD CONSTRAINT activity_progress_start_known CHECK(
 (legacy_imported AND legacy_baseline_pending AND progress_percentage IS NULL)
 OR ((progress_percentage IS NULL)=(started_at IS NULL)));
ALTER TABLE activity_executions ADD CONSTRAINT activity_started_responsible CHECK(
 started_at IS NULL OR responsible_supervisor_user_id IS NOT NULL OR (legacy_imported AND legacy_baseline_pending));
ALTER TABLE activity_executions ADD CONSTRAINT activity_legacy_baseline CHECK(
 NOT legacy_baseline_pending OR (legacy_imported AND progress_percentage IS NULL));

CREATE OR REPLACE FUNCTION activity_validate_catalog() RETURNS trigger LANGUAGE plpgsql AS $$
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
   IF NEW.legacy_baseline_pending AND NEW.progress_percentage IS NULL THEN
     IF NOT NEW.legacy_imported OR code NOT IN ('PLANNED','IN_PROGRESS','EXECUTED','CANCELLED')
        OR NEW.finished_at IS NOT NULL OR (code='CANCELLED') IS DISTINCT FROM (NEW.cancelled_at IS NOT NULL) THEN
       RAISE EXCEPTION 'Invalid imported activity awaiting its first global progress' USING ERRCODE='23514';
     END IF;
     RETURN NEW;
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

WITH previous AS (
 SELECT i.id,i.version,i.created_at,ps.code planning_status,
   COALESCE(t.supervisor_user_id,i.assigned_to_user_id) candidate,
   least(min(l.started_at),(SELECT min((e.details->>'startedAt')::timestamptz AT TIME ZONE 'UTC')
     FROM intervention_events e WHERE e.intervention_id=i.id AND e.action_code='STARTED'
       AND e.deleted_at IS NULL AND e.details->>'startedAt' IS NOT NULL)) first_start,
   max(l.completed_at) last_execution,
   bool_and(s.code='VALIDATED') all_approved,
   bool_and(s.code IN ('COMPLETED','VALIDATED')) all_executed,
   bool_or(s.code IN ('IN_PROGRESS','OBSERVED','COMPLETED','VALIDATED')) any_execution
 FROM interventions i JOIN catalog_items ps ON ps.id=i.planning_status_item_id
 JOIN intervention_locations l ON l.intervention_id=i.id AND l.deleted_at IS NULL
 JOIN catalog_items s ON s.id=l.status_item_id
 LEFT JOIN teams t ON t.id=i.team_id
 WHERE i.deleted_at IS NULL AND ps.code<>'CANCELLED'
   AND NOT EXISTS(SELECT 1 FROM activity_executions x WHERE x.intervention_id=i.id)
 GROUP BY i.id,ps.code,t.supervisor_user_id
)
INSERT INTO activity_executions(intervention_id,version,status_item_id,responsible_supervisor_user_id,
 started_at,executed_at,legacy_imported,legacy_baseline_pending,created_at,legacy_snapshot)
SELECT p.id,p.version,status.id,u.id,p.first_start,
 CASE WHEN p.all_executed AND p.first_start IS NOT NULL THEN p.last_execution END,TRUE,TRUE,p.created_at,
 jsonb_build_object('work',(SELECT to_jsonb(original) FROM interventions original WHERE original.id=p.id),
 'locations',(SELECT jsonb_agg(to_jsonb(loc) ORDER BY loc.id) FROM intervention_locations loc WHERE loc.intervention_id=p.id))
FROM previous p JOIN catalog_types typ ON typ.code='ACTIVITY_STATUS'
JOIN catalog_items status ON status.catalog_type_id=typ.id AND status.code=
 CASE WHEN p.all_executed THEN 'EXECUTED' WHEN p.any_execution OR p.first_start IS NOT NULL THEN 'IN_PROGRESS' ELSE 'PLANNED' END
LEFT JOIN users u ON u.id=p.candidate AND u.is_active AND u.deleted_at IS NULL
 AND EXISTS(SELECT 1 FROM catalog_items role WHERE role.id=u.role_item_id AND role.code='SUPERVISOR' AND role.is_active AND role.deleted_at IS NULL)
WHERE NOT p.all_approved;

INSERT INTO activity_evidences(intervention_id,intervention_location_id,client_reference,moment_item_id,
 caption,uploaded_by_user_id,storage_key,original_filename,content_type,size_bytes,content_sha256,uploaded_at,
 created_at,legacy_evidence_id,legacy_counts_for_completion)
SELECT e.intervention_id,e.intervention_location_id,gen_random_uuid(),e.moment_item_id,e.caption,
 e.uploaded_by_user_id,e.storage_key,e.original_filename,e.content_type,e.size_bytes,e.content_sha256,e.uploaded_at,
 e.created_at,e.id,(l.deleted_at IS NULL AND e.attempt_number=l.attempt_number)
FROM intervention_evidences e JOIN activity_executions x ON x.intervention_id=e.intervention_id AND x.legacy_imported
JOIN intervention_locations l ON l.id=e.intervention_location_id
WHERE e.deleted_at IS NULL;

CREATE FUNCTION activity_keep_legacy_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.legacy_imported AND NEW.legacy_snapshot IS DISTINCT FROM OLD.legacy_snapshot THEN
   RAISE EXCEPTION 'Original activity snapshot is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER activity_legacy_snapshot_no_changes BEFORE UPDATE ON activity_executions
 FOR EACH ROW EXECUTE FUNCTION activity_keep_legacy_snapshot();
