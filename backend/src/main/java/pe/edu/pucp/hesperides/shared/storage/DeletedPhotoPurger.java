package pe.edu.pucp.hesperides.shared.storage;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.shared.storage.DeletedPhotoRepository.DuePhoto;
import pe.edu.pucp.hesperides.shared.storage.DeletedPhotoRepository.PhotoTable;

/**
 * Borra los archivos de las fotos dadas de baja hace más de
 * {@link PhotoRetention#AFTER_DELETION}. La fila queda, marcada, como historial.
 * Si un archivo no se puede borrar, la foto queda pendiente para la próxima pasada.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeletedPhotoPurger {

    private final DeletedPhotoRepository photos;
    private final FileStorage storage;

    /** @return cuántas fotos quedaron sin archivos en esta pasada */
    public int purge(LocalDateTime now) {
        LocalDateTime cutoff = PhotoRetention.cutoff(now);
        int purged = 0;
        for (PhotoTable table : PhotoTable.values()) {
            for (DuePhoto photo : photos.due(table, cutoff, PhotoRetention.BATCH_SIZE)) {
                if (purgeOne(table, photo, now)) {
                    purged++;
                }
            }
        }
        log.info("Limpieza de fotos dadas de baja antes de {}: {} sin archivos", cutoff, purged);
        return purged;
    }

    private boolean purgeOne(PhotoTable table, DuePhoto photo, LocalDateTime now) {
        // Una clave que reusa una foto vigente se deja, y la baja queda pendiente
        // por si esa otra foto también se da de baja después.
        if (photos.inUse(photo.fullKey()) || photos.inUse(photo.thumbnailKey())) {
            return false;
        }
        try {
            storage.delete(photo.fullKey());
            storage.delete(photo.thumbnailKey());
        } catch (RuntimeException e) {
            log.warn("No se pudieron borrar los archivos de la foto {} de {}; se reintenta en la próxima pasada", photo.id(),
                    table, e);
            return false;
        }
        photos.markPurged(table, photo.id(), now);
        return true;
    }
}
