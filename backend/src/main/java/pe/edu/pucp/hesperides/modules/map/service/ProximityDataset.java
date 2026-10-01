package pe.edu.pucp.hesperides.modules.map.service;

import pe.edu.pucp.hesperides.engine.proximity.BuildingCandidate;
import pe.edu.pucp.hesperides.engine.proximity.LocalPlane;
import pe.edu.pucp.hesperides.engine.proximity.NamedPoint;
import pe.edu.pucp.hesperides.engine.proximity.NamingPlaces;
import pe.edu.pucp.hesperides.engine.proximity.SectionCandidate;
import pe.edu.pucp.hesperides.modules.map.dto.MapOrigin;
import pe.edu.pucp.hesperides.modules.map.repository.ProximityDataRepository;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

/**
 * Secciones, edificios y referencias ya proyectados al plano local, para una
 * versión concreta de los datos del mapa. Se arma una vez por versión: proyectar
 * 531 secciones en cada petición sería trabajo repetido.
 */
record ProximityDataset(long version, LocalPlane plane, List<SectionCandidate> sections,
                        List<BuildingCandidate> buildings, List<NamedPoint> places) {

    static ProximityDataset load(long version, MapOrigin origin, ProximityDataRepository repository,
                                 ObjectMapper objectMapper) {
        LocalPlane plane = new LocalPlane(origin.lat(), origin.lon());
        GeoJsonPlanarReader reader = new GeoJsonPlanarReader(objectMapper, plane);
        List<SectionCandidate> sections = repository.sections().stream()
                .map(s -> new SectionCandidate(s.id(), s.code(), s.name(), reader.read(s.geoJson())))
                .toList();
        List<BuildingCandidate> buildings = repository.campusBuildings().stream()
                .map(b -> new BuildingCandidate(b.id(), b.name(), reader.read(b.geoJson())))
                .toList();
        List<NamedPoint> places = repository.places().stream()
                .filter(p -> NamingPlaces.canNameBuilding(p.name(), p.category()))
                .map(p -> new NamedPoint(NamingPlaces.clean(p.name()), plane.toPlane(p.lat(), p.lon())))
                .toList();
        return new ProximityDataset(version, plane, sections, buildings, places);
    }
}
