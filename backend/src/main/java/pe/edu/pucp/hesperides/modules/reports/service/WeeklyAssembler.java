package pe.edu.pucp.hesperides.modules.reports.service;

import pe.edu.pucp.hesperides.modules.reports.dto.TopList;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse.CodeLabel;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse.IncidentRow;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse.NotIrrigated;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse.PlaceRef;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse.TypeRow;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse.WorkRow;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.SectionRef;
import pe.edu.pucp.hesperides.modules.reports.repository.WeeklyIncidentQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.WeeklyWorkQueries.WorkLocationRow;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Turns the weekly rows into the response lists (SPEC-202 §3.3, D-11). Pure: no
 * queries, so the caps, the order and the truncation are tested on their own.
 */
final class WeeklyAssembler {

    static final int WORKS_CAP = 50;
    static final int INCIDENTS_CAP = 50;
    static final int NOT_IRRIGATED_CAP = 10;
    static final int DESCRIPTION_MAX = 140;

    private WeeklyAssembler() {
    }

    /** One row per work, newest first, with only the sector's places, each listed once. */
    static List<WorkRow> works(List<WorkLocationRow> rows) {
        Map<Long, WorkRow> works = new LinkedHashMap<>();
        for (WorkLocationRow r : rows) {
            WorkRow work = works.computeIfAbsent(r.workId(), id -> new WorkRow(id, r.code(), r.classLabel(),
                    r.typeLabel(), r.workDate(), r.approvedOn(), new ArrayList<>()));
            PlaceRef place = place(r);
            if (place != null && !work.places().contains(place)) {
                work.places().add(place);
            }
        }
        return List.copyOf(works.values());
    }

    static TopList<WorkRow> items(List<WorkRow> works) {
        return TopList.of(works, WORKS_CAP);
    }

    /** Approved works per type, most first; the places of each type, without repeats. */
    static List<TypeRow> byType(List<WorkRow> works, List<WorkLocationRow> rows) {
        Map<Long, Long> typeOfWork = new HashMap<>();
        rows.forEach(r -> typeOfWork.putIfAbsent(r.workId(), r.typeItemId()));
        Map<Long, TypeRow> types = new LinkedHashMap<>();
        Map<Long, Long> counts = new HashMap<>();
        for (WorkRow w : works) {
            Long type = typeOfWork.get(w.id());
            Long key = type == null ? -w.id() : type;
            TypeRow row = types.computeIfAbsent(key, k -> new TypeRow(w.classLabel(), type,
                    w.typeLabel() == null ? w.classLabel() : w.typeLabel(), 0, new ArrayList<>()));
            counts.merge(key, 1L, Long::sum);
            w.places().stream().map(PlaceRef::label)
                    .filter(label -> !row.places().contains(label)).forEach(row.places()::add);
        }
        return types.entrySet().stream()
                .map(e -> new TypeRow(e.getValue().classLabel(), e.getValue().typeItemId(), e.getValue().typeLabel(),
                        counts.get(e.getKey()), List.copyOf(e.getValue().places())))
                .sorted(Comparator.comparingLong(TypeRow::approved).reversed()
                        .thenComparing(TypeRow::typeLabel, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    /** Never irrigated first, then the longest without water, then by code (§3.6). */
    static TopList<NotIrrigated> notIrrigated(List<SectionRef> sections, Set<Long> irrigated,
                                              Map<Long, LocalDate> lastIrrigated) {
        List<NotIrrigated> rows = sections.stream()
                .filter(s -> !irrigated.contains(s.sectionId()))
                .map(s -> new NotIrrigated(s.sectionId(), s.code(), s.name(), lastIrrigated.get(s.sectionId())))
                .sorted(Comparator.comparing(NotIrrigated::lastIrrigatedOn,
                                Comparator.nullsFirst(Comparator.<LocalDate>naturalOrder()))
                        .thenComparing(NotIrrigated::code))
                .toList();
        return TopList.of(rows, NOT_IRRIGATED_CAP);
    }

    static IncidentRow incident(WeeklyIncidentQueries.IncidentRow r, LocalDate cutoff) {
        CodeLabel urgency = r.urgencyCode() == null ? null : new CodeLabel(r.urgencyCode(), r.urgencyLabel());
        return new IncidentRow(r.id(), truncate(r.description()), r.locationReference(), urgency,
                new CodeLabel(r.statusCode(), r.statusLabel()), r.teamName(), r.reportedOn(),
                ChronoUnit.DAYS.between(r.reportedOn(), cutoff), r.locatedBy());
    }

    /** At most 140 characters, the last one an ellipsis; the full text belongs to SPEC-201. */
    static String truncate(String text) {
        if (text == null || text.length() <= DESCRIPTION_MAX) {
            return text;
        }
        return text.substring(0, DESCRIPTION_MAX - 1).stripTrailing() + "…";
    }

    private static PlaceRef place(WorkLocationRow r) {
        if (r.placeId() != null) {
            return new PlaceRef("PLACE", r.placeId(), r.placeName());
        }
        return r.zoneId() == null ? null : new PlaceRef("ZONE", r.zoneId(), r.zoneName());
    }
}
