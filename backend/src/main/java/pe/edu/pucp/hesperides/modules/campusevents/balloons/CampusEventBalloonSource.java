package pe.edu.pucp.hesperides.modules.campusevents.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;
import pe.edu.pucp.hesperides.engine.campusevents.EventScope;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonCard;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.CampusNotice;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.CardLine;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonDraft;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonSource;
import pe.edu.pucp.hesperides.modules.balloons.source.CampusNoticeSource;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries.EventRow;
import pe.edu.pucp.hesperides.modules.campusevents.service.CampusEventCalendar;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * El calendario en el mapa (SPEC-114 §5.5, D-06): un bloqueante de sector o sección es el globo
 * morado mientras dura; uno de todo el campus, y cualquier feriado, va a la franja del día.
 */
@Component
@RequiredArgsConstructor
public class CampusEventBalloonSource implements BalloonSource, CampusNoticeSource {

    private static final String BLOCKING = "BLOCKING";

    private final CampusEventCalendar calendar;
    private final CampusEventQueries queries;

    @Override
    public List<BalloonKind> kinds() {
        return List.of(BalloonKind.BLOCKING_EVENT);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BalloonDraft> drafts() {
        LocalDate today = calendar.today();
        LocalTime now = calendar.now();
        List<BalloonDraft> drafts = new ArrayList<>();
        for (CampusEventCalendar.Dated d : calendar.between(today, today)) {
            EventRow e = d.event();
            boolean onAZone = e.scope() != EventScope.CAMPUS && e.zoneActive() && e.zoneId() != null;
            if (BLOCKING.equals(e.typeCode()) && onAZone && lasting(e, now)) {
                queries.point(e.zoneId()).ifPresent(p -> drafts.add(new BalloonDraft(BalloonKind.BLOCKING_EVENT, null,
                        String.valueOf(e.id()), card(e, today), List.of(p))));
            }
        }
        return drafts;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampusNotice> notices() {
        LocalDate today = calendar.today();
        return calendar.between(today, today).stream()
                .filter(d -> d.event().scope() == EventScope.CAMPUS)
                .map(d -> notice(d.event())).toList();
    }

    /** Con horario, el globo está mientras dura; sin horario, todo el día. */
    private static boolean lasting(EventRow e, LocalTime now) {
        return e.rule().allDay() || (!now.isBefore(e.rule().startTime()) && now.isBefore(e.rule().endTime()));
    }

    private static String when(EventRow e) {
        String hours = CampusEventCalendar.hours(e);
        return hours.isEmpty() ? "Todo el día" : Character.toUpperCase(hours.charAt(0)) + hours.substring(1);
    }

    private static BalloonCard card(EventRow e, LocalDate today) {
        return new BalloonCard(e.name(), when(e), List.of(
                new CardLine("Tipo", e.typeLabel()),
                new CardLine("Ámbito", e.zoneName())), null, null, "/calendario?fecha=" + today);
    }

    private static CampusNotice notice(EventRow e) {
        if (!BLOCKING.equals(e.typeCode())) {
            return new CampusNotice(e.typeCode(), "Hoy es feriado: " + e.name());
        }
        String hours = CampusEventCalendar.hours(e);
        return new CampusNotice(e.typeCode(), "Hoy: " + e.name() + " (" + (hours.isEmpty() ? "todo el día" : hours) + ")");
    }
}
