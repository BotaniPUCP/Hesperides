-- SPEC-201: explicit development fixtures for the current OSG / real-work model.
-- Public test password: Hesperides2026. Never enable dev on a real database.
INSERT INTO users(email,password_hash,first_name,last_name,role_item_id,is_active,must_change_password)
SELECT v.email,'$2a$10$4r8g9MXWvnVXpz.Z5AIjRO/OsgquCUkP3xribRDZTpWkIJB06V22y',v.name,'Demostración',ci.id,TRUE,FALSE
FROM (VALUES ('capataz@demo.invalid','Capataz','SUPERVISOR'),('otro-capataz@demo.invalid','Otro capataz','SUPERVISOR'),
 ('coordinador@demo.invalid','Coordinador','COORDINADOR')) v(email,name,role)
JOIN catalog_types ct ON ct.code='ROLE' JOIN catalog_items ci ON ci.catalog_type_id=ct.id AND ci.code=v.role
WHERE NOT EXISTS(SELECT 1 FROM users u WHERE u.email=v.email AND u.deleted_at IS NULL);
INSERT INTO teams(code,name,supervisor_user_id)
SELECT v.code,v.name,u.id FROM (VALUES ('DEMO-INC-1','Cuadrilla de demostración','capataz@demo.invalid'),
 ('DEMO-INC-2','Otra cuadrilla de demostración','otro-capataz@demo.invalid')) v(code,name,email)
JOIN users u ON u.email=v.email AND u.deleted_at IS NULL
WHERE NOT EXISTS(SELECT 1 FROM teams t WHERE t.code=v.code AND t.deleted_at IS NULL);

-- Replace only the previous, identifiable demo reports, not manually created cases.
UPDATE incidents SET deleted_at=CURRENT_TIMESTAMP WHERE deleted_at IS NULL
 AND client_reference::text LIKE '20000000-0000-4000-8000-%'
 AND reported_by_user_id IN(SELECT id FROM users WHERE email IN('capataz@demo.invalid','otro-capataz@demo.invalid'));

CREATE OR REPLACE FUNCTION pg_temp.demo_item(type_code TEXT,item_code TEXT) RETURNS BIGINT LANGUAGE SQL AS $$
 SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
 WHERE ct.code=type_code AND ci.code=item_code AND ci.deleted_at IS NULL
$$;
DROP TABLE IF EXISTS pg_temp.demo_incident_fixtures;
CREATE TEMP TABLE demo_incident_fixtures ON COMMIT DROP AS
SELECT * FROM (VALUES
 (1,1,'PENDING_APPROVAL','INCIDENT',NULL,NULL,NULL,'FORM','Rama caída en puerta principal.','Rama caída en puerta principal.'),
 (2,2,'PENDING_APPROVAL','SUPERVISION_FINDING','AV-01','HIGH','AV-09','SUPERVISION','Aspersor girado; el agua cae sobre la vereda.','Aspersor girado; el agua cae sobre la vereda.'),
 (3,1,'CHANGES_REQUESTED','INCIDENT',NULL,NULL,NULL,'FORM','Algo pasa con las plantas de atrás.','Algo pasa con las plantas de atrás.'),
 (4,1,'OPEN','COMPLAINT','AV-01','LOW','AV-03','EMAIL','Hojarasca acumulada en el sendero.','Hojarasca acumulada en el sendero; pendiente de planificar atención.'),
 (5,1,'OPEN','INCIDENT','AV-02','HIGH','AV-02','FORM','Una rama larga está inclinada junto al aula de Arte.','Rama inclinada junto al aula de Arte; requiere retiro y revisión preventiva.'),
 (6,1,'IN_PROGRESS','INCIDENT','AV-01','MEDIUM','AV-05','IN_PERSON','La maleza ocupa el borde del camino.','Desmalezado del borde del camino en ejecución.'),
 (7,2,'IN_PROGRESS','INCIDENT','AV-01','HIGH','AV-09','WHATSAPP','El aspersor moja el paso peatonal.','Aspersor corregido; ejecución finalizada, pendiente de validación.'),
 (8,1,'RESOLUTION_OBSERVED','NONCONFORMITY','AV-01','MEDIUM','AV-08','SUPERVISION','Quedaron residuos tras la poda.','La revisión encontró restos vegetales; corregir la ejecución observada.'),
 (9,1,'OPEN','INCIDENT','AV-01','HIGH','AV-02','FORM','Rama caída cerca de Biblioteca.','El retiro compartido está validado; falta revisar el cierre de este reporte.'),
 (10,2,'RESOLVED','INCIDENT','AV-03','LOW','AV-05','FORM','La maleza ocupa el área destinada a habilitar un jardín.','Deshierbo del área y retiro de residuos revisados por coordinación.'),
 (11,2,'PENDING_APPROVAL','SUPERVISION_FINDING','AV-01','MEDIUM','AV-09','SUPERVISION','Fuga en un jardín, falta referencia.','Fuga en el jardín de Arte, junto a la válvula de riego. Referencia corregida y reenviada.'),
 (12,1,'RESOLVED','COMPLAINT','AV-01','MEDIUM','AV-02','EMAIL','El mismo acceso de Biblioteca sigue obstruido.','Segundo reporte atendido mediante el retiro compartido; cierre independiente.')
) v(n,team_number,status,event,service,severity,cause,source,original_description,description);

INSERT INTO incidents(original_description,description,location_reference,incident_type_item_id,urgency_item_id,status_item_id,
 reported_by_user_id,team_id,approved_by_user_id,approved_at,resolved_at,resolved_by_user_id,resolution_summary,
 correction_reason,resolution_observation,channel,client_reference,request_hash,created_at,updated_at,version,official_number,
 event_item_id,service_group_item_id,service_item_id,company_item_id,process_item_id,subprocess_item_id,severity_item_id,
 responsible_user_id,root_cause_item_id,root_cause,immediate_action,preventive_action,impacted_process,observations,intake_channel_item_id,zone_id)
SELECT f.original_description,f.description,
 CASE WHEN f.n IN(9,12) THEN 'Acceso junto a Biblioteca; sección por confirmar.'
      WHEN z.id IS NOT NULL THEN 'Referencia de demostración: '||z.name END,
 pg_temp.demo_item('INCIDENT_TYPE',CASE WHEN f.n IN(2,7,11) THEN 'WATER_LEAK' WHEN f.n=4 THEN 'LEAF_LITTER'
      WHEN f.n IN(5,9,12) THEN 'FALLEN_BRANCH' END),
 CASE WHEN f.service IS NOT NULL THEN pg_temp.demo_item('URGENCY_LEVEL',f.severity) END,
 pg_temp.demo_item('INCIDENT_STATUS',f.status),t.supervisor_user_id,t.id,
 CASE WHEN f.status NOT IN('PENDING_APPROVAL','CHANGES_REQUESTED') THEN reviewer.id END,
 CASE WHEN f.status NOT IN('PENDING_APPROVAL','CHANGES_REQUESTED') THEN CURRENT_TIMESTAMP-INTERVAL '6 days' END,
 CASE WHEN f.status='RESOLVED' THEN CURRENT_TIMESTAMP-INTERVAL '6 hours' END,
 CASE WHEN f.status='RESOLVED' THEN reviewer.id END,
 CASE WHEN f.n=10 THEN 'Se retiró la maleza y los residuos, y se verificó el área a habilitar.'
      WHEN f.n=12 THEN 'El retiro compartido dejó libre el acceso indicado en este segundo reporte.' END,
 CASE WHEN f.n IN(3,11) THEN 'Precisar el jardín y el elemento afectado antes del registro oficial.' END,
 CASE WHEN f.n=8 THEN 'Queda pendiente recoger los restos observados en la revisión.' END,
 'WEB',('30000000-0000-4000-8000-'||lpad(f.n::text,12,'0'))::uuid,
 encode(sha256(convert_to('SPEC-201 current demo '||f.n,'UTF8')),'hex'),CURRENT_TIMESTAMP-INTERVAL '7 days',CURRENT_TIMESTAMP,0,
 CASE WHEN f.status NOT IN('PENDING_APPROVAL','CHANGES_REQUESTED') THEN nextval('incident_official_number_seq') END,
 pg_temp.demo_item('INCIDENT_EVENT',f.event),pg_temp.demo_item('INCIDENT_SERVICE_GROUP','GREEN_AREAS'),
 pg_temp.demo_item('INCIDENT_SERVICE',f.service),CASE WHEN f.service IS NOT NULL THEN pg_temp.demo_item('INCIDENT_COMPANY',CASE WHEN f.n=5 THEN 'TERRAVERDE' ELSE 'NONE' END) END,
 CASE WHEN f.service IS NOT NULL THEN pg_temp.demo_item('INCIDENT_PROCESS','GSG-02') END,
 CASE WHEN f.service IS NOT NULL THEN pg_temp.demo_item('INCIDENT_SUBPROCESS','GREEN_OPERATIONS') END,
 pg_temp.demo_item('INCIDENT_SEVERITY',f.severity),CASE WHEN f.service IS NOT NULL THEN t.supervisor_user_id END,
 pg_temp.demo_item('INCIDENT_ROOT_CAUSE',f.cause),
 CASE WHEN f.cause IS NOT NULL THEN 'Análisis de demostración: confirmar la causa catalogada mediante revisión de campo.' END,
 CASE WHEN f.service IS NOT NULL THEN 'Contener el impacto y coordinar el trabajo descrito en las intervenciones relacionadas.' END,
 CASE WHEN f.n IN(5,8,10) THEN 'Programar revisión preventiva del área y comprobar el retiro de residuos.' END,
 CASE WHEN f.service IS NOT NULL THEN 'Gestión operativa de áreas verdes' END,
 'Datos ficticios de demostración; no representan ejecución real del campus.',pg_temp.demo_item('INCIDENT_INTAKE_CHANNEL',f.source),
 CASE WHEN f.n<>1 THEN z.id END
FROM demo_incident_fixtures f JOIN teams t ON t.code='DEMO-INC-'||f.team_number AND t.deleted_at IS NULL
JOIN users reviewer ON reviewer.email='coordinador@demo.invalid' AND reviewer.deleted_at IS NULL
LEFT JOIN zones z ON z.code=CASE WHEN f.n IN(2,5,7,11) THEN 'AV-0078'
 WHEN f.n IN(4,8) THEN 'AV-0358' WHEN f.n IN(6,10) THEN 'AV-0481' END AND z.is_active AND z.deleted_at IS NULL
WHERE NOT EXISTS(SELECT 1 FROM incidents i WHERE i.client_reference=('30000000-0000-4000-8000-'||lpad(f.n::text,12,'0'))::uuid);

INSERT INTO incident_impacts(incident_id,impact_item_id)
SELECT i.id,pg_temp.demo_item('INCIDENT_IMPACT',v.code) FROM incidents i
JOIN demo_incident_fixtures f ON i.client_reference=('30000000-0000-4000-8000-'||lpad(f.n::text,12,'0'))::uuid
CROSS JOIN (VALUES('SAFETY'),('IMAGE')) v(code)
WHERE f.service IS NOT NULL AND NOT EXISTS(SELECT 1 FROM incident_impacts a WHERE a.incident_id=i.id AND a.impact_item_id=pg_temp.demo_item('INCIDENT_IMPACT',v.code));

DROP TABLE IF EXISTS pg_temp.demo_work_fixtures;
CREATE TEMP TABLE demo_work_fixtures ON COMMIT DROP AS
SELECT * FROM (VALUES
 (1,1,'PLANNED','Retirar la rama inclinada junto a Arte'),
 (2,1,'ASSIGNED','Revisar preventivamente las ramas del entorno'),
 (3,1,'IN_PROGRESS','Retirar maleza del borde del camino'),
 (4,2,'COMPLETED','Corregir la orientación del aspersor'),
 (5,1,'OBSERVED','Recoger los residuos de poda observados'),
 (6,1,'VALIDATED','Retiro compartido de rama y limpieza del acceso de Biblioteca'),
 (7,2,'VALIDATED','Deshierbar el área a habilitar y retirar residuos'),
 (8,2,'ASSIGNED','Inspección compartida de la instalación de riego')
) v(n,team_number,status,description);
INSERT INTO interventions(intervention_class_item_id,intervention_type_item_id,planning_status_item_id,team_id,
 assigned_to_user_id,assigned_by_user_id,created_by_user_id,scheduled_date,description,origin_item_id,reported_by_item_id,external_code,created_at)
SELECT ci.parent_item_id,ci.id,pg_temp.demo_item('INTERVENTION_STATUS',CASE WHEN f.status='PLANNED' THEN 'PLANNED' ELSE 'ASSIGNED' END),
 CASE WHEN f.status<>'PLANNED' THEN t.id END,CASE WHEN f.status<>'PLANNED' THEN t.supervisor_user_id END,
 CASE WHEN f.status<>'PLANNED' THEN reviewer.id END,reviewer.id,CURRENT_DATE-2,f.description,
 pg_temp.demo_item('INTERVENTION_ORIGIN','FINDING'),pg_temp.demo_item('INCIDENT_SOURCE','SUPERVISION'),
 'DEMO-OSG-WORK-'||lpad(f.n::text,2,'0'),CURRENT_TIMESTAMP-INTERVAL '3 days'
FROM demo_work_fixtures f JOIN teams t ON t.code='DEMO-INC-'||f.team_number AND t.deleted_at IS NULL
JOIN users reviewer ON reviewer.email='coordinador@demo.invalid' AND reviewer.deleted_at IS NULL
JOIN catalog_items ci ON ci.id=pg_temp.demo_item('INTERVENTION_TYPE',CASE WHEN f.n=2 THEN 'INSPECCION_RIESGO'
 WHEN f.n IN(3,7) THEN 'DESHIERBO' WHEN f.n IN(4,8) THEN 'VERIFICACION_RIEGO'
 WHEN f.n=5 THEN 'DISPOSICION_RESIDUOS' ELSE 'RECOLECCION_RAMAS' END)
WHERE NOT EXISTS(SELECT 1 FROM interventions w WHERE w.external_code='DEMO-OSG-WORK-'||lpad(f.n::text,2,'0'));

INSERT INTO intervention_locations(intervention_id,client_reference,location,location_description,description,status_item_id,attempt_number,
 started_at,completed_at,validated_at,executed_by_user_id,validated_by_user_id,execution_notes,rejection_reason)
SELECT w.id,('31000000-0000-4000-8000-'||lpad(f.n::text,12,'0'))::uuid,ST_SetSRID(ST_MakePoint(-77.079,-12.069),4326),
 'Punto ilustrativo de demostración; confirmar en campo',f.description,pg_temp.demo_item('INTERVENTION_STATUS',f.status),
 CASE WHEN f.status IN('PLANNED','ASSIGNED') THEN 0 ELSE 1 END,
 CASE WHEN f.status NOT IN('PLANNED','ASSIGNED') THEN (CURRENT_TIMESTAMP-INTERVAL '2 days') AT TIME ZONE 'UTC' END,
 CASE WHEN f.status IN('COMPLETED','OBSERVED','VALIDATED') THEN (CURRENT_TIMESTAMP-INTERVAL '1 day') AT TIME ZONE 'UTC' END,
 CASE WHEN f.status='VALIDATED' THEN (CURRENT_TIMESTAMP-INTERVAL '12 hours') AT TIME ZONE 'UTC' END,
 CASE WHEN f.status NOT IN('PLANNED','ASSIGNED') THEN t.supervisor_user_id END,
 CASE WHEN f.status='VALIDATED' THEN reviewer.id END,
 CASE WHEN f.status IN('COMPLETED','OBSERVED','VALIDATED') THEN 'Ejecución ficticia preparada para demostrar la revisión.' END,
 CASE WHEN f.status='OBSERVED' THEN 'Falta retirar los restos del sendero; corregir y aportar evidencia del nuevo intento.' END
FROM demo_work_fixtures f JOIN interventions w ON w.external_code='DEMO-OSG-WORK-'||lpad(f.n::text,2,'0')
JOIN teams t ON t.code='DEMO-INC-'||f.team_number AND t.deleted_at IS NULL
JOIN users reviewer ON reviewer.email='coordinador@demo.invalid' AND reviewer.deleted_at IS NULL
WHERE NOT EXISTS(SELECT 1 FROM intervention_locations l WHERE l.intervention_id=w.id);

INSERT INTO incident_intervention_links(incident_id,intervention_id,purpose_item_id,linked_by_user_id)
SELECT i.id,w.id,pg_temp.demo_item('INCIDENT_ACTION_PURPOSE',v.purpose),reviewer.id
FROM (VALUES(2,8,'MITIGATION'),(5,1,'MITIGATION'),(5,2,'PREVENTION'),(6,3,'MITIGATION'),(7,4,'MITIGATION'),
 (8,5,'MITIGATION'),(9,6,'MITIGATION'),(10,7,'MITIGATION'),(11,8,'MITIGATION'),(12,6,'MITIGATION')) v(incident,work,purpose)
JOIN incidents i ON i.client_reference=('30000000-0000-4000-8000-'||lpad(v.incident::text,12,'0'))::uuid
JOIN interventions w ON w.external_code='DEMO-OSG-WORK-'||lpad(v.work::text,2,'0')
JOIN users reviewer ON reviewer.email='coordinador@demo.invalid' AND reviewer.deleted_at IS NULL
WHERE NOT EXISTS(SELECT 1 FROM incident_intervention_links l WHERE l.incident_id=i.id AND l.intervention_id=w.id);

INSERT INTO incident_status_history(incident_id,status_item_id,changed_by_user_id,created_at)
SELECT i.id,pg_temp.demo_item('INCIDENT_STATUS',e.code),CASE WHEN e.code='PENDING_APPROVAL' THEN i.reported_by_user_id ELSE reviewer.id END,e.at
FROM incidents i JOIN demo_incident_fixtures f ON i.client_reference=('30000000-0000-4000-8000-'||lpad(f.n::text,12,'0'))::uuid
JOIN users reviewer ON reviewer.email='coordinador@demo.invalid' AND reviewer.deleted_at IS NULL
CROSS JOIN LATERAL(VALUES('PENDING_APPROVAL',i.created_at),('OPEN',i.approved_at),
 (f.status,CASE WHEN f.status NOT IN('PENDING_APPROVAL','OPEN') THEN coalesce(i.resolved_at,i.created_at+INTERVAL '1 day') END)) e(code,at)
WHERE e.at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM incident_status_history h WHERE h.incident_id=i.id AND h.status_item_id=pg_temp.demo_item('INCIDENT_STATUS',e.code));

INSERT INTO incident_updates(incident_id,author_user_id,kind_item_id,body,client_reference,request_hash)
SELECT i.id,CASE WHEN f.n=11 THEN i.reported_by_user_id ELSE reviewer.id END,pg_temp.demo_item('INCIDENT_UPDATE_KIND',CASE WHEN f.n=11 THEN 'REPORT_RESUBMITTED' WHEN f.n=8 THEN 'RESOLUTION_OBSERVED' WHEN f.n=3 THEN 'REPORT_RETURNED' ELSE 'RESOLVED' END),
 CASE WHEN f.n=11 THEN jsonb_build_object('before',jsonb_build_object('description',f.original_description),'after',jsonb_build_object('description',f.description))::text
      ELSE coalesce(i.resolution_summary,i.resolution_observation,i.correction_reason) END,
 ('32000000-0000-4000-8000-'||lpad(f.n::text,12,'0'))::uuid,repeat('0',64)
FROM incidents i JOIN demo_incident_fixtures f ON i.client_reference=('30000000-0000-4000-8000-'||lpad(f.n::text,12,'0'))::uuid
JOIN users reviewer ON reviewer.email='coordinador@demo.invalid' AND reviewer.deleted_at IS NULL
WHERE f.n IN(3,8,10,11,12) AND NOT EXISTS(SELECT 1 FROM incident_updates u WHERE u.incident_id=i.id);

INSERT INTO incident_status_history(incident_id,status_item_id,changed_by_user_id,created_at)
SELECT i.id,pg_temp.demo_item('INCIDENT_STATUS',e.code),CASE WHEN e.code='PENDING_APPROVAL' THEN i.reported_by_user_id ELSE reviewer.id END,e.at
FROM incidents i JOIN users reviewer ON reviewer.email='coordinador@demo.invalid' AND reviewer.deleted_at IS NULL
CROSS JOIN LATERAL(VALUES('CHANGES_REQUESTED',i.created_at+INTERVAL '1 hour'),('PENDING_APPROVAL',i.created_at+INTERVAL '2 hours')) e(code,at)
WHERE i.client_reference='30000000-0000-4000-8000-000000000011'::uuid
 AND NOT EXISTS(SELECT 1 FROM incident_status_history h WHERE h.incident_id=i.id AND h.created_at=e.at);

-- Received demonstration evidence is added through FileStorage by DemoIncidentEvidence.
-- No metadata points to an absent file, and no operational photo policy is disabled.

INSERT INTO intervention_events(intervention_id,intervention_location_id,attempt_number,action_code,actor_user_id,
 to_status_item_id,reason,details,occurred_at)
SELECT w.id,CASE WHEN e.action NOT IN('CREATED','ASSIGNED') THEN l.id END,
 CASE WHEN e.action NOT IN('CREATED','ASSIGNED') THEN l.attempt_number END,e.action,
 CASE WHEN e.action IN('STARTED','COMPLETED') THEN l.executed_by_user_id ELSE w.created_by_user_id END,
 pg_temp.demo_item('INTERVENTION_STATUS',e.state),CASE WHEN e.action='OBSERVED' THEN l.rejection_reason END,
 '{"demonstration":true}'::jsonb,e.at
FROM interventions w JOIN demo_work_fixtures f ON w.external_code='DEMO-OSG-WORK-'||lpad(f.n::text,2,'0')
JOIN intervention_locations l ON l.intervention_id=w.id
CROSS JOIN LATERAL(VALUES('CREATED','PLANNED',w.created_at),
 ('ASSIGNED','ASSIGNED',CASE WHEN w.team_id IS NOT NULL THEN w.created_at+INTERVAL '10 minutes' END),
 ('STARTED','IN_PROGRESS',l.started_at),('COMPLETED','COMPLETED',l.completed_at),
 ('OBSERVED','OBSERVED',CASE WHEN f.status='OBSERVED' THEN l.completed_at+INTERVAL '1 hour' END),
 ('VALIDATED','VALIDATED',l.validated_at)) e(action,state,at)
WHERE e.at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM intervention_events x WHERE x.intervention_id=w.id AND x.action_code=e.action);
