-- SPEC-002 / SPEC-103: green element codes identify permanent historical records.
-- Abort rather than silently rewriting any duplicate codes already in a database.
DO $$
BEGIN
    IF EXISTS (
        SELECT code FROM green_elements GROUP BY code HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot reserve historical specimen codes: duplicate values already exist';
    END IF;
END $$;

DROP INDEX IF EXISTS idx_green_elements_code_active;
CREATE UNIQUE INDEX idx_green_elements_code_historical ON green_elements(code);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM species WHERE is_active AND deleted_at IS NOT NULL)
       OR EXISTS (SELECT 1 FROM green_elements WHERE is_active AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot enforce lifecycle integrity: a logically deleted species or specimen is active';
    END IF;
END $$;

ALTER TABLE species
    ADD CONSTRAINT chk_species_deleted_inactive CHECK (deleted_at IS NULL OR NOT is_active);
ALTER TABLE green_elements
    ADD CONSTRAINT chk_green_elements_deleted_inactive CHECK (deleted_at IS NULL OR NOT is_active);

-- A physical element delete must never cascade into measurement history.
ALTER TABLE green_element_measurements
    DROP CONSTRAINT green_element_measurements_green_element_id_fkey,
    ADD CONSTRAINT fk_green_element_measurements_element
        FOREIGN KEY (green_element_id) REFERENCES green_elements(id) ON DELETE RESTRICT;

-- Lifecycle deletion is logical only. Guard direct SQL/JPA deletes as well as API paths.
CREATE FUNCTION reject_species_and_specimen_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Physical deletion of species and specimens is prohibited; use definitive logical deactivation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_species_no_physical_delete
    BEFORE DELETE ON species
    FOR EACH ROW EXECUTE FUNCTION reject_species_and_specimen_delete();

CREATE TRIGGER trg_green_elements_no_physical_delete
    BEFORE DELETE ON green_elements
    FOR EACH ROW EXECUTE FUNCTION reject_species_and_specimen_delete();

CREATE FUNCTION require_active_species_and_specimen_creation() RETURNS trigger AS $$
BEGIN
    IF NEW.is_active IS DISTINCT FROM TRUE OR NEW.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'New species and specimens must be created active and not logically deleted';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_species_create_active
    BEFORE INSERT ON species
    FOR EACH ROW EXECUTE FUNCTION require_active_species_and_specimen_creation();

CREATE TRIGGER trg_green_elements_create_active
    BEFORE INSERT ON green_elements
    FOR EACH ROW EXECUTE FUNCTION require_active_species_and_specimen_creation();

-- Once inactive or logically deleted, a row can never be reactivated/restored.
CREATE FUNCTION reject_species_and_specimen_reactivation() RETURNS trigger AS $$
BEGIN
    IF (OLD.is_active = FALSE AND NEW.is_active = TRUE)
       OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Species and specimens cannot be reactivated or restored';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_species_no_reactivation
    BEFORE UPDATE OF is_active, deleted_at ON species
    FOR EACH ROW EXECUTE FUNCTION reject_species_and_specimen_reactivation();

CREATE TRIGGER trg_green_elements_no_reactivation
    BEFORE UPDATE OF is_active, deleted_at ON green_elements
    FOR EACH ROW EXECUTE FUNCTION reject_species_and_specimen_reactivation();

CREATE FUNCTION reject_specimen_code_change() RETURNS trigger AS $$
BEGIN
    IF NEW.code IS DISTINCT FROM OLD.code THEN
        RAISE EXCEPTION 'A specimen code is a permanent historical identity and cannot be changed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_green_elements_code_immutable
    BEFORE UPDATE OF code ON green_elements
    FOR EACH ROW EXECUTE FUNCTION reject_specimen_code_change();
