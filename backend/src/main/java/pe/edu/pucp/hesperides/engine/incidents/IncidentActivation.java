package pe.edu.pucp.hesperides.engine.incidents;

import java.util.ArrayList;
import java.util.List;

/**
 * Coordinación activa una incidencia solo cuando el mapa puede ubicarla y su plazo puede
 * calcularse (SPEC-201 §3.6).
 */
public final class IncidentActivation {

    public static final int MIN_AGREED_DAYS = 1;
    public static final int MAX_AGREED_DAYS = 90;

    private IncidentActivation() {
    }

    public static List<ActivationGap> gaps(ActivationFacts facts) {
        var result = new ArrayList<ActivationGap>();
        if (!facts.hasType()) result.add(ActivationGap.TYPE);
        if (!facts.hasUrgency()) result.add(ActivationGap.URGENCY);
        if (!facts.hasLocation()) result.add(ActivationGap.LOCATION);
        if (facts.thirdParty()) result.addAll(thirdPartyGaps(facts));
        else if (facts.height() == HeightClass.OVER_5M) result.add(ActivationGap.TALL_TREE_NEEDS_THIRD_PARTY);
        return List.copyOf(result);
    }

    private static List<ActivationGap> thirdPartyGaps(ActivationFacts facts) {
        var result = new ArrayList<ActivationGap>();
        if (!facts.hasProvider()) result.add(ActivationGap.PROVIDER);
        Integer days = facts.agreedDays();
        if (days == null || days < MIN_AGREED_DAYS || days > MAX_AGREED_DAYS) result.add(ActivationGap.AGREED_DAYS);
        return result;
    }
}
