-- SPEC-106 §4.3 (enmienda 11 nov 2026, desde SPEC-107 D-08b): rol del contacto
-- en cada organización. Texto libre («Delegado», «Secretaria académica»), nulo sin rol.
-- Un vínculo por par contacto-organización, con un solo rol; para cambiarlo se edita.

ALTER TABLE contact_organizations ADD COLUMN role VARCHAR(100);
