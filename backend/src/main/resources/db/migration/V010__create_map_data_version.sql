-- Propiedad de SPEC-102 §3.1.
--
-- Version de los datos del mapa. El visor la usa para no volver a descargar
-- capas que no cambiaron. Es un contador y no una marca de tiempo: dos
-- escrituras en el mismo milisegundo no deben compartir version.
CREATE TABLE map_data_version (
    id         SMALLINT PRIMARY KEY CHECK (id = 1),
    version    BIGINT    NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO map_data_version (id, version) VALUES (1, 1);

-- Un trigger por sentencia, no por fila: cargar 500 secciones sube la version
-- una vez, no 500. Corre en la misma transaccion que la escritura, asi que una
-- escritura revertida no deja la version adelantada.
CREATE FUNCTION bump_map_data_version() RETURNS trigger AS $$
BEGIN
    UPDATE map_data_version SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_zones_map_version AFTER INSERT OR UPDATE OR DELETE ON zones
    FOR EACH STATEMENT EXECUTE FUNCTION bump_map_data_version();
CREATE TRIGGER trg_supervision_zones_map_version AFTER INSERT OR UPDATE OR DELETE ON supervision_zones
    FOR EACH STATEMENT EXECUTE FUNCTION bump_map_data_version();
CREATE TRIGGER trg_place_references_map_version AFTER INSERT OR UPDATE OR DELETE ON place_references
    FOR EACH STATEMENT EXECUTE FUNCTION bump_map_data_version();
CREATE TRIGGER trg_place_reference_aliases_map_version AFTER INSERT OR UPDATE OR DELETE ON place_reference_aliases
    FOR EACH STATEMENT EXECUTE FUNCTION bump_map_data_version();
CREATE TRIGGER trg_campus_buildings_map_version AFTER INSERT OR UPDATE OR DELETE ON campus_buildings
    FOR EACH STATEMENT EXECUTE FUNCTION bump_map_data_version();
CREATE TRIGGER trg_campus_building_aliases_map_version AFTER INSERT OR UPDATE OR DELETE ON campus_building_aliases
    FOR EACH STATEMENT EXECUTE FUNCTION bump_map_data_version();
CREATE TRIGGER trg_campus_features_map_version AFTER INSERT OR UPDATE OR DELETE ON campus_features
    FOR EACH STATEMENT EXECUTE FUNCTION bump_map_data_version();

-- Los umbrales del algoritmo de cercania (SPEC-102 D-04) NO se siembran aqui:
-- son fijos y viven como constantes del Engine (ProximityThresholds), que la
-- pantalla de parametros muestra como restringidos. Una copia en la tabla se
-- desincronizaria del valor que de verdad se aplica.
