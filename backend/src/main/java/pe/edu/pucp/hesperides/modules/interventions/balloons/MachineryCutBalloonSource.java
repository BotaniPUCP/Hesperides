package pe.edu.pucp.hesperides.modules.interventions.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonCard;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.CardLine;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonCalendar;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonDraft;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonSource;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * «Corte con maquinaria pendiente» (SPEC-115 §5.4): intervenciones con maquinaria de corte,
 * programadas desde hoy hasta dentro de una semana y con alguna ubicación sin completar.
 */
@Component
@RequiredArgsConstructor
public class MachineryCutBalloonSource implements BalloonSource {

    /** Una semana: alcanza el próximo sábado, domingo o feriado. */
    static final int MACHINERY_LOOKAHEAD_DAYS = 7;
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.forLanguageTag("es-PE"));

    private record Row(long id, String activity, String assignee, LocalDate scheduled, double lat, double lon) {
    }

    private final NamedParameterJdbcTemplate jdbc;
    private final BalloonCalendar calendar;

    @Override
    public List<BalloonKind> kinds() {
        return List.of(BalloonKind.MACHINERY_CUT);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BalloonDraft> drafts() {
        LocalDate today = calendar.today();
        Map<Long, List<Row>> byWork = new LinkedHashMap<>();
        for (Row r : pending(today, today.plusDays(MACHINERY_LOOKAHEAD_DAYS))) {
            byWork.computeIfAbsent(r.id(), id -> new ArrayList<>()).add(r);
        }
        return byWork.values().stream().map(MachineryCutBalloonSource::draft).toList();
    }

    private static BalloonDraft draft(List<Row> rows) {
        Row first = rows.getFirst();
        String day = first.scheduled().format(DAY).replace(".", "");
        var card = new BalloonCard(first.activity(), "Con maquinaria de corte", List.of(
                new CardLine("Programada el", day),
                new CardLine("Capataz", first.assignee() == null ? "Sin asignar" : first.assignee())),
                null, null, "/intervenciones/" + first.id());
        return new BalloonDraft(BalloonKind.MACHINERY_CUT, null, String.valueOf(first.id()), card,
                rows.stream().map(r -> new GeoPoint(r.lat(), r.lon())).toList());
    }

    private List<Row> pending(LocalDate from, LocalDate to) {
        return jdbc.query("""
                SELECT i.id, COALESCE(typ.label, cls.label) AS activity,
                       NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS assignee, i.scheduled_date,
                       ST_Y(a.pt) AS lat, ST_X(a.pt) AS lon
                  FROM interventions i
                  JOIN catalog_items plan ON plan.id = i.planning_status_item_id AND plan.code <> 'CANCELLED'
                  JOIN catalog_items cls ON cls.id = i.intervention_class_item_id
                  LEFT JOIN catalog_items typ ON typ.id = i.intervention_type_item_id
                  LEFT JOIN users u ON u.id = i.assigned_to_user_id
                  JOIN intervention_locations l ON l.intervention_id = i.id AND l.deleted_at IS NULL
                  JOIN catalog_items ls ON ls.id = l.status_item_id
                       AND ls.code NOT IN ('COMPLETED', 'VALIDATED', 'CANCELLED')
                  LEFT JOIN zones z ON z.id = l.zone_id AND z.deleted_at IS NULL
                  LEFT JOIN places p ON p.id = l.place_id AND p.deleted_at IS NULL
                  LEFT JOIN zones pz ON pz.id = p.zone_id AND pz.deleted_at IS NULL
                 CROSS JOIN LATERAL (SELECT COALESCE(l.location, ST_PointOnSurface(z.boundary),
                                                     ST_PointOnSurface(pz.boundary)) AS pt) a
                 WHERE i.deleted_at IS NULL AND i.uses_cutting_machinery AND a.pt IS NOT NULL
                   AND i.scheduled_date BETWEEN :from AND :to
                 ORDER BY i.scheduled_date, i.id, l.id""",
                new MapSqlParameterSource().addValue("from", from).addValue("to", to), (rs, n) -> new Row(
                rs.getLong("id"), rs.getString("activity"), rs.getString("assignee"),
                rs.getObject("scheduled_date", LocalDate.class), rs.getDouble("lat"), rs.getDouble("lon")));
    }
}
