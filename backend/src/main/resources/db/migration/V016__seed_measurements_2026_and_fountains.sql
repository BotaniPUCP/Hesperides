-- Propiedad de SPEC-103 §4.5. ARCHIVO GENERADO: no se edita a mano.
-- Lo produce scripts/catastro/generar_actualizacion_2026.py desde docs/dominio/datos/.

-- Medidas de 2026
-- Las 76 palmeras medidas se cargaron sin fecha (V014).
UPDATE green_elements SET measured_at = '2026-01-01'
 WHERE data_source = 'MEASURED' AND measured_at IS NULL;

UPDATE green_elements SET height_m = 10.5, trunk_height_m = NULL,
       dbh_cm = 124.0, crown_radius_m = 6.5, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH1' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 6.0, trunk_height_m = NULL,
       dbh_cm = 72.0, crown_radius_m = 2.5, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH2' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 7.5, trunk_height_m = NULL,
       dbh_cm = 215.0, crown_radius_m = 4.8, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH3' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 5.3, trunk_height_m = NULL,
       dbh_cm = 37.0, crown_radius_m = 1.3, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH4' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 6.5, trunk_height_m = NULL,
       dbh_cm = 83.0, crown_radius_m = 2.5, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH5' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 6.0, trunk_height_m = NULL,
       dbh_cm = 37.0, crown_radius_m = 2.5, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH6' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 7.5, trunk_height_m = NULL,
       dbh_cm = 132.0, crown_radius_m = 2.2, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH7' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 6.0, trunk_height_m = NULL,
       dbh_cm = 44.0, crown_radius_m = 1.7, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH8' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 7.5, trunk_height_m = NULL,
       dbh_cm = 144.0, crown_radius_m = 7.5, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH9' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 7.7, trunk_height_m = NULL,
       dbh_cm = 102.0, crown_radius_m = 3.1, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH10' AND deleted_at IS NULL;
UPDATE green_elements SET height_m = 7.8, trunk_height_m = NULL,
       dbh_cm = 170.0, crown_radius_m = 2.1, data_source = 'MEASURED',
       measured_at = '2026-01-01', notes = 'Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
 WHERE source_reference = 'BH11' AND deleted_at IS NULL;

-- Evaluaciones del Bosque Húmedo
INSERT INTO green_element_assessments (green_element_id, assessed_on, has_disease, has_pests,
    has_mechanical_damage, is_leaning, has_dead_branches, has_cavities_or_rot, has_exposed_roots,
    interferes_with_infrastructure, recommended_management, observation, notes)
SELECT e.id, DATE '2026-01-01', v.enf, v.pla, v.dan, v.inc, v.ram, v.cav, v.rai, v.inf, v.manejo, v.obs, 'Evaluación de «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente.'
  FROM (VALUES
    ('BH1', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, TRUE, FALSE, 'Sin intervención', NULL),
    ('BH2', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH3', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH4', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH5', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH6', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH7', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH8', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH9', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH10', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH11', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH12', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, TRUE, FALSE, 'Sin intervención', NULL),
    ('BH13', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH14', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL),
    ('BH15', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Sin intervención', NULL)
) AS v(ref, enf, pla, dan, inc, ram, cav, rai, inf, manejo, obs)
  JOIN green_elements e ON e.source_reference = v.ref AND e.deleted_at IS NULL;

-- Una ceiba del archivo que no exista en la base es un error de la fuente, no
-- algo que se omita en silencio.
DO $$ BEGIN
    IF (SELECT count(*) FROM green_element_assessments) <> 15 THEN
        RAISE EXCEPTION 'Evaluaciones del Bosque Húmedo sin ejemplar en la base';
    END IF;
END $$;

-- Procedencia de las especies
UPDATE species SET origin_item_id = (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'SPECIES_ORIGIN' AND ci.code = 'INTRODUCED') WHERE scientific_name = 'Ceiba speciosa';

-- Bebederos
INSERT INTO campus_features (code, feature_type_item_id, name, geom, attributes)
SELECT v.code, (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'FEATURE_TYPE' AND ci.code = 'DRINKING_FOUNTAIN'), v.name, v.geom, v.attrs
  FROM (VALUES
    ('PT_bb1', 'Maestranza - Salida del baño', ST_SetSRID(ST_MakePoint(-77.07833128948143, -12.06757677567949), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb10', 'Polideportivo - Entre puerta de Danza aeróbicos e Ingreso Oeste', ST_SetSRID(ST_MakePoint(-77.08037295575657, -12.06639014905771), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb11', 'Polideportivo - Entre puerta de Danza aeróbicos e Ingreso Oeste', ST_SetSRID(ST_MakePoint(-77.08038974130291, -12.06658384423816), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb12', 'Polideportivo - Entre puerta de Danza aeróbicos e Ingreso Oeste', ST_SetSRID(ST_MakePoint(-77.08037282323659, -12.06658308536295), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb13', 'Polideportivo - Entre puerta de Tenis de Mesa y  Puerta 2', ST_SetSRID(ST_MakePoint(-77.0802478238928, -12.06700167589886), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb14', 'Polideportivo - Entre puerta de Tenis de Mesa y  Puerta 2', ST_SetSRID(ST_MakePoint(-77.0802407017241, -12.0670017783377), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb15', 'Polideportivo - Entre puerta de Tenis de Mesa y  Puerta 2', ST_SetSRID(ST_MakePoint(-77.08023366936487, -12.06700127246107), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb16', 'Polideportivo - Ingreso 3', ST_SetSRID(ST_MakePoint(-77.07999307765145, -12.0669192740457), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb17', 'Polideportivo - Ingreso 3', ST_SetSRID(ST_MakePoint(-77.07998442812959, -12.06691957936814), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb18', 'Polideportivo - Ingreso 3', ST_SetSRID(ST_MakePoint(-77.07997553407341, -12.06691930448109), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb19', 'Polideportivo - Entre Puerta Artes Mariciales  y Puerta  Oeste', ST_SetSRID(ST_MakePoint(-77.07990192080459, -12.06667367289582), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb2', 'Bebedero entre los salones en el pasaje principal', ST_SetSRID(ST_MakePoint(-77.0784419, -12.0653638), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb20', 'Polideportivo - Entre Puerta Artes Mariciales  y Puerta  Oeste', ST_SetSRID(ST_MakePoint(-77.079913, -12.0666747), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb21', 'Polideportivo - Entre Puerta Artes Mariciales  y Puerta  4', ST_SetSRID(ST_MakePoint(-77.0798977834579, -12.06637214136694), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb22', 'Polideportivo - Entre Puerta Artes Mariciales  y Puerta  4', ST_SetSRID(ST_MakePoint(-77.07991762721342, -12.06637451894342), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb25v1', 'EEGGLL - Bebedero Piso 1 - Baño Varones', ST_SetSRID(ST_MakePoint(-77.08043410035584, -12.06777288464316), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "EEGGLL"}'::jsonb),
    ('PT_bb26m1', 'EEGGLL - Bebedero Piso 1 - Baño Mujeres', ST_SetSRID(ST_MakePoint(-77.0804334321788, -12.06734051152695), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "EEGGLL"}'::jsonb),
    ('PT_bb27p2', 'EEGGLL - Bebedero Piso 2', ST_SetSRID(ST_MakePoint(-77.08040245721375, -12.06734467259249), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "EEGGLL"}'::jsonb),
    ('PT_bb36', 'Pasadizo entre Facultad de Letras y Humanidades y Facultad de Derecho', ST_SetSRID(ST_MakePoint(-77.08115565491902, -12.06979331418662), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb37', 'Facultad de Derecho - Piso 1 - Al lado del ascesor de Personas con Discapacidad', ST_SetSRID(ST_MakePoint(-77.0808464, -12.0698435), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb42', 'Facultad de Artes Antiguas', ST_SetSRID(ST_MakePoint(-77.07889487814396, -12.07026771171277), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb46p1', 'EEGGCC - Piso 1', ST_SetSRID(ST_MakePoint(-77.07957810156628, -12.07127182594118), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "EEGGCC"}'::jsonb),
    ('PT_bb47p2', 'EEGGCC - Piso 2', ST_SetSRID(ST_MakePoint(-77.07955664989805, -12.07123161556943), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "EEGGCC"}'::jsonb),
    ('PT_bb48p3', 'EEGGCC - Piso 3', ST_SetSRID(ST_MakePoint(-77.07952647539713, -12.07116390811631), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "EEGGCC"}'::jsonb),
    ('PT_bb50s1', 'CIA - Sotano 1', ST_SetSRID(ST_MakePoint(-77.0802827, -12.0719774), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CIA"}'::jsonb),
    ('PT_bb51p2', 'CIA - Piso 2', ST_SetSRID(ST_MakePoint(-77.0802789, -12.0719812), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CIA"}'::jsonb),
    ('PT_bb52p3', 'CIA - Piso 3', ST_SetSRID(ST_MakePoint(-77.0802839, -12.0720012), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CIA"}'::jsonb),
    ('PT_bb53p4', 'CIA - Piso 4', ST_SetSRID(ST_MakePoint(-77.08028119503199, -12.07199066197001), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CIA"}'::jsonb),
    ('PT_bb55p2', 'Bebedero piso 2', ST_SetSRID(ST_MakePoint(-77.07926464220334, -12.07278090037205), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "AULARIO"}'::jsonb),
    ('PT_bb56p3', 'Bebedero piso 3', ST_SetSRID(ST_MakePoint(-77.0792606147224, -12.0727697584858), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "AULARIO"}'::jsonb),
    ('PT_bb57p4', 'Bebedero piso 4', ST_SetSRID(ST_MakePoint(-77.07925599783991, -12.07276232413074), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "AULARIO"}'::jsonb),
    ('PT_bb58p5', 'Bebedero piso 5', ST_SetSRID(ST_MakePoint(-77.07925308272442, -12.07275530519491), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "AULARIO"}'::jsonb),
    ('PT_bb59p6', 'Bebedero piso 6', ST_SetSRID(ST_MakePoint(-77.079250482711, -12.07274869981887), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "AULARIO"}'::jsonb),
    ('PT_bb60p7', 'Bebedero piso 7', ST_SetSRID(ST_MakePoint(-77.07924622685344, -12.07273850334078), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "AULARIO"}'::jsonb),
    ('PT_bb65', 'Pabelón V - Jardín de Ingeniería Electrónica', ST_SetSRID(ST_MakePoint(-77.0821188, -12.0728367), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb66', NULL, ST_SetSRID(ST_MakePoint(-77.08068217608592, -12.06789697244462), 4326), '{"tipo": "FOUNTAIN"}'::jsonb),
    ('PT_bb67', NULL, ST_SetSRID(ST_MakePoint(-77.0802681, -12.0706564), 4326), '{"tipo": "FOUNTAIN"}'::jsonb),
    ('PT_bb7', 'Bebedero dentro del Gimnasio - Piso 1', ST_SetSRID(ST_MakePoint(-77.07964011151958, -12.06601210085656), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb9', 'Polideportivo - Entre puerta de Danza aeróbicos e Ingreso 1', ST_SetSRID(ST_MakePoint(-77.08039341273776, -12.06638840824048), 4326), '{"tipo": "FOUNTAIN", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb32', 'Remopdelación bebedero en la pileta - Pabellón Z', ST_SetSRID(ST_MakePoint(-77.08081591638523, -12.06902407251616), 4326), '{"tipo": "FOUNTAIN", "estado": "NEW", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb28p3', 'EEGGLL - Bebedero Piso 3', ST_SetSRID(ST_MakePoint(-77.08039650494939, -12.06775997416409), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "EEGGLL"}'::jsonb),
    ('PT_bb29p4', 'EEGGLL - Bebedero Piso 4', ST_SetSRID(ST_MakePoint(-77.07997534317434, -12.06743665568163), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "EEGGLL"}'::jsonb),
    ('PT_bb3', 'Bebedero ubicado en la zona de descando de los Puffs', ST_SetSRID(ST_MakePoint(-77.07840085267637, -12.06489127275659), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb30', 'Ubicado frente a el Centro Federado de la Facultad de Educación', ST_SetSRID(ST_MakePoint(-77.07928397015226, -12.06780002450218), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb34', 'Piso 1 de McGregror', ST_SetSRID(ST_MakePoint(-77.07871471526529, -12.06850766118429), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb35', 'Piso 1 de McGregror', ST_SetSRID(ST_MakePoint(-77.07870889269562, -12.06852907838714), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb38', 'Facultad de Derecho - Piso 1 - Al lado de la rotonda de derecho y frente a la oficina de entrga de evaluaciones', ST_SetSRID(ST_MakePoint(-77.08090796832414, -12.07003674188035), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb41', 'Facultad de Gastronomía - Piso 1', ST_SetSRID(ST_MakePoint(-77.08169035133888, -12.0708120047599), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb61', 'Cepre PUCP -  Baño Varones', ST_SetSRID(ST_MakePoint(-77.0790372, -12.072823), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bb62', 'Cepre PUCP -  Baño Muejeres', ST_SetSRID(ST_MakePoint(-77.07903169886583, -12.07277342316275), 4326), '{"tipo": "BOTTLE_FILLER", "estado": "OPERATIONAL", "sector": "CAMPUS"}'::jsonb),
    ('PT_bbn23', 'Jardín frontal de la Facultad de Artes Nuevas - al lado mesas campestres', ST_SetSRID(ST_MakePoint(-77.07916357425553, -12.06675087082837), 4326), '{"tipo": "UNKNOWN", "estado": "NEW", "sector": "CAMPUS"}'::jsonb),
    ('PT_bbn24', 'Bebedero nuevo ubicado entre la entraba principal de EEGGLL por Tontódromo', ST_SetSRID(ST_MakePoint(-77.0797559, -12.0674511), 4326), '{"tipo": "UNKNOWN", "estado": "NEW", "sector": "EEGGLL"}'::jsonb),
    ('PT_bbn33', 'Bebedero Nuevo en la pileta - Pabellón Z', ST_SetSRID(ST_MakePoint(-77.0808159226413, -12.06903100606733), 4326), '{"tipo": "UNKNOWN", "estado": "NEW", "sector": "CAMPUS"}'::jsonb),
    ('PT_bbn39', 'Piso 1 Comedor central al lado del panel de nutrición - Ingreso 2', ST_SetSRID(ST_MakePoint(-77.0811578359757, -12.07032828738312), 4326), '{"tipo": "UNKNOWN", "estado": "NEW", "sector": "CAMPUS"}'::jsonb),
    ('PT_bbn40p2', 'piso 2 de Central - Al lado de las escaleras al norte', ST_SetSRID(ST_MakePoint(-77.08132169119023, -12.07030189642295), 4326), '{"tipo": "UNKNOWN", "estado": "NEW", "sector": "CAMPUS"}'::jsonb),
    ('PT_bbn45', 'Bebedero frente a EEGGCC y frente a Sociales', ST_SetSRID(ST_MakePoint(-77.07982944528082, -12.07063074869953), 4326), '{"tipo": "UNKNOWN", "estado": "NEW", "sector": "EEGGCC"}'::jsonb),
    ('PT_bbn54p1', 'Bebedero Nuevo - piso 1', ST_SetSRID(ST_MakePoint(-77.0794009659278, -12.07278473761186), 4326), '{"tipo": "UNKNOWN", "estado": "NEW", "sector": "AULARIO"}'::jsonb),
    ('PT_bbn6', 'Entre las losas Azules , Cnacha de Rugby y la canchas de paleta Frontón', ST_SetSRID(ST_MakePoint(-77.0804864, -12.0658056), 4326), '{"tipo": "UNKNOWN", "estado": "NEW", "sector": "CAMPUS"}'::jsonb),
    ('PT_bbr4', 'Frente a la Cancha de futbol', ST_SetSRID(ST_MakePoint(-77.07925584254092, -12.06593958568306), 4326), '{"tipo": "UNKNOWN", "estado": "DETERIORATED", "sector": "CAMPUS", "nota": "La fuente lo agrupa como DETERIORATED pero su campo dice «remodelación»."}'::jsonb),
    ('PT_bbr44', 'Bebedero entre EEGGCC y EL Puesto', ST_SetSRID(ST_MakePoint(-77.07932389859334, -12.07139881146527), 4326), '{"tipo": "UNKNOWN", "estado": "DETERIORATED", "sector": "EEGGCC", "nota": "La fuente lo agrupa como DETERIORATED pero su campo dice «remodelación»."}'::jsonb),
    ('PT_bbr64', 'Al lado de la Cancha de Minas', ST_SetSRID(ST_MakePoint(-77.08180364932814, -12.07215505085395), 4326), '{"tipo": "UNKNOWN", "estado": "DETERIORATED", "sector": "CAMPUS", "nota": "La fuente lo agrupa como DETERIORATED pero su campo dice «remodelación»."}'::jsonb),
    ('PT_bbr8', 'Bebedero Fuera del Gimnasio', ST_SetSRID(ST_MakePoint(-77.07967169402562, -12.06614097908503), 4326), '{"tipo": "UNKNOWN", "estado": "DETERIORATED", "sector": "CAMPUS", "nota": "La fuente lo agrupa como DETERIORATED pero su campo dice «remodelación»."}'::jsonb),
    ('PT_bbr5', 'Al lado de l Kiosco de Deportes', ST_SetSRID(ST_MakePoint(-77.0793714, -12.0662097), 4326), '{"tipo": "UNKNOWN", "estado": "DETERIORATED", "sector": "CAMPUS", "nota": "La fuente lo agrupa como DETERIORATED pero su campo dice «remodelación»."}'::jsonb),
    ('PT_bbr49', 'Plazuela entre Facultad de Arquitectura y Facultad de Sociales', ST_SetSRID(ST_MakePoint(-77.0804487, -12.0710296), 4326), '{"tipo": "UNKNOWN", "estado": "DETERIORATED", "sector": "CAMPUS", "nota": "La fuente lo agrupa como DETERIORATED pero su campo dice «remodelación»."}'::jsonb),
    ('PT_bbr31', 'Patio de Comedor de Letras', ST_SetSRID(ST_MakePoint(-77.0797803267004, -12.06826589540655), 4326), '{"tipo": "UNKNOWN", "estado": "DETERIORATED", "sector": "CAMPUS", "nota": "La fuente lo agrupa como DETERIORATED pero su campo dice «remodelación»."}'::jsonb),
    ('PT_bbr63', 'Facultad de Minas - 1er piso', ST_SetSRID(ST_MakePoint(-77.08136512725862, -12.07192097018784), 4326), '{"tipo": "UNKNOWN", "estado": "DECOMMISSIONED", "sector": "CAMPUS", "nota": "La fuente lo agrupa como DECOMMISSIONED pero su campo dice «operativo»."}'::jsonb),
    ('PT_bbr43', 'Comedor de Arte Antiguo', ST_SetSRID(ST_MakePoint(-77.07953217280732, -12.07044098798652), 4326), '{"tipo": "UNKNOWN", "estado": "DECOMMISSIONED", "sector": "CAMPUS", "nota": "La fuente lo agrupa como DECOMMISSIONED pero su campo dice «operativo»."}'::jsonb)
) AS v(code, name, geom, attrs);
