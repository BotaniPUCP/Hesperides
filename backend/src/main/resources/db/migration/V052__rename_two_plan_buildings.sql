-- Propiedad de SPEC-108 D-03 (los nombres son los de Jean Piero). Corrección del 14 nov 2026, al confirmar el
-- Anexo A de SPEC-109 para SPEC-112: el complejo del código 61 es la Biblioteca de Ciencias Sociales, no la
-- facultad, y el edificio del código 32 es el Departamento Académico de Humanidades (oficinas); la Facultad de
-- Letras y Ciencias Humanas es el Pabellón H. Solo cambia el nombre: las etiquetas oficiales del plano
-- (campus_building_codes) no se tocan. El trigger de campus_buildings sube map_data_version.
UPDATE campus_buildings SET name = 'Biblioteca de Ciencias Sociales', updated_at = CURRENT_TIMESTAMP
 WHERE plan_key = '8f79b2cc-6701-4f4e-87f7-13db06a89a48' AND deleted_at IS NULL;

UPDATE campus_buildings SET name = 'Departamento Académico de Humanidades (oficinas)', updated_at = CURRENT_TIMESTAMP
 WHERE plan_key = 'c657216b-dded-46da-91bd-57fd0fc3b60e' AND deleted_at IS NULL;
