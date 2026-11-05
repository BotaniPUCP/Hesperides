-- SPEC-201 / SPEC-200: independent registration and closure, real N:M work links.
INSERT INTO catalog_items (catalog_type_id,code,label,sort_order)
SELECT ct.id,v.code,v.label,v.position FROM (VALUES
 ('INCIDENT_STATUS','CHANGES_REQUESTED','Corrección del reporte solicitada',5),
 ('INCIDENT_STATUS','RESOLUTION_OBSERVED','Resolución observada',6),
 ('INCIDENT_UPDATE_KIND','REPORT_RETURNED','Corrección solicitada',5),
 ('INCIDENT_UPDATE_KIND','REPORT_RESUBMITTED','Reporte corregido y reenviado',6),
 ('INCIDENT_UPDATE_KIND','INTERVENTION_LINKED','Intervención vinculada',7),
 ('INCIDENT_UPDATE_KIND','RESOLUTION_OBSERVED','Resolución observada',8),
 ('INCIDENT_UPDATE_KIND','RESOLVED','Resolución validada',9),
 ('INCIDENT_UPDATE_KIND','INTERVENTION_UNLINKED','Vínculo de intervención retirado',10)
) v(type,code,label,position) JOIN catalog_types ct ON ct.code=v.type;

ALTER TABLE incidents
 ADD COLUMN correction_reason TEXT,
 ADD COLUMN resolution_summary TEXT,
 ADD COLUMN resolved_by_user_id BIGINT REFERENCES users(id),
 ADD COLUMN resolution_observation TEXT;

CREATE TABLE incident_intervention_links (
 id BIGSERIAL PRIMARY KEY,
 incident_id BIGINT NOT NULL REFERENCES incidents(id),
 intervention_id BIGINT NOT NULL REFERENCES interventions(id),
 purpose_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
 linked_by_user_id BIGINT NOT NULL REFERENCES users(id),
 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX idx_incident_intervention_links_live
 ON incident_intervention_links(incident_id,intervention_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_intervention_links_work
 ON incident_intervention_links(intervention_id) WHERE deleted_at IS NULL;

-- Historical work is retained verbatim, never promoted to validated execution.
-- Coordination can explicitly map it to real work through the new link workflow.
ALTER TABLE incident_interventions
 ADD COLUMN replacement_intervention_id BIGINT REFERENCES interventions(id);
