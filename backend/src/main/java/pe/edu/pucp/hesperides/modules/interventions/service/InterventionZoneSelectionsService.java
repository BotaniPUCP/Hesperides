package pe.edu.pucp.hesperides.modules.interventions.service;

import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionZoneSelections.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Location;
import java.util.*;

public interface InterventionZoneSelectionsService {
    record Resolved(Zone zone, long unitId) { }
    Options options(long placeId, boolean includeCandidates);
    Options review(long placeId, Review request, long actorId);
    Map<UUID,Resolved> resolve(List<Location> locations);
    PreviewResponse preview(Preview request);
    java.math.BigDecimal plannedSurface(long interventionId);
}
