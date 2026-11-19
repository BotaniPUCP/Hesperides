package pe.edu.pucp.hesperides.modules.incidents.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonCard;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.CardLine;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonCalendar;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonDraft;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonSource;
import pe.edu.pucp.hesperides.modules.incidents.balloons.IncidentBalloonQueries.OpenIncident;

import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

/** Incidencias abiertas (SPEC-113 §5.1): la variante es la urgencia, o NONE si se aprobó sin ella. */
@Component
@RequiredArgsConstructor
public class IncidentBalloonSource implements BalloonSource {

    /** Más que esto no cabe en la ficha corta; el texto completo está en el detalle. */
    private static final int TITLE_MAX = 80;
    private static final Set<String> URGENCIES = Set.of(BalloonKind.HIGH, BalloonKind.MEDIUM, BalloonKind.LOW);

    private final IncidentBalloonQueries queries;
    private final BalloonCalendar calendar;

    @Override
    public List<BalloonKind> kinds() {
        return List.of(BalloonKind.INCIDENT);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BalloonDraft> drafts() {
        return queries.openOnTheMap(calendar.zone()).stream().map(this::draft).toList();
    }

    private BalloonDraft draft(OpenIncident i) {
        boolean urgent = i.urgencyCode() != null && URGENCIES.contains(i.urgencyCode());
        long open = ChronoUnit.DAYS.between(i.reportedOn(), calendar.today());
        var card = new BalloonCard(title(i.description()), i.statusLabel(), List.of(
                new CardLine("Urgencia", urgent ? i.urgencyLabel() : "Sin urgencia"),
                new CardLine("Abierta", BalloonCalendar.ago(open))),
                null, null, "/incidencias/" + i.id());
        return new BalloonDraft(BalloonKind.INCIDENT, urgent ? i.urgencyCode() : BalloonKind.NONE,
                String.valueOf(i.id()), card, List.of(new GeoPoint(i.latitude(), i.longitude())));
    }

    private static String title(String description) {
        String text = description.strip();
        return text.length() <= TITLE_MAX ? text : text.substring(0, TITLE_MAX - 1).strip() + "…";
    }
}
