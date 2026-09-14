-- Propiedad de SPEC-005 §4.2. Fuente: hoja `tipo de actividades` del Excel
-- DAF-OSG 2025-2026.
--
-- DIVERGENCIA DELIBERADA CON EL SPEC: SPEC-005 §4.2 asume que V010__seed_catalogs
-- ya creó el catalog_type INTERVENTION_TYPE con seis valores inventados por
-- SPEC-002, y abre con un UPDATE que los da de baja. V010 nunca llegó a
-- escribirse, así que aquí el catalog_type se crea y no hay nada que desactivar:
-- un UPDATE copiado del spec afectaría a cero filas y describiría mal la
-- historia. DECORACION y REMOCION_TERRENO simplemente no se siembran — no
-- existen en la operación real. El fondo de CA-03 (que no se ofrezcan) se
-- cumple; la forma (que existan con is_active = FALSE) no aplica sin V010.
--
-- DESCRIPCIONES PROVISIONALES: el Excel trae una descripción por tipo, pero no
-- está en el repositorio. Solo `Canteo` y `Deshierbo` constan textuales en
-- material del cliente (docs/dominio/README.md §5.4). Las 43 restantes están
-- redactadas de forma genérica a partir del nombre y la clase, y deben
-- contrastarse con la hoja `tipo de actividades` antes de producción: son el
-- texto de ayuda que el operario lee en el formulario de campo.

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('INTERVENTION_CLASS', 'Clases de intervención',
     'Agrupación de primer nivel de los trabajos sobre áreas verdes', FALSE),
    ('INTERVENTION_TYPE',  'Tipos de intervención',
     'Trabajos ejecutables sobre un elemento', FALSE);

-- ── Las nueve clases ─────────────────────────────────────────────────────
-- El grupo responsable que el cliente asigna a cada clase se guarda en
-- metadata: conecta con las cuadrillas de V012 y explica por qué FITOSANITARIO
-- e INSPECCION llegan sin tipos (su detalle vive fuera de la hoja de jardineros).
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'HABILITACION',   'Habilitación de jardines',     1, '{"responsible_group": "jardineros"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'REHABILITACION', 'Rehabilitación de jardines',   2, '{"responsible_group": "jardineros"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'MANTENIMIENTO',  'Mantenimiento de jardines',    3, '{"responsible_group": "jardineros"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'PODA',           'Poda',                         4, '{"responsible_group": "jardineros"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'PROPAGACION',    'Propagación y plantación',     5, '{"responsible_group": "jardineros"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'RIEGO',          'Riego',                        6, '{"responsible_group": "jardineros"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'FITOSANITARIO',  'Manejo fitosanitario',         7, '{"responsible_group": "herts"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'RESIDUOS',       'Manejo de residuos vegetales', 8, '{"responsible_group": "jardineros / herts"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'INSPECCION',     'Inspección y monitoreo',       9, '{"responsible_group": "Roobert"}');

-- ── Habilitación de jardines (6) ─────────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'PREPARACION_TERRENO',   'Preparación del terreno',          1, '{"description": "Acondicionar el terreno antes de plantar: limpieza, nivelación y removido del suelo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'INCORPORACION_SUSTRATO','Incorporación de sustrato',        2, '{"description": "Añadir tierra de cultivo o sustrato preparado para mejorar la base de plantación"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'INSTALACION_PLANTAS',   'Instalación de plantas',           3, '{"description": "Colocar plantas en un área que se habilita por primera vez"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'INSTALACION_CESPED',    'Instalación de césped',            4, '{"description": "Colocar césped en panel (champa) o sembrarlo en un área nueva"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'COBERTURA_ORNAMENTAL',  'Colocación de cobertura ornamental',5, '{"description": "Extender confitillo, mulch u otro acabado decorativo sobre el suelo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'INSTALACION_TUTORES',   'Instalación de tutores',           6, '{"description": "Colocar estacas o soportes que guían y sostienen a la planta joven"}');

-- ── Rehabilitación de jardines (7) ───────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'REPOSICION_PLANTAS',      'Reposición de plantas',              1, '{"description": "Sustituir plantas muertas o deterioradas por ejemplares sanos"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'RECUPERACION_AREAS',      'Recuperación de áreas verdes',       2, '{"description": "Devolver a condición de uso un área degradada o abandonada"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'RENOVACION_JARDINERAS',   'Renovación de jardineras',           3, '{"description": "Rehacer el contenido de una jardinera: sustrato, plantas y acabado"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'MEJORAMIENTO_SUELO',      'Mejoramiento del suelo',             4, '{"description": "Corregir la calidad del suelo existente para recuperar su fertilidad"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'RENOVACION_COBERTURA',    'Renovación de cobertura ornamental', 5, '{"description": "Reponer o cambiar el confitillo, mulch u otro acabado ya desgastado"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'RESIEMBRA',               'Resiembra',                          6, '{"description": "Volver a sembrar sobre un área donde la plantación anterior no prosperó"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'REUBICACION_MACETAS',     'Reubicación de macetas',             7, '{"description": "Cambiar de sitio macetas o macetones ya instalados"}');

-- ── Mantenimiento de jardines (10) ───────────────────────────────────────
-- Canteo y Deshierbo llevan la descripción textual del cliente (README §5.4).
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'CANTEO',                 'Canteo',                          1, '{"description": "Delimitar y perfilar los bordes de jardineras o macizos"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'DESHIERBO',              'Deshierbo',                       2, '{"description": "Quitar malas hierbas"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'ESCARDA',                'Escarda',                         3, '{"description": "Remover superficialmente el suelo alrededor de la planta para airearlo y eliminar hierba naciente"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'LIMPIEZA_HOJARASCA',     'Limpieza de hojarasca',           4, '{"description": "Retirar hojas caídas del área verde. En el registro del cliente incluye el barrido de hojas"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'LIMPIEZA_PLANTAS',       'Limpieza de plantas',             5, '{"description": "Retirar hojas secas, flores marchitas y restos adheridos a la planta"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'AIREACION_SUELO',        'Aireación del suelo',             6, '{"description": "Perforar o descompactar el suelo para que el agua y el aire lleguen a la raíz"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'LIMPIEZA_JARDINERAS',    'Limpieza integral de jardineras', 7, '{"description": "Limpieza completa de una jardinera, incluidos residuos y elementos ajenos"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'FERTILIZACION',          'Fertilización',                   8, '{"description": "Aplicar fertilizante para aportar nutrientes a la planta"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'APLICACION_ENMIENDAS',   'Aplicación de enmiendas',         9, '{"description": "Incorporar materia orgánica o correctores para mejorar la estructura del suelo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'TRASLADO_MACETAS',       'Traslado de macetas',            10, '{"description": "Mover macetas dentro del campus por evento, obra o necesidad del área"}');

-- ── Poda (4) ─────────────────────────────────────────────────────────────
-- La poda de altura (más de 5 m) es tercerizada y requiere prevencionista; estos
-- cuatro tipos describen el trabajo, no quién lo ejecuta.
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PODA'), 'PODA_MANTENIMIENTO', 'Poda de mantenimiento',      1, '{"description": "Poda periódica que conserva la forma y el tamaño del ejemplar"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PODA'), 'PODA_FORMACION',     'Poda de formación',          2, '{"description": "Poda que orienta la estructura del ejemplar joven hacia la forma deseada"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PODA'), 'PODA_SANITARIA',     'Poda sanitaria',             3, '{"description": "Retirar ramas secas, enfermas o dañadas para proteger la salud del ejemplar"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PODA'), 'PODA_DESPEJE',       'Poda de despeje/reducción',  4, '{"description": "Reducir el volumen del ejemplar para liberar luminarias, cámaras, fachadas o vías de paso"}');

-- ── Propagación y plantación (10) ────────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PROPAGACION_DIVISION',  'Propagación por división de matas',  1, '{"description": "Separar una mata en varias plantas independientes con raíz propia"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PROPAGACION_ESQUEJES',  'Propagación por esquejes',           2, '{"description": "Obtener plantas nuevas a partir de fragmentos de tallo enraizados"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'TRASPLANTE',            'Trasplante',                         3, '{"description": "Mover una planta ya establecida a una ubicación definitiva distinta"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'SIEMBRA_PLANTAS',       'Siembra de plantas',                 4, '{"description": "Sembrar directamente en el terreno a partir de semilla o plantín"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PLANTACION_ARBOLES',    'Plantación de árboles',              5, '{"description": "Instalar un árbol en su ubicación definitiva"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PLANTACION_ARBUSTOS',   'Plantación de arbustos',             6, '{"description": "Instalar arbustos en jardinera o macizo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PLANTACION_CUBRESUELOS','Plantación de cubresuelos',          7, '{"description": "Instalar plantas de porte bajo que tapizan el suelo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PLANTACION_MACETAS',    'Plantación en macetas',              8, '{"description": "Plantar directamente en maceta o macetón"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'TRASPLANTE_MACETAS',    'Trasplante a macetas',               9, '{"description": "Pasar a maceta una planta que estaba en el terreno o en vivero"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'CAMBIO_MACETA',         'Cambio de maceta',                  10, '{"description": "Trasladar la planta a una maceta de mayor tamaño o reemplazar la dañada"}');

-- ── Riego (4) ────────────────────────────────────────────────────────────
-- El riego es semi-tecnificado y manual: hoy no hay pop-ups ni electroválvulas.
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RIEGO'), 'RIEGO_MANUAL',        'Riego manual',                     1, '{"description": "Riego con manguera o regadera sobre el área asignada"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RIEGO'), 'RIEGO_NOCTURNO',      'Riego nocturno',                   2, '{"description": "Riego programado fuera del horario de actividad del campus para reducir evaporación"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RIEGO'), 'RIEGO_ESTABLECIMIENTO','Riego de establecimiento',         3, '{"description": "Riego de apoyo a una plantación reciente hasta que arraiga"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RIEGO'), 'VERIFICACION_RIEGO',  'Verificación del sistema de riego', 4, '{"description": "Revisar el estado y funcionamiento de la red de riego"}');

-- ── Manejo de residuos vegetales (4) ─────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RESIDUOS'), 'RECOLECCION_HOJARASCA', 'Recolección de hojarasca',                   1, '{"description": "Juntar y retirar la hojarasca acumulada para su disposición"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RESIDUOS'), 'RECOLECCION_RAMAS',     'Recolección de ramas',                       2, '{"description": "Juntar y retirar las ramas resultantes de podas o caídas"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RESIDUOS'), 'TRITURADO_RESIDUOS',    'Triturado de residuos',                      3, '{"description": "Triturar restos vegetales para reducir volumen u obtener mulch"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RESIDUOS'), 'DISPOSICION_RESIDUOS',  'Disposición o aprovechamiento de residuos',  4, '{"description": "Destino final del residuo vegetal: retiro del campus o reaprovechamiento en el área verde"}');

-- ── FITOSANITARIO e INSPECCION quedan sin tipos ──────────────────────────
-- Pendiente P-10 de SPEC-005, bloqueante: ambas clases están declaradas en la
-- tabla maestra del Excel pero sin ninguna actividad desglosada. Se siembran
-- como clase para que la taxonomía esté completa y el grupo responsable quede
-- registrado. FITOSANITARIO es además una de las cuatro actividades
-- prioritarias: sin sus tipos no se puede registrar con detalle. Una clase sin
-- tipos no bloquea el registro (CA-08).

-- ── Marca de prioridad ───────────────────────────────────────────────────
-- Orden de construcción del equipo, no regla de dominio: una clase sin el flag
-- se selecciona y registra igual que una marcada (CA-14). Se retira sin
-- migración cuando las cuatro prioritarias estén cubiertas. La cuarta, corte de
-- césped, no aparece en esta taxonomía porque es tercerizada.
UPDATE catalog_items
   SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"priority": true}'::jsonb,
       updated_at = CURRENT_TIMESTAMP
 WHERE code IN ('PODA', 'MANTENIMIENTO', 'FITOSANITARIO')
   AND catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS');
