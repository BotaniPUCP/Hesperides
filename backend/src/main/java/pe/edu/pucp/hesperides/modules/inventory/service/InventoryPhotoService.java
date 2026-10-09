package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.inventory.dto.PhotoSyncResponse;
import pe.edu.pucp.hesperides.modules.inventory.repository.PhotoRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.PhotoRepository.PendingPhoto;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesPhotoRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesPhotoRepository.NewPhoto;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.PhotoDownloader;
import pe.edu.pucp.hesperides.shared.storage.PhotoNotDownloadedException;
import pe.edu.pucp.hesperides.shared.storage.PhotoStore;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Fotos del inventario en nuestro almacenamiento (SPEC-002 §5.4): la del
 * ejemplar es real; la de la especie, genérica (SPEC-103 D-08).
 */
@Service
@RequiredArgsConstructor
public class InventoryPhotoService {

    /** Cuántas fotos de Drive se descargan por llamada: cada una tarda en red. */
    public static final int MAX_SYNC_BATCH = 100;

    private final PhotoRepository repository;
    private final PhotoStore store;
    private final PhotoDownloader downloader;
    private final SpeciesPhotoRepository speciesPhotos;
    private final AuditService audit;

    @Transactional
    public long attachToSpecimen(String code, byte[] original, String fileName, String sourceUrl, String uploaderEmail) {
        long elementId = repository.elementId(code);
        StoredPhoto photo = store.save("green-elements/" + code, original);
        return repository.insertElementPhoto(elementId, photo, fileName, sourceUrl, repository.userId(uploaderEmail));
    }

    /** Agrega la foto al final del conjunto de la especie (SPEC-104 D-03): nunca reemplaza. */
    @Transactional
    public long addSpeciesPhoto(String slug, byte[] original, String uploaderEmail) {
        long speciesId = repository.speciesId(slug);
        StoredPhoto photo = store.save("species/" + slug, original);
        long id = speciesPhotos.append(speciesId, new NewPhoto(photo, null, null, null, null), repository.userId(uploaderEmail));
        audit.record(AuditActionCode.SPECIES_PHOTO_ADDED, "Species", speciesId, Map.of("photoId", id));
        return id;
    }

    /**
     * Descarga a nuestro almacenamiento las fotos de Drive del catastro (SPEC-103
     * §5.4). Por lotes, para que una llamada no espere cientos de descargas; se
     * repite hasta que no queden pendientes. Las que fallan se informan y se
     * vuelven a intentar en la siguiente llamada.
     */
    public PhotoSyncResponse syncCatastroPhotos(int limit, String adminEmail) {
        if (limit < 1 || limit > MAX_SYNC_BATCH) {
            throw new ValidationException("limit must be between 1 and " + MAX_SYNC_BATCH);
        }
        int stored = 0;
        List<PhotoSyncResponse.Failure> failures = new ArrayList<>();
        for (PendingPhoto p : repository.pending(limit)) {
            try {
                attachToSpecimen(p.code(), downloader.download(p.sourceUrl()), null, p.sourceUrl(), adminEmail);
                stored++;
            } catch (PhotoNotDownloadedException | ValidationException e) {
                failures.add(new PhotoSyncResponse.Failure(p.code(), p.sourceUrl(), e.getMessage()));
            }
        }
        return new PhotoSyncResponse(stored, failures, repository.countPending());
    }
}
