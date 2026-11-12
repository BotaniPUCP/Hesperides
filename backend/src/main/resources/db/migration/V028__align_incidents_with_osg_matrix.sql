-- SPEC-201: OSG matrix, platform numbering and incident communication.
INSERT INTO catalog_types (code,name,description,is_system) VALUES
('INCIDENT_EVENT','Eventos de incidencias','Alcance actual del módulo',TRUE),
('INCIDENT_SERVICE_GROUP','Tipo de servicio de incidencias','Ámbito de áreas verdes',TRUE),
('INCIDENT_SERVICE','Servicios de áreas verdes','Matriz OSG',FALSE),
('INCIDENT_COMPANY','Empresas de atención','Empresas de la matriz OSG relacionadas con servicios del campus',FALSE),
('INCIDENT_PROCESS','Procesos N2','Matriz OSG',FALSE),
('INCIDENT_SUBPROCESS','Subprocesos de incidencias','Dependientes del proceso N2',FALSE),
('INCIDENT_SEVERITY','Severidad de incidencias','No equivale automáticamente a urgencia',FALSE),
('INCIDENT_IMPACT','Impactos de incidencias','Selección múltiple',FALSE),
('INCIDENT_ROOT_CAUSE','Causas raíz de áreas verdes','Catálogo CR de la matriz OSG',FALSE),
('INCIDENT_ACTION_PURPOSE','Propósitos de acción','Todas las acciones registradas son requeridas para el cierre',TRUE),
('INCIDENT_UPDATE_KIND','Clases de actualización','Comunicación y trazabilidad del caso',TRUE);

INSERT INTO catalog_items (catalog_type_id,code,label,sort_order)
SELECT ct.id,v.code,v.label,v.position FROM (VALUES
('INCIDENT_EVENT','INCIDENT','Incidencia',1),
('INCIDENT_SERVICE_GROUP','GREEN_AREAS','Servicios de Áreas verdes',1),
('INCIDENT_SERVICE','AV-01','AV-01- Mantenimiento de áreas verdes',1),
('INCIDENT_SERVICE','AV-02','AV-02- Rehabilitación de áreas verdes',2),
('INCIDENT_SERVICE','AV-03','AV-03- Habilitación de áreas verdes',3),
('INCIDENT_COMPANY','NONE','Ninguna',1),
('INCIDENT_COMPANY','EULEN','Eulen del Perú de Servicios Complementarios S.A',2),
('INCIDENT_COMPANY','CRUZ_VERDE','Cruz Verde Fumigación y Limpieza Industrial S.A',3),
('INCIDENT_COMPANY','TERRAVERDE','Terraverde Ingenieros SAC',4),
('INCIDENT_COMPANY','HERTS','Herts Servicios Integrales SAC',5),
('INCIDENT_COMPANY','LUCET','Lucet SAC',6),
('INCIDENT_COMPANY','MERCHANDISING_PRODUCTS','Merchandising Products SRL',7),
('INCIDENT_COMPANY','VEND','Vend SAC',8),
('INCIDENT_COMPANY','SITE_PERU','SITE Perú SAC',9),
('INCIDENT_COMPANY','BCP','Banco de Crédito',10),
('INCIDENT_COMPANY','BBVA','BBVA Banco Continental',11),
('INCIDENT_COMPANY','BGG_COSTA','BGG Costa SAC',12),
('INCIDENT_COMPANY','CHARLOTTE','Charlotte SA',13),
('INCIDENT_COMPANY','CONTROL_INVERSIONES','Control Inversiones SAC',14),
('INCIDENT_COMPANY','DISTRIBUIDORA_LEO','Distribuidora Leo',15),
('INCIDENT_COMPANY','EXPERTOS_CAFE','Expertos en Cafe Perú SAC',16),
('INCIDENT_COMPANY','TOQUE_GOURMET','Toque Gourmet',17),
('INCIDENT_COMPANY','FRUITS_HEALTH','Fruits and Health Perú SAC',18),
('INCIDENT_COMPANY','FRANQUICIAS_UNIDAS','Franquicias Unidas',19),
('INCIDENT_COMPANY','GRUPO_ROBLAS','Grupo Roblas SAC',20),
('INCIDENT_COMPANY','INTERANK','Interank',21),
('INCIDENT_COMPANY','ISALIA_SALAZAR','Isalia Salazar Juani',22),
('INCIDENT_COMPANY','MARSH_REHDER','Marsh Rehder',23),
('INCIDENT_COMPANY','NEWREST','Newrest',24),
('INCIDENT_COMPANY','RICOH','Ricoh del Peru SAC',25),
('INCIDENT_COMPANY','SOLO_UTILES','Solo Útiles EIRL',26),
('INCIDENT_COMPANY','TIENDITA_MARVA','Tiendita Marva',27),
('INCIDENT_COMPANY','TIOLFILO_CHILQUILLO','Tiolfilo Chilquillo',28),
('INCIDENT_COMPANY','MARY_CHALCO','Mary Chalco',29),
('INCIDENT_COMPANY','BEMBOS','Bembos',30),
('INCIDENT_COMPANY','GISER','Giser Corp',31),
('INCIDENT_COMPANY','RINGICO_MORENO','Ringico Moreno Huaman',32),
('INCIDENT_COMPANY','EDDY_SANTIAGO','Eddy Santiago Avalos',33),
('INCIDENT_COMPANY','WILBER_ARTEAGA','Wilber Arteaga Silverio',34),
('INCIDENT_COMPANY','TITO_CONDORI','Tito Condori Yupanqui',35),
('INCIDENT_COMPANY','ORLANDO_ARTEAGA','Orlando Arteaga Silverio',36),
('INCIDENT_COMPANY','JHON_HUAMAN','Jhon Huaman Chegni',37),
('INCIDENT_PROCESS','GSG-01','GSG-01- Planificación de servicios y operaciones del campus',1),
('INCIDENT_PROCESS','GSG-02','GSG-02- Gestión de servicios y operaciones del campus',2),
('INCIDENT_PROCESS','GSG-03','GSG-03- Supervisión de servicios y operaciones del campus',3),
('INCIDENT_PROCESS','GSG-04','GSG-04- Control y evaluación',4),
('INCIDENT_SUBPROCESS','GREEN_OPERATIONS','Gestión operativa de los servicios de áreas verdes del campus y periféricos',1),
('INCIDENT_SEVERITY','HIGH','Alta',1),
('INCIDENT_SEVERITY','MEDIUM','Media',2),
('INCIDENT_SEVERITY','LOW','Baja',3),
('INCIDENT_IMPACT','SERVICE','Servicio',1),
('INCIDENT_IMPACT','SAFETY','Seguridad',2),
('INCIDENT_IMPACT','LEGAL','Legal',3),
('INCIDENT_IMPACT','ENVIRONMENT','Ambiental',4),
('INCIDENT_IMPACT','IMAGE','Imagen institucional',5),
('INCIDENT_IMPACT','MULTIPLE','Varios',6),
('INCIDENT_ACTION_PURPOSE','MITIGATION','Mitigación / corrección inmediata',1),
('INCIDENT_ACTION_PURPOSE','PREVENTION','Prevención / mejora',2),
('INCIDENT_UPDATE_KIND','COMMENT','Comentario',1),
('INCIDENT_UPDATE_KIND','REVIEW','Revisión',2),
('INCIDENT_UPDATE_KIND','WORK_ADDED','Acción registrada',3),
('INCIDENT_UPDATE_KIND','WORK_COMPLETED','Acción completada',4)
) v(type,code,label,position) JOIN catalog_types ct ON ct.code=v.type;

UPDATE catalog_items SET parent_item_id=(SELECT ci.id FROM catalog_items ci
 JOIN catalog_types ct ON ct.id=ci.catalog_type_id
 WHERE ct.code='INCIDENT_PROCESS' AND ci.code='GSG-02')
 WHERE catalog_type_id=(SELECT id FROM catalog_types WHERE code='INCIDENT_SUBPROCESS');

-- Full client wording is metadata: catalog labels are limited to 100 characters.
INSERT INTO catalog_items (catalog_type_id,code,label,sort_order,metadata)
SELECT ct.id,v.code,v.label,v.position,jsonb_build_object('description',v.description)
FROM (VALUES
('AV-01','AV-01 — Renovación natural de follaje de palmera',1,'Caída y/o acumulacion de hojas de palmera por renovacion natural de follaje (crecimiento de inflorescencia)'),
('AV-02','AV-02 — Caída de ramas por sobrecrecimiento',2,'Caída de ramas por sobrecrecimiento, por falta de poda/competencia por la luz/factores climaticos'),
('AV-03','AV-03 — Acumulación estacional de hojarasca',3,'Caida estacional de hojarasca, acumulacion en exceso por falta de recojo/conglomerado de arboles'),
('AV-04','AV-04 — Sobrecrecimiento de arbustos',4,'Arbustos con sobrecrecimiento por falta de poda/exceso de agua/competencia por la luz/factores climaticos'),
('AV-05','AV-05 — Sobrecrecimiento de maleza',5,'Maleza (mala hierba) con sobrecrecimineto exceso de agua/ falta de control de malezas'),
('AV-06','AV-06 — Estructura envejecida de árboles o arbustos',6,'Árbol o arbusto muy antiguos con estructura semileñosa envejecida (frágil), requieren programa de renovacion'),
('AV-07','AV-07 — Césped deteriorado por sobrecarga de uso',7,'Césped deteriorado por sobrecarga de uso/alto transito'),
('AV-08','AV-08 — Residuos de corte y poda sin recoger',8,'Residuos acumulados de servicio de corte de cesped y poda, debido falta de supervisión en la ruta de limpieza'),
('AV-09','AV-09 — Aspersor mal colocado',9,'Aspersor mal colocado /con rotación manual incorrecta'),
('AV-10','AV-10 — Elementos de seguridad ausentes o deteriorados',10,'Falta de elementos de seguridad y/o elementos de segruridad deteriorados durante las labores de jardineria (conos, cintas, mallas, carteles etc)'),
('AV-11','AV-11 — Árbol inestable o sin tutor',11,'Arbol con falta de tutor/tallo en condicion inestable'),
('AV-12','AV-12 — Falta de cronograma de poda preventiva',12,'Falta de cronograma de poda preventiva de arboles y arbustos'),
('AV-13','AV-13 — Ausencia o tardanza del personal de apoyo',13,'Personal de Eulen con tardanza / ausencia en apoyo de labores de jardines'),
('AV-14','AV-14 — Sobrecrecimiento de césped',14,'Cesped con sobrecimiento por falta de corte /exceso de agua/ factores climaticos'),
('AV-15','AV-15 — Sobrecrecimiento de árboles',15,'Arboles con sobrecrecimineto, por falta de poda/exceso de agua/competencia por la luz/factores climaticos')
) v(code,label,position,description)
JOIN catalog_types ct ON ct.code='INCIDENT_ROOT_CAUSE';

CREATE SEQUENCE incident_official_number_seq;
ALTER TABLE incidents
 ADD COLUMN official_number BIGINT,
 ADD COLUMN event_item_id BIGINT REFERENCES catalog_items(id),
 ADD COLUMN service_group_item_id BIGINT REFERENCES catalog_items(id),
 ADD COLUMN service_item_id BIGINT REFERENCES catalog_items(id),
 ADD COLUMN company_item_id BIGINT REFERENCES catalog_items(id),
 ADD COLUMN process_item_id BIGINT REFERENCES catalog_items(id),
 ADD COLUMN subprocess_item_id BIGINT REFERENCES catalog_items(id),
 ADD COLUMN severity_item_id BIGINT REFERENCES catalog_items(id),
 ADD COLUMN responsible_user_id BIGINT REFERENCES users(id),
 ADD COLUMN immediate_action TEXT,
 ADD COLUMN root_cause_item_id BIGINT REFERENCES catalog_items(id),
 ADD COLUMN root_cause TEXT,
 ADD COLUMN preventive_action TEXT,
 ADD COLUMN impacted_process TEXT,
 ADD COLUMN observations TEXT,
 ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE,
 ADD COLUMN closure_business_days BIGINT CHECK (closure_business_days >= 0);

UPDATE incidents SET event_item_id=(SELECT ci.id FROM catalog_items ci JOIN catalog_types ct
 ON ct.id=ci.catalog_type_id WHERE ct.code='INCIDENT_EVENT' AND ci.code='INCIDENT'),
 service_group_item_id=(SELECT ci.id FROM catalog_items ci JOIN catalog_types ct
 ON ct.id=ci.catalog_type_id WHERE ct.code='INCIDENT_SERVICE_GROUP' AND ci.code='GREEN_AREAS');

DO $$ DECLARE incident_id BIGINT; BEGIN
 FOR incident_id IN SELECT id FROM incidents WHERE approved_at IS NOT NULL ORDER BY approved_at,id LOOP
  UPDATE incidents SET official_number=nextval('incident_official_number_seq') WHERE id=incident_id;
 END LOOP;
END $$;
CREATE UNIQUE INDEX idx_incidents_official_number ON incidents(official_number)
 WHERE deleted_at IS NULL AND official_number IS NOT NULL;

CREATE TABLE incident_impacts (
 id BIGSERIAL PRIMARY KEY,
 incident_id BIGINT NOT NULL REFERENCES incidents(id),
 impact_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX idx_incident_impacts_live ON incident_impacts(incident_id,impact_item_id) WHERE deleted_at IS NULL;

ALTER TABLE incident_interventions ADD COLUMN purpose_item_id BIGINT REFERENCES catalog_items(id);
UPDATE incident_interventions SET purpose_item_id=(SELECT ci.id FROM catalog_items ci
 JOIN catalog_types ct ON ct.id=ci.catalog_type_id
 WHERE ct.code='INCIDENT_ACTION_PURPOSE' AND ci.code='MITIGATION');

CREATE TABLE incident_updates (
 id BIGSERIAL PRIMARY KEY,
 incident_id BIGINT NOT NULL REFERENCES incidents(id),
 author_user_id BIGINT NOT NULL REFERENCES users(id),
 kind_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
 body TEXT NOT NULL CHECK (length(trim(body)) > 0),
 client_reference UUID NOT NULL,
 request_hash VARCHAR(64) NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX idx_incident_updates_reference ON incident_updates(incident_id,client_reference)
 WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_updates_timeline ON incident_updates(incident_id,created_at,id)
 WHERE deleted_at IS NULL;
