package pe.edu.pucp.hesperides.modules.imports.specimens;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenDraft.Assessment;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenDraft.Measurement;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.Action;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;

import java.sql.Date;

/**
 * Escribe un ejemplar planificado: lo crea o lo corrige, guarda su medida y su
 * evaluación. Quien llama abre la transacción, para que una carga entre entera
 * o no entre (SPEC-103 §3.1).
 */
@Component
@RequiredArgsConstructor
public class SpecimenWriter {

    private static final String ELEMENT_TYPE = "(SELECT ci.id FROM catalog_items ci JOIN catalog_types ct "
            + "ON ct.id = ci.catalog_type_id WHERE ct.code = 'GREEN_ELEMENT_TYPE' AND ci.code = ?)";

    private final JdbcTemplate jdbc;

    /** @return id y código del ejemplar escrito */
    public Written write(PlannedRow row, Long batchId, long userId, Long measuredBy) {
        SpecimenDraft d = row.draft();
        Written w = row.action() == Action.CREATE ? create(row, batchId, userId) : update(row);
        if (d.measurement() != null) {
            measure(w.id(), d.measurement(), measuredBy);
        }
        if (d.assessment() != null) {
            assess(w.id(), d.assessment(), measuredBy, batchId);
        }
        return w;
    }

    public record Written(long id, String code) {
    }

    private Written create(PlannedRow row, Long batchId, long userId) {
        SpecimenDraft d = row.draft();
        return jdbc.queryForObject("""
                INSERT INTO green_elements (element_type_item_id, species_id, location, quantity, source_reference,
                    source_location, legacy_code, photo_url, notes, registered_by_user_id, import_batch_id)
                VALUES (""" + ELEMENT_TYPE + """
                , ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id, code""",
                (rs, i) -> new Written(rs.getLong(1), rs.getString(2)),
                type(d), row.speciesId(), d.lon(), d.lat(), d.quantity(), d.sourceReference(), d.sourceLocation(),
                d.legacyCode(), remoteLink(d.photo()), d.notes(), userId, batchId);
    }

    /** Una celda vacía no borra: deja el dato como estaba (estándar §6.2). */
    private Written update(PlannedRow row) {
        SpecimenDraft d = row.draft();
        return jdbc.queryForObject("""
                UPDATE green_elements SET species_id = ?, location = ST_SetSRID(ST_MakePoint(?, ?), 4326), quantity = ?,
                       element_type_item_id = """ + ELEMENT_TYPE + """
                       , source_reference = COALESCE(?, source_reference),
                       source_location = COALESCE(?, source_location), legacy_code = COALESCE(?, legacy_code),
                       photo_url = COALESCE(?, photo_url), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
                 WHERE code = ? AND deleted_at IS NULL
                RETURNING id, code""",
                (rs, i) -> new Written(rs.getLong(1), rs.getString(2)),
                row.speciesId(), d.lon(), d.lat(), d.quantity(), type(d), d.sourceReference(), d.sourceLocation(),
                d.legacyCode(), remoteLink(d.photo()), d.notes(), d.code());
    }

    /** La medición más reciente es la vigente: una fecha anterior no pisa a una posterior. */
    private void measure(long id, Measurement m, Long measuredBy) {
        jdbc.update("""
                UPDATE green_elements SET height_m = ?, trunk_height_m = ?, dbh_cm = ?, crown_radius_m = ?,
                       is_banded = COALESCE(?, is_banded), data_source = 'MEASURED', measured_at = ?,
                       measured_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND (measured_at IS NULL OR measured_at <= ?)""",
                m.heightM(), m.trunkHeightM(), m.dbhCm(), m.crownRadiusM(), m.banded(), Date.valueOf(m.date()),
                measuredBy, id, Date.valueOf(m.date()));
    }

    /** Añade una evaluación al historial (SPEC-103 D-06): nunca reemplaza las anteriores. */
    public void assess(long id, Assessment a, Long assessedBy, Long batchId) {
        jdbc.update("""
                INSERT INTO green_element_assessments (green_element_id, assessed_on, assessed_by_user_id, has_disease,
                    has_pests, has_mechanical_damage, is_leaning, has_dead_branches, has_cavities_or_rot,
                    has_exposed_roots, interferes_with_infrastructure, recommended_management, observation, import_batch_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                id, Date.valueOf(a.date()), assessedBy, a.hasDisease(), a.hasPests(), a.hasMechanicalDamage(),
                a.isLeaning(), a.hasDeadBranches(), a.hasCavitiesOrRot(), a.hasExposedRoots(),
                a.interferesWithInfrastructure(), a.recommendedManagement(), a.observation(), batchId);
    }

    private static String type(SpecimenDraft d) {
        return d.quantity() > 1 ? "GROUP" : "INDIVIDUAL";
    }

    /** Solo un enlace es dato de origen; un nombre de archivo del ZIP no. */
    private static String remoteLink(String photo) {
        return photo != null && photo.startsWith("http") ? photo : null;
    }
}
