package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import pe.edu.pucp.hesperides.modules.imports.csv.PhotoReference;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.PhotoDownloader;
import pe.edu.pucp.hesperides.shared.storage.PhotoNotDownloadedException;
import pe.edu.pucp.hesperides.shared.storage.PhotoStore;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Trae y guarda las fotos de una carga antes de abrir la transacción, para que
 * no espere a la red (SPEC-103 §3.1). Una foto que no se puede traer no impide
 * guardar su fila: queda como aviso.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ImportPhotos {

    /** La foto de una fila: un enlace de Drive o un nombre del ZIP. */
    public record Request(int line, String photo) {
    }

    private final PhotoDownloader downloader;
    private final PhotoStore store;
    private final FileStorage storage;

    /** @return por línea, la foto guardada */
    public Map<Integer, StoredPhoto> store(String folder, List<Request> requests, Map<String, byte[]> zip,
                                           List<ImportPreviewResponse.Issue> warnings) {
        Map<Integer, StoredPhoto> out = new HashMap<>();
        for (Request r : requests) {
            try {
                byte[] bytes = PhotoReference.isLink(r.photo()) ? downloader.download(r.photo()) : zip.get(PhotoFiles.name(r.photo()));
                out.put(r.line(), store.save(folder, bytes));
            } catch (PhotoNotDownloadedException | ValidationException e) {
                warnings.add(new ImportPreviewResponse.Issue(r.line(), "foto", "Photo not saved: " + e.getMessage()));
            } catch (RuntimeException failure) {
                discard(out.values());
                throw failure;
            }
        }
        return out;
    }

    /** Staged binaries must not outlive a database batch that rolls back. */
    public void deleteAfterRollback(Map<Integer, StoredPhoto> stored) {
        if (stored.isEmpty()) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Imported photos must be cleaned up with their database transaction");
        }
        List<StoredPhoto> staged = List.copyOf(stored.values());
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) discard(staged);
            }
        });
    }

    private void discard(Iterable<StoredPhoto> staged) {
        for (StoredPhoto photo : staged) {
            deleteQuietly(photo.storageKey());
            deleteQuietly(photo.thumbnailKey());
        }
    }

    private void deleteQuietly(String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException error) {
            log.error("Could not remove an uncommitted import photo", error);
        }
    }

    public static boolean needsZip(List<Request> requests) {
        return requests.stream().anyMatch(r -> !PhotoReference.isLink(r.photo()));
    }

    /** Solo un enlace es dato de origen; un nombre de archivo del ZIP no. */
    public static String sourceLink(String photo) {
        return PhotoReference.isLink(photo) ? photo : null;
    }
}
