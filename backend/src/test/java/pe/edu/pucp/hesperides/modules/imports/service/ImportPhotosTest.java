package pe.edu.pucp.hesperides.modules.imports.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.shared.storage.PhotoDownloader;
import pe.edu.pucp.hesperides.shared.storage.PhotoNotDownloadedException;
import pe.edu.pucp.hesperides.shared.storage.PhotoStore;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ImportPhotosTest {

    @Test
    void aDownloadFailureWarnsForThatPhotoAndKeepsProcessingOtherRows() {
        PhotoDownloader downloader = mock(PhotoDownloader.class);
        PhotoStore store = mock(PhotoStore.class);
        FileStorage storage = mock(FileStorage.class);
        String unreachable = "https://drive.google.com/file/d/unreachable/view";
        when(downloader.download(unreachable)).thenThrow(new PhotoNotDownloadedException("network error"));
        when(downloader.download("https://drive.google.com/file/d/available/view"))
                .thenReturn(new byte[] { 1, 2, 3 });
        StoredPhoto saved = new StoredPhoto("full", "thumb", "image/jpeg", 3);
        when(store.save("import", new byte[] { 1, 2, 3 })).thenReturn(saved);

        List<ImportPreviewResponse.Issue> warnings = new ArrayList<>();
        Map<Integer, StoredPhoto> result = new ImportPhotos(downloader, store, storage).store("import", List.of(
                new ImportPhotos.Request(2, unreachable),
                new ImportPhotos.Request(3, "https://drive.google.com/file/d/available/view")), Map.of(), warnings);

        assertThat(result).hasSize(1).containsEntry(3, saved);
        assertThat(warnings).singleElement().satisfies(warning -> {
            assertThat(warning.line()).isEqualTo(2);
            assertThat(warning.column()).isEqualTo("foto");
        });
    }

    @Test
    void stagedFilesAreRemovedOnlyWhenTheirDatabaseTransactionRollsBack() {
        FileStorage storage = mock(FileStorage.class);
        ImportPhotos photos = new ImportPhotos(mock(PhotoDownloader.class), mock(PhotoStore.class), storage);
        StoredPhoto staged = new StoredPhoto("full", "thumb", "image/jpeg", 3);

        TransactionSynchronizationManager.initSynchronization();
        try {
            photos.deleteAfterRollback(Map.of(1, staged));
            TransactionSynchronization synchronization = TransactionSynchronizationManager.getSynchronizations().getFirst();
            synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            verify(storage).delete("full");
            verify(storage).delete("thumb");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }

        FileStorage committedStorage = mock(FileStorage.class);
        TransactionSynchronizationManager.initSynchronization();
        try {
            new ImportPhotos(mock(PhotoDownloader.class), mock(PhotoStore.class), committedStorage)
                    .deleteAfterRollback(Map.of(1, staged));
            TransactionSynchronizationManager.getSynchronizations().getFirst()
                    .afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
            verifyNoInteractions(committedStorage);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
