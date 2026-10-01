package pe.edu.pucp.hesperides.modules.map.service;

import pe.edu.pucp.hesperides.modules.map.dto.MapLayersResponse;

/** Capas del mapa y su versión de datos (SPEC-102 §3). */
public interface MapLayersService {

    long currentVersion();

    /** Todas las capas de la versión vigente. */
    MapLayersResponse layers();
}
