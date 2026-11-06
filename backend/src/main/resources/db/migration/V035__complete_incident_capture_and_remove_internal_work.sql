-- SPEC-201: optional OSG capture by the reporter and a single real-work model.
-- Retire prototype work, without manufacturing execution or validation.
-- Integrated after V034; published migrations V001-V034 remain unchanged.
DROP TABLE incident_interventions;

INSERT INTO catalog_types(code,name,description,is_system) VALUES
 ('INCIDENT_INTAKE_CHANNEL','Canales de ingreso OSG','Hoja Listas de la matriz OSG; distinto del canal técnico de captura',FALSE);
INSERT INTO catalog_items(catalog_type_id,code,label,sort_order)
SELECT ct.id,v.code,v.label,v.position FROM (VALUES
 ('INCIDENT_EVENT','COMPLAINT','Reclamo',2),
 ('INCIDENT_EVENT','NONCONFORMITY','No conformidad',3),
 ('INCIDENT_EVENT','SUPERVISION_FINDING','Hallazgo de supervisión',4),
 ('INCIDENT_EVENT','AUDIT_FINDING','Hallazgo de auditoría',5),
 ('INCIDENT_INTAKE_CHANNEL','EMAIL','Correo institucional',1),
 ('INCIDENT_INTAKE_CHANNEL','WHATSAPP','WhatsApp',2),
 ('INCIDENT_INTAKE_CHANNEL','SUPERVISION','Supervisión',3),
 ('INCIDENT_INTAKE_CHANNEL','AUDIT','Auditoría',4),
 ('INCIDENT_INTAKE_CHANNEL','SURVEY','Encuesta',5),
 ('INCIDENT_INTAKE_CHANNEL','IN_PERSON','Presencial',6),
 ('INCIDENT_INTAKE_CHANNEL','FORM','Formulario',7)
) v(type,code,label,position) JOIN catalog_types ct ON ct.code=v.type;

ALTER TABLE incidents
 ADD COLUMN intake_channel_item_id BIGINT REFERENCES catalog_items(id),
 ADD COLUMN reporter_name VARCHAR(200),
 ADD COLUMN zone_id BIGINT REFERENCES zones(id);
UPDATE incidents SET intake_channel_item_id=(SELECT ci.id FROM catalog_items ci
 JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='INCIDENT_INTAKE_CHANNEL' AND ci.code='FORM');
CREATE INDEX idx_incidents_zone_active ON incidents(zone_id) WHERE deleted_at IS NULL;
