package pe.edu.pucp.hesperides.modules.map.service;

import pe.edu.pucp.hesperides.modules.map.dto.LocationDescriptionResponse;

/** Describe dónde está un punto del campus (SPEC-102 D-04). */
public interface LocationDescriptionService {

    LocationDescriptionResponse describe(double lat, double lon);
}
