package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.interventions.repository.GardenAttendanceSql;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenCompletion;
import pe.edu.pucp.hesperides.modules.planning.attendance.OpenWork;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Las fechas por jardín que pide la planificación (SPEC-203 D-04): cuenta lo que
 * el capataz marcó completado, sin esperar la aprobación final. No filtra por rol:
 * solo ADMIN y COORDINADOR planifican, y ven todo el campus.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InterventionGardenAttendance implements GardenAttendanceProvider {

    private final NamedParameterJdbcTemplate jdbc;

    @Value("${hesperides.maintenance.time-zone:America/Lima}")
    private String timeZone;

    @Override
    public List<GardenCompletion> completions(long activityTypeItemId, Collection<Long> zoneIds) {
        if (zoneIds.isEmpty()) return List.of();
        return jdbc.query(GardenAttendanceSql.COMPLETIONS, params(activityTypeItemId, zoneIds),
                (rs, n) -> new GardenCompletion(rs.getLong("zone_id"), rs.getLong("work_id"),
                        rs.getObject("day", LocalDate.class)));
    }

    @Override
    public List<OpenWork> openWorks(long activityTypeItemId, Collection<Long> zoneIds) {
        if (zoneIds.isEmpty()) return List.of();
        record Row(long work, String code, LocalDate scheduled, long zone, LocalDate started) {
        }
        List<Row> rows = jdbc.query(GardenAttendanceSql.OPEN_LOCATIONS, params(activityTypeItemId, zoneIds),
                (rs, n) -> new Row(rs.getLong("work_id"), rs.getString("code"), rs.getObject("scheduled_date", LocalDate.class),
                        rs.getLong("zone_id"), rs.getObject("started", LocalDate.class)));
        Map<Long, List<Row>> byWork = new LinkedHashMap<>();
        rows.forEach(r -> byWork.computeIfAbsent(r.work(), k -> new ArrayList<>()).add(r));
        return byWork.values().stream().map(group -> {
            Set<Long> zones = new HashSet<>();
            LocalDate first = null;
            for (Row r : group) {
                zones.add(r.zone());
                if (r.started() != null && (first == null || r.started().isBefore(first))) first = r.started();
            }
            Row any = group.get(0);
            return new OpenWork(any.work(), any.code(), any.scheduled(), first, Set.copyOf(zones));
        }).toList();
    }

    private Map<String, Object> params(long activity, Collection<Long> zoneIds) {
        return Map.of("activity", activity, "zones", zoneIds.toArray(Long[]::new), "tz", timeZone);
    }
}
