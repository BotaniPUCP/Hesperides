package pe.edu.pucp.hesperides.modules.reports.dto;

import java.time.LocalDate;

/**
 * One work behind a report figure (SPEC-202 §3.7). The UI links it to
 * {@code /intervenciones/{id}}, whose own access rules still apply.
 * {@code lastExecutionDate} is null for a work not executed yet.
 */
public record ReportInterventionRow(Long id, String code, String classLabel, String typeLabel, String teamName,
                                    LocalDate lastExecutionDate, long pendingPhotos) {
}
