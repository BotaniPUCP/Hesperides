package pe.edu.pucp.hesperides.modules.planning.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;
import pe.edu.pucp.hesperides.engine.planning.PlanningState;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonCard;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.CardLine;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonCalendar;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonDraft;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonSource;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenCompletion;
import pe.edu.pucp.hesperides.modules.planning.attendance.SpecimenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.SpecimenCompletion;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse;
import pe.edu.pucp.hesperides.modules.planning.service.PlanningService;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Set;

/**
 * «Sección por regar» (SPEC-113 §5.1, D-09): en un conjunto con una asignación de riego
 * atrasada o por vencer, los jardines y ejemplares que faltan y que ya se regaron alguna
 * vez. Sin ese filtro, el mapa se llenaría de jardines que nunca tuvieron registro. Un
 * riego abierto deja la fila en curso o programada, y entonces no hay globo.
 */
@Component
@RequiredArgsConstructor
public class IrrigationDueBalloonSource implements BalloonSource {

    private final PlanningService planning;
    private final IrrigationDueQueries queries;
    private final GardenAttendanceProvider gardens;
    private final SpecimenAttendanceProvider specimens;
    private final BalloonCalendar calendar;

    @Override
    public List<BalloonKind> kinds() {
        return List.of(BalloonKind.IRRIGATION_DUE);
    }

    /** Lo que falta de una fila y ya se regó alguna vez: dónde va y desde cuándo no se riega. */
    private record Watered(List<GeoPoint> anchors, LocalDate oldestLast) {
    }

    @Override
    @Transactional(readOnly = true)
    public List<BalloonDraft> drafts() {
        Set<Long> irrigation = queries.irrigationTypes();
        LocalDate today = calendar.today();
        List<BalloonDraft> drafts = new ArrayList<>();
        for (PlanningRowResponse row : planning.rows()) {
            boolean pending = row.state() == PlanningState.OVERDUE || row.state() == PlanningState.DUE;
            if (!irrigation.contains(row.activityTypeItemId()) || !pending) {
                continue;
            }
            Watered watered = watered(row);
            if (!watered.anchors().isEmpty()) {
                Integer lateDays = lateDays(row, watered.oldestLast(), today);
                boolean late = lateDays != null ? lateDays > 0 : row.state() == PlanningState.OVERDUE;
                drafts.add(new BalloonDraft(BalloonKind.IRRIGATION_DUE, late ? BalloonKind.OVERDUE : BalloonKind.DUE,
                        row.setId() + "-" + row.assignmentId(), card(row, watered, late, lateDays), watered.anchors()));
            }
        }
        return drafts;
    }

    /**
     * El conjunto se juzga por su jardín más desatendido, que puede ser uno nunca regado;
     * el globo solo cubre los ya regados, así que su atraso se mide sobre ellos: el que
     * lleva más tiempo sin riego contra el máximo de la regla. Sin máximo, manda la fila.
     */
    static Integer lateDays(PlanningRowResponse row, LocalDate oldestLast, LocalDate today) {
        if (row.rhythm() == null || row.rhythm().maxDays() == null || oldestLast == null) {
            return null;
        }
        return (int) ChronoUnit.DAYS.between(oldestLast.plusDays(row.rhythm().maxDays()), today);
    }

    private Watered watered(PlanningRowResponse row) {
        long activity = row.activityTypeItemId();
        Map<Long, LocalDate> gardenLast = new HashMap<>();
        for (GardenCompletion c : gardens.completions(activity, nullSafe(row.pendingZoneIds()))) {
            gardenLast.merge(c.zoneId(), c.date(), (a, b) -> a.isAfter(b) ? a : b);
        }
        Map<Long, LocalDate> specimenLast = new HashMap<>();
        for (SpecimenCompletion c : specimens.specimenCompletions(activity, nullSafe(row.pendingElementIds()))) {
            specimenLast.merge(c.elementId(), c.date(), (a, b) -> a.isAfter(b) ? a : b);
        }
        List<GeoPoint> anchors = new ArrayList<>(queries.gardenPoints(gardenLast.keySet()));
        anchors.addAll(queries.specimenPoints(specimenLast.keySet()));
        LocalDate oldest = java.util.stream.Stream.concat(gardenLast.values().stream(), specimenLast.values().stream())
                .min(LocalDate::compareTo).orElse(null);
        return new Watered(anchors, oldest);
    }

    private BalloonCard card(PlanningRowResponse row, Watered watered, boolean late, Integer lateDays) {
        int pending = nullSafe(row.pendingZoneIds()).size() + nullSafe(row.pendingElementIds()).size();
        int units = row.zoneCount() + row.elementCount();
        List<CardLine> lines = new ArrayList<>(List.of(
                new CardLine("Conjunto", row.setName()),
                new CardLine("Faltan", pending + " de " + units)));
        if (watered.oldestLast() != null) {
            lines.add(new CardLine("Último riego", calendar.day(watered.oldestLast())));
        }
        String href = "/intervenciones/planificacion?conjunto="
                + URLEncoder.encode(row.setName(), StandardCharsets.UTF_8).replace("+", "%20");
        return new BalloonCard(row.activityLabel() + " en " + row.setName(), status(row, late, lateDays),
                lines, null, null, href);
    }

    private static String status(PlanningRowResponse row, boolean late, Integer lateDays) {
        Integer days = lateDays != null ? Integer.valueOf(Math.abs(lateDays)) : row.days();
        if (days == null) {
            return late ? "Atrasado" : "Pendiente";
        }
        if (late) {
            return BalloonCalendar.days(days) + " tarde";
        }
        return days == 0 ? "Vence hoy" : "Vence en " + BalloonCalendar.days(days);
    }

    private static List<Long> nullSafe(List<Long> ids) {
        return ids == null ? List.of() : ids;
    }
}
