package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.incidents.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;

import java.util.List;

/** Traduce una incidencia a los hechos que piden las reglas puras del engine. */
@Component @RequiredArgsConstructor
public class IncidentRules {
    private final IncidentWorkLinks workLinks;

    public List<ActivationGap> activationGaps(Incident i) {
        return IncidentActivation.gaps(new ActivationFacts(i.getIncidentType() != null, i.getUrgency() != null,
                i.hasLocation(), i.isThirdParty(), i.getAgreedDays(), i.getProviderOrganizationId() != null,
                HeightClass.fromCode(i.getHeightClass())));
    }

    public List<ClosureBlocker> closureBlockers(Incident i) {
        return IncidentClosure.blockers(i.isActive(), workLinks.statusCodes(i.getId()));
    }

    public PrefillAdvice advice(Incident i) {
        return i.getPrefillSuggestion() == null ? null : IncidentPrefill.advise(PrefillSuggestions.fromMap(i.getPrefillSuggestion()));
    }
}
