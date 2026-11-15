package pe.edu.pucp.hesperides.modules.balloons.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;
import pe.edu.pucp.hesperides.engine.balloons.MiniGroups;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonResponse;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonsResponse;
import pe.edu.pucp.hesperides.modules.balloons.repository.SectorLocator;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonDraft;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonSource;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Junta los globos de todas las fuentes, los parte en minigrupos, les pone su sector y
 * los ordena por urgencia (SPEC-113 §3, §5.3 y §5.5). Una fuente que falla no tumba la
 * respuesta: se avisa en {@code unavailableKinds}.
 */
@Slf4j
@Service
public class BalloonsService {

    /** Tope de la respuesta: se esperan decenas; pasarlo indica un problema en una fuente. */
    public static final int MAX_BALLOONS = 500;

    private record Pinned(BalloonDraft draft, String id, GeoPoint pin, int members) {
    }

    private final List<BalloonSource> sources;
    private final SectorLocator sectors;
    private final Clock clock;
    private final int maxBalloons;

    @Autowired
    public BalloonsService(List<BalloonSource> sources, SectorLocator sectors, Clock clock) {
        this(sources, sectors, clock, MAX_BALLOONS);
    }

    public BalloonsService(List<BalloonSource> sources, SectorLocator sectors, Clock clock, int maxBalloons) {
        this.sources = List.copyOf(sources);
        this.sectors = sectors;
        this.clock = clock;
        this.maxBalloons = maxBalloons;
    }

    public BalloonsResponse balloons() {
        List<BalloonKind> unavailable = new ArrayList<>();
        List<Pinned> pinned = new ArrayList<>();
        for (BalloonSource source : sources) {
            try {
                source.drafts().forEach(draft -> pinned.addAll(pin(draft)));
            } catch (RuntimeException e) {
                log.warn("Fuente de globos no disponible kinds={}", source.kinds(), e);
                unavailable.addAll(source.kinds());
            }
        }
        pinned.sort(Comparator.comparingInt((Pinned p) -> p.draft().kind().rank(p.draft().variant()))
                .thenComparing(Pinned::id));
        boolean truncated = pinned.size() > maxBalloons;
        List<Pinned> kept = truncated ? pinned.subList(0, maxBalloons) : pinned;
        List<Long> sectorIds = sectors.sectorsOf(kept.stream().map(Pinned::pin).toList());
        List<BalloonResponse> balloons = new ArrayList<>();
        for (int i = 0; i < kept.size(); i++) {
            balloons.add(response(kept.get(i), sectorIds.get(i)));
        }
        return new BalloonsResponse(clock.instant(), balloons, unavailable, truncated);
    }

    private static List<Pinned> pin(BalloonDraft draft) {
        List<List<GeoPoint>> groups = MiniGroups.split(draft.anchors(), MiniGroups.LINK_METERS);
        String base = draft.kind() + ":" + draft.sourceId();
        List<Pinned> pinned = new ArrayList<>();
        for (int i = 0; i < groups.size(); i++) {
            String id = groups.size() == 1 ? base : base + "#" + (i + 1);
            pinned.add(new Pinned(draft, id, MiniGroups.pin(groups.get(i)), groups.get(i).size()));
        }
        return pinned;
    }

    private static BalloonResponse response(Pinned p, Long sectorId) {
        BalloonDraft d = p.draft();
        return new BalloonResponse(p.id(), d.kind(), d.variant(), d.kind().attention(),
                p.pin().lat(), p.pin().lon(), sectorId, p.members(), d.card());
    }
}
