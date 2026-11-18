package pe.edu.pucp.hesperides.modules.interventions.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonCard;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.CardLine;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.CardProgress;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonCalendar;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonDraft;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonSource;
import pe.edu.pucp.hesperides.modules.interventions.balloons.InterventionBalloonQueries.ActiveLocation;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Intervenciones en ejecución (verde) y riego en curso o de hoy (azul), SPEC-113 §5.1 y
 * D-08. Un globo por intervención; el servicio lo parte si sus ubicaciones están lejos.
 */
@Component
@RequiredArgsConstructor
public class InterventionBalloonSource implements BalloonSource {

    /** Ventana de riego de REQ 7.4: antes de que el campus se llene y el sol evapore. */
    static final LocalTime WINDOW_START = LocalTime.of(6, 30);
    static final LocalTime WINDOW_END = LocalTime.of(11, 30);

    private final InterventionBalloonQueries queries;
    private final BalloonCalendar calendar;

    @Override
    public List<BalloonKind> kinds() {
        return List.of(BalloonKind.INTERVENTION, BalloonKind.IRRIGATION);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BalloonDraft> drafts() {
        Map<Long, List<ActiveLocation>> byWork = new LinkedHashMap<>();
        for (ActiveLocation l : queries.active(calendar.today(), calendar.zone())) {
            byWork.computeIfAbsent(l.interventionId(), id -> new ArrayList<>()).add(l);
        }
        return byWork.values().stream().map(this::draft).toList();
    }

    private BalloonDraft draft(List<ActiveLocation> locations) {
        ActiveLocation first = locations.getFirst();
        boolean irrigation = InterventionBalloonQueries.IRRIGATION_CLASS.equals(first.classCode());
        List<GeoPoint> anchors = locations.stream().map(l -> new GeoPoint(l.latitude(), l.longitude())).toList();
        BalloonCard card = irrigation ? irrigationCard(locations) : workCard(first);
        return new BalloonDraft(irrigation ? BalloonKind.IRRIGATION : BalloonKind.INTERVENTION, null,
                String.valueOf(first.interventionId()), card, anchors);
    }

    private static BalloonCard workCard(ActiveLocation first) {
        CardProgress progress = first.total() > 1 ? new CardProgress(first.done(), first.total()) : null;
        return new BalloonCard(first.activityLabel(), "En ejecución",
                List.of(new CardLine("Capataz", assignee(first))), progress, null, href(first));
    }

    private BalloonCard irrigationCard(List<ActiveLocation> locations) {
        ActiveLocation first = locations.getFirst();
        LocalTime started = locations.stream().map(ActiveLocation::startedAt).filter(Objects::nonNull)
                .min(LocalTime::compareTo).orElse(null);
        List<CardLine> lines = new ArrayList<>(List.of(new CardLine("Capataz", assignee(first))));
        if (started != null) {
            lines.add(new CardLine("Inicio", calendar.hour(started)));
            lines.add(new CardLine("Ventana", inWindow(started)
                    ? "Dentro de la ventana 6:30–11:30" : "Fuera de la ventana 6:30–11:30"));
        }
        CardProgress progress = first.total() > 1 ? new CardProgress(first.done(), first.total()) : null;
        return new BalloonCard(first.activityLabel(), started == null ? "Programado para hoy" : "En curso",
                lines, progress, null, href(first));
    }

    static boolean inWindow(LocalTime time) {
        return !time.isBefore(WINDOW_START) && !time.isAfter(WINDOW_END);
    }

    private static String assignee(ActiveLocation l) {
        return l.assignee() == null ? "Sin asignar" : l.assignee();
    }

    private static String href(ActiveLocation l) {
        return "/intervenciones/" + l.interventionId();
    }
}
