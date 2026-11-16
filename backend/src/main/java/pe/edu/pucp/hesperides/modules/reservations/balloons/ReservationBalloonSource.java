package pe.edu.pucp.hesperides.modules.reservations.balloons;

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
import pe.edu.pucp.hesperides.modules.reservations.balloons.ReservationBalloonQueries.InProgress;

import java.util.List;

/** Reservas en curso (SPEC-113 §5.1): se van solas al pasar su hora de fin. */
@Component
@RequiredArgsConstructor
public class ReservationBalloonSource implements BalloonSource {

    private final ReservationBalloonQueries queries;
    private final BalloonCalendar calendar;

    @Override
    public List<BalloonKind> kinds() {
        return List.of(BalloonKind.RESERVATION);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BalloonDraft> drafts() {
        return queries.inProgress(calendar.now()).stream().map(this::draft).toList();
    }

    private BalloonDraft draft(InProgress r) {
        // Mismo texto que el «uso derivado» de una reserva en curso (SPEC-107 §2.1).
        String usage = r.spaceUsed() ? "En uso" : "No se está usando";
        var card = new BalloonCard(r.placeName(), usage, List.of(
                new CardLine("Pedido de", r.requestedBy()),
                new CardLine("Horario", calendar.hour(r.startsAt()) + "–" + calendar.hour(r.endsAt()))),
                null, null, "/reservas/" + r.code());
        return new BalloonDraft(BalloonKind.RESERVATION, null, r.code(), card,
                List.of(new GeoPoint(r.latitude(), r.longitude())));
    }
}
