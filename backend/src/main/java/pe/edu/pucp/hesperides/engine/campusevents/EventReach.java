package pe.edu.pucp.hesperides.engine.campusevents;

import java.util.Objects;

/** Si un evento toca un jardín (SPEC-114 §2.1): todo el campus, su sector o su sección. */
public final class EventReach {

    private EventReach() {
    }

    /** {@code eventZone} es el sector o la sección del evento, ya normalizada a sección si era subsección. */
    public static boolean touches(EventScope scope, Long eventZone, Garden garden) {
        return switch (scope) {
            case CAMPUS -> true;
            case SECTOR -> Objects.equals(eventZone, garden.sectorId());
            case SECTION -> Objects.equals(eventZone, garden.sectionId());
        };
    }
}
