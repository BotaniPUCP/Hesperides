package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.interventions.repository.GardenAttendanceSql;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenCompletion;
import pe.edu.pucp.hesperides.modules.planning.attendance.OpenSpecimenWork;
import pe.edu.pucp.hesperides.modules.planning.attendance.OpenWork;
import pe.edu.pucp.hesperides.modules.planning.attendance.SpecimenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.SpecimenCompletion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Las fechas por jardín y por ejemplar que pide la planificación (SPEC-203 D-04):
 * cuenta lo que el capataz marcó completado, sin esperar la aprobación final. No
 * filtra por rol: solo ADMIN y COORDINADOR planifican, y ven todo el campus.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InterventionGardenAttendance implements GardenAttendanceProvider, SpecimenAttendanceProvider {

    /** Una intervención abierta, con lo pedido y lo que le falta, sean secciones o ejemplares. */
    private record Open(long work, String code, LocalDate scheduled, LocalDate firstStarted,
                        Set<Long> targets, Set<Long> pending) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    @Value("${hesperides.maintenance.time-zone:America/Lima}")
    private String timeZone;

    @Override
    public List<GardenCompletion> completions(long activityTypeItemId, Collection<Long> zoneIds) {
        if (zoneIds.isEmpty()) return List.of();
        return jdbc.query(GardenAttendanceSql.COMPLETIONS, params(activityTypeItemId, "zones", zoneIds),
                (rs, n) -> new GardenCompletion(rs.getLong("zone_id"), rs.getLong("work_id"),
                        rs.getObject("day", LocalDate.class)));
    }

    @Override
    public List<OpenWork> openWorks(long activityTypeItemId, Collection<Long> zoneIds) {
        if (zoneIds.isEmpty()) return List.of();
        return open(GardenAttendanceSql.OPEN_LOCATIONS, params(activityTypeItemId, "zones", zoneIds), "zone_id").stream()
                .map(o -> new OpenWork(o.work(), o.code(), o.scheduled(), o.firstStarted(), o.targets(), o.pending()))
                .toList();
    }

    @Override
    public List<SpecimenCompletion> specimenCompletions(long activityTypeItemId, Collection<Long> elementIds) {
        if (elementIds.isEmpty()) return List.of();
        return jdbc.query(GardenAttendanceSql.SPECIMEN_COMPLETIONS, params(activityTypeItemId, "elements", elementIds),
                (rs, n) -> new SpecimenCompletion(rs.getLong("element_id"), rs.getLong("work_id"),
                        rs.getObject("day", LocalDate.class)));
    }

    @Override
    public List<OpenSpecimenWork> openSpecimenWorks(long activityTypeItemId, Collection<Long> elementIds) {
        if (elementIds.isEmpty()) return List.of();
        return open(GardenAttendanceSql.OPEN_SPECIMENS, params(activityTypeItemId, "elements", elementIds), "element_id")
                .stream().map(o -> new OpenSpecimenWork(o.work(), o.code(), o.scheduled(), o.firstStarted(),
                        o.targets(), o.pending())).toList();
    }

    /** Agrupa por intervención las filas de ubicación: qué se pidió, qué falta y cuándo empezó la primera. */
    private List<Open> open(String sql, Map<String, Object> params, String targetColumn) {
        record Row(long work, String code, LocalDate scheduled, long target, boolean pending, LocalDate started) {
        }
        List<Row> rows = jdbc.query(sql, params, (rs, n) -> new Row(rs.getLong("work_id"), rs.getString("code"),
                rs.getObject("scheduled_date", LocalDate.class), rs.getLong(targetColumn), rs.getBoolean("pending"),
                rs.getObject("started", LocalDate.class)));
        Map<Long, List<Row>> byWork = new LinkedHashMap<>();
        rows.forEach(r -> byWork.computeIfAbsent(r.work(), k -> new ArrayList<>()).add(r));
        return byWork.values().stream().map(group -> {
            Set<Long> targets = new HashSet<>();
            Set<Long> pending = new HashSet<>();
            LocalDate first = null;
            for (Row r : group) {
                targets.add(r.target());
                if (r.pending()) pending.add(r.target());
                if (r.started() != null && (first == null || r.started().isBefore(first))) first = r.started();
            }
            Row any = group.get(0);
            return new Open(any.work(), any.code(), any.scheduled(), first, Set.copyOf(targets), Set.copyOf(pending));
        }).toList();
    }

    private Map<String, Object> params(long activity, String name, Collection<Long> ids) {
        return Map.of("activity", activity, name, ids.toArray(Long[]::new), "tz", timeZone);
    }
}
