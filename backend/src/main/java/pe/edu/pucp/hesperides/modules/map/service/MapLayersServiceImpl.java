package pe.edu.pucp.hesperides.modules.map.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.map.dto.MapLayersResponse;
import pe.edu.pucp.hesperides.modules.map.repository.MapLayersRepository;

import java.util.concurrent.atomic.AtomicReference;

/**
 * Arma las capas una vez por versión de datos y las reutiliza hasta que la
 * versión cambie. Sin esta caché, cada visor que abre el mapa haría siete
 * consultas espaciales para devolver lo mismo.
 */
@Service
@RequiredArgsConstructor
public class MapLayersServiceImpl implements MapLayersService {

    private final MapLayersRepository repository;
    private final AtomicReference<MapLayersResponse> cache = new AtomicReference<>();

    @Override
    @Transactional(readOnly = true)
    public long currentVersion() {
        return repository.currentVersion();
    }

    // REPEATABLE_READ: la versión y las capas se leen en la misma foto de la base.
    // Si no, una escritura entre ambas lecturas guardaría datos nuevos bajo la
    // versión anterior.
    @Override
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public MapLayersResponse layers() {
        long version = repository.currentVersion();
        MapLayersResponse cached = cache.get();
        if (cached != null && cached.version() == version) {
            return cached;
        }
        MapLayersResponse fresh = new MapLayersResponse(version, repository.origin(),
                repository.attributionRequired(), buildLayers());
        cache.set(fresh);
        return fresh;
    }

    private String buildLayers() {
        return "{\"sectors\":" + repository.zones("SECTOR")
                + ",\"sections\":" + repository.zones("SECTION")
                + ",\"subsections\":" + repository.zones("SUBSECTION")
                + ",\"supervisionZones\":" + repository.supervisionZones()
                + ",\"references\":" + repository.references()
                + ",\"buildings\":" + repository.buildings()
                + ",\"features\":" + repository.features() + "}";
    }
}
