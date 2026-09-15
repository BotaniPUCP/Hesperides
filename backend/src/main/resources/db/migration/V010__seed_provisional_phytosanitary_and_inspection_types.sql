-- Propiedad de SPEC-005 §4.2 (pendiente P-10).
--
-- ⚠️ DATOS PRELIMINARES, NO CONFIRMADOS POR EL CLIENTE ⚠️
--
-- Las clases FITOSANITARIO e INSPECCION se sembraron en V009 sin tipos porque el
-- Excel DAF-OSG no las desglosa: esa hoja es el registro de los jardineros, y
-- ambas clases estan asignadas a grupos distintos (`herts` y `Roobert`), cuyo
-- detalle vive en documentos que no tenemos. La entrevista C1 pregunta
-- exactamente esto y sigue sin respuesta.
--
-- Estos 7 tipos se redactan a partir de lo que el dominio SI documenta:
-- aplicacion estacional a todo el campus cada 3 meses con refuerzos segun la
-- plaga (README §6), minimo 4 controles al ano (§7), el objetivo es controlar la
-- poblacion de plagas y no erradicarla (§4), y el estado sanitario es un atributo
-- del elemento verde (§8). No salen de ninguna lista del cliente.
--
-- COMO REVERTIRLOS cuando llegue el desglose real (P-10):
--   SELECT ... WHERE metadata->>'provisional' = 'true'
-- localiza estos siete y solo estos. Si algun registro ya los referencia, se
-- desactivan (is_active = FALSE) en vez de borrarse, como manda SPEC-003 §7.1.
-- Si ninguno los usa todavia, se pueden borrar sin dejar rastro.
--
-- MigrationSmokeTest fija que los tipos confirmados siguen siendo exactamente 45,
-- de modo que estos nunca se cuelan en esa cuenta.

-- ── Manejo fitosanitario (4 preliminares) ────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'FITOSANITARIO'), 'MONITOREO_PLAGAS',      'Monitoreo de plagas y enfermedades', 1, '{"provisional": true, "description": "Revisar los ejemplares para detectar presencia de plagas o enfermedades y decidir si hace falta intervenir"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'FITOSANITARIO'), 'APLICACION_ESTACIONAL', 'Aplicación estacional',              2, '{"provisional": true, "description": "Tratamiento programado a todo el campus, aproximadamente cada 3 meses"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'FITOSANITARIO'), 'APLICACION_REFUERZO',   'Aplicación de refuerzo',             3, '{"provisional": true, "description": "Tratamiento puntual fuera del calendario estacional, cuando una plaga lo exige"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'FITOSANITARIO'), 'TRATAMIENTO_FOCO',      'Tratamiento de foco localizado',     4, '{"provisional": true, "description": "Intervencion sobre un ejemplar o grupo concreto con plaga o enfermedad declarada"}');

-- ── Inspección y monitoreo (3 preliminares) ──────────────────────────────
-- Ojo: el grupo responsable de esta clase figura en el Excel como `Roobert`, que
-- parece el nombre de una persona y no una cuadrilla. Cabe que no sea una clase
-- de actividad con tipos propios, sino el trabajo de supervision de alguien. La
-- entrevista C1 tambien pregunta esto.
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'INSPECCION'), 'INSPECCION_ESTADO',   'Inspección de estado',           1, '{"provisional": true, "description": "Revision del estado de conservacion de un area verde o de sus elementos"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'INSPECCION'), 'INSPECCION_RIESGO',   'Inspección de riesgo',           2, '{"provisional": true, "description": "Evaluacion de un ejemplar por riesgo de caida de rama o volcadura"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'INSPECCION'), 'VERIFICACION_TRABAJO','Verificación de trabajo ejecutado', 3, '{"provisional": true, "description": "Comprobacion en campo de que una intervencion quedo correctamente ejecutada"}');
