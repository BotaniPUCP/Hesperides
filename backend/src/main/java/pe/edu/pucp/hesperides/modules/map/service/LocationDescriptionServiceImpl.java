package pe.edu.pucp.hesperides.modules.map.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.proximity.LocationDescription;
import pe.edu.pucp.hesperides.engine.proximity.ProximityLocator;
import pe.edu.pucp.hesperides.engine.proximity.ProximityThresholds;
import pe.edu.pucp.hesperides.modules.map.dto.LocationDescriptionResponse;
import pe.edu.pucp.hesperides.modules.map.repository.MapLayersRepository;
import pe.edu.pucp.hesperides.modules.map.repository.ProximityDataRepository;
import tools.jackson.databind.ObjectMapper;

import java.util.concurrent.atomic.AtomicReference;

/**
 * Orquesta la descripción: carga los datos (una vez por versión del mapa), los
 * pasa al plano local y delega en el Engine. El texto oficial siempre lo calcula
 * el servidor, para que web y móvil describan igual (SPEC-102 §3.1).
 */
@Service
@RequiredArgsConstructor
public class LocationDescriptionServiceImpl implements LocationDescriptionService {

    private final MapLayersRepository layersRepository;
    private final ProximityDataRepository dataRepository;
    private final ObjectMapper objectMapper;
    private final AtomicReference<ProximityDataset> cache = new AtomicReference<>();

    @Override
    @Transactional(readOnly = true)
    public LocationDescriptionResponse describe(double lat, double lon) {
        ProximityDataset data = dataset();
        LocationDescription d = ProximityLocator.describe(data.plane().toPlane(lat, lon),
                data.sections(), data.buildings(), data.places(), ProximityThresholds.FIXED);
        return new LocationDescriptionResponse(
                d.section() == null ? null : d.section().code(),
                d.section() == null ? null : d.section().name(),
                d.buildingName(),
                d.relation() == null ? null : d.relation().name(),
                d.distanceM(),
                d.text());
    }

    private ProximityDataset dataset() {
        long version = layersRepository.currentVersion();
        ProximityDataset cached = cache.get();
        if (cached != null && cached.version() == version) {
            return cached;
        }
        ProximityDataset fresh = ProximityDataset.load(version, layersRepository.origin(), dataRepository, objectMapper);
        cache.set(fresh);
        return fresh;
    }

}
