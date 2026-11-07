package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.imports.dto.SpecimenForm;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenDraft;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenWriter;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.MeasurementOutcome;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Lo que se decide sobre las medidas de cada ejemplar al cerrar una poda
 * (SPEC-105 §5.3). Corre dentro de la transacción del cierre: un error lo revierte
 * entero, para que ninguna ubicación quede terminada con medidas a medias.
 */
@Service
@RequiredArgsConstructor
public class PruningMeasurementOutcomeService {

    private static final String PRUNING_CLASS = "PODA";
    private static final String MEASURED = "MEASURED";
    private static final String AVERAGE = "AVERAGE";
    private static final String UNCHANGED = "UNCHANGED";

    private final JdbcTemplate jdbc;
    private final SpecimenWriter writer;

    private record Linked(long id, boolean critical, boolean measured, BigDecimal referenceHeightM,
                          BigDecimal referenceCrownRadiusM) {
    }

    private record Work(String classCode, String code) {
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void apply(long interventionId, long locationId, List<MeasurementOutcome> outcomes, long actorId) {
        if (outcomes == null || outcomes.isEmpty()) {
            return;
        }
        outcomes.forEach(PruningMeasurementOutcomeService::requireWellFormed);
        requireOnePerSpecimen(outcomes);
        Work work = work(interventionId);
        if (!PRUNING_CLASS.equals(work.classCode())) {
            throw new BusinessRuleException("Only a pruning can change specimen measurements");
        }
        Map<String, Linked> linked = linkedSpecimens(locationId);
        for (MeasurementOutcome outcome : outcomes) {
            Linked specimen = linked.get(outcome.specimenCode());
            if (specimen == null) {
                throw new BusinessRuleException("Specimen is not part of this location: " + outcome.specimenCode());
            }
            apply(outcome, specimen, interventionId, work.code(), actorId);
        }
    }

    private static void requireWellFormed(MeasurementOutcome outcome) {
        if (!List.of(MEASURED, AVERAGE, UNCHANGED).contains(outcome.outcome())) {
            throw new ValidationException("Unknown measurement outcome: " + outcome.outcome());
        }
        if (MEASURED.equals(outcome.outcome()) && !hasDimension(outcome.measurement())) {
            throw new ValidationException("Real measurements need a date and at least one measure");
        }
    }

    private static boolean hasDimension(SpecimenForm.MeasurementForm m) {
        return m != null && (m.heightM() != null || m.trunkHeightM() != null || m.dbhCm() != null || m.crownRadiusM() != null
                || !m.toExtraValues().isEmpty());
    }

    private static void requireOnePerSpecimen(List<MeasurementOutcome> outcomes) {
        var seen = new HashSet<String>();
        if (!outcomes.stream().map(MeasurementOutcome::specimenCode).allMatch(seen::add)) {
            throw new ValidationException("A specimen can only have one measurement outcome");
        }
    }

    private void apply(MeasurementOutcome outcome, Linked specimen, long interventionId, String workCode, long actorId) {
        switch (outcome.outcome()) {
            case MEASURED -> writer.recordMeasurement(specimen.id(), toDraft(outcome.measurement()), actorId, interventionId);
            case AVERAGE -> useAverage(specimen, interventionId, workCode, actorId);
            default -> { }
        }
    }

    private static SpecimenDraft.Measurement toDraft(SpecimenForm.MeasurementForm m) {
        return new SpecimenDraft.Measurement(m.date(), m.heightM(), m.trunkHeightM(), m.dbhCm(), m.crownRadiusM(), m.banded(),
                m.toExtraValues());
    }

    private void useAverage(Linked specimen, long interventionId, String workCode, long actorId) {
        if (specimen.critical()) {
            throw new BusinessRuleException("The average never replaces a measurement of a critical species");
        }
        // Un ejemplar nunca medido ya muestra el promedio: no hay nada que registrar.
        if (!specimen.measured()) {
            return;
        }
        jdbc.update("""
                INSERT INTO green_element_measurements (green_element_id, measured_at, measured_by_user_id, height_m,
                       crown_radius_m, notes, origin, intervention_id)
                VALUES (?, ?, ?, ?, ?, ?, 'AVERAGE', ?)""",
                specimen.id(), java.sql.Date.valueOf(LocalDate.now()), actorId, specimen.referenceHeightM(),
                specimen.referenceCrownRadiusM(), "Promedio de la especie aplicado al cerrar " + workCode, interventionId);
        jdbc.update("""
                UPDATE green_elements
                   SET height_m = NULL, trunk_height_m = NULL, dbh_cm = NULL, crown_radius_m = NULL, measured_at = NULL,
                       measured_by_user_id = NULL, data_source = 'UNKNOWN', updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?""", specimen.id());
    }

    private Work work(long interventionId) {
        return jdbc.queryForObject("""
                SELECT c.code AS class_code, i.code FROM interventions i
                  JOIN catalog_items c ON c.id = i.intervention_class_item_id
                 WHERE i.id = ?""",
                (rs, n) -> new Work(rs.getString("class_code"), rs.getString("code")), interventionId);
    }

    private Map<String, Linked> linkedSpecimens(long locationId) {
        record Row(String code, Linked specimen) {
        }
        return jdbc.query("""
                SELECT g.id, g.code, g.data_source, s.is_critical, s.reference_height_m, s.reference_crown_radius_m
                  FROM intervention_elements ie
                  JOIN green_elements g ON g.id = ie.green_element_id
                  JOIN species s ON s.id = g.species_id
                 WHERE ie.intervention_location_id = ? AND ie.deleted_at IS NULL AND g.deleted_at IS NULL""",
                (rs, n) -> new Row(rs.getString("code"), new Linked(rs.getLong("id"), rs.getBoolean("is_critical"),
                        MEASURED.equals(rs.getString("data_source")), rs.getBigDecimal("reference_height_m"),
                        rs.getBigDecimal("reference_crown_radius_m"))), locationId)
                .stream().collect(Collectors.toMap(Row::code, Row::specimen));
    }
}
