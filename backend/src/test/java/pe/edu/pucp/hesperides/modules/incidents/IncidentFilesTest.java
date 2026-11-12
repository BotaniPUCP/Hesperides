package pe.edu.pucp.hesperides.modules.incidents;

import java.nio.file.Path;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentFiles;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import pe.edu.pucp.hesperides.shared.storage.LocalFileStorage;
import pe.edu.pucp.hesperides.shared.storage.StoredFileNotFoundException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class IncidentFilesTest {
    @TempDir Path root;

    @AfterEach void clearTransaction() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test void committedPhotosUseSharedStorageWithoutChangingOriginalBytes() {
        FileStorage storage = new LocalFileStorage(root);
        IncidentFiles files = new IncidentFiles(storage);
        byte[] original = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==");
        TransactionSynchronizationManager.initSynchronization();
        String key = files.write(original, files.contentType(original));
        complete(TransactionSynchronization.STATUS_COMMITTED);

        assertThat(key).startsWith("incidents/");
        assertThat(storage.read(key)).isEqualTo(original);
        assertThat(files.read(key)).isEqualTo(original);
    }

    @Test void delegatesToTheConfiguredProviderAndDeletesOnRollback() {
        FileStorage storage = mock(FileStorage.class);
        IncidentFiles files = new IncidentFiles(storage);
        TransactionSynchronizationManager.initSynchronization();
        byte[] original = {1, 2, 3};
        String key = files.write(original, "image/webp");
        verify(storage).put(key, original, "image/webp");
        verify(storage, never()).directUrl(anyString());

        complete(TransactionSynchronization.STATUS_ROLLED_BACK);
        verify(storage).delete(key);
    }

    @Test void failedWritesCleanUpPartialFilesAndKeepTheOriginalFailure() {
        FileStorage storage = mock(FileStorage.class);
        doThrow(new IllegalStateException("Storage unavailable")).when(storage).put(anyString(), any(), anyString());
        IncidentFiles files = new IncidentFiles(storage);
        TransactionSynchronizationManager.initSynchronization();

        assertThatThrownBy(() -> files.write(new byte[] {1}, "image/png"))
                .isInstanceOf(IllegalStateException.class).hasMessage("Storage unavailable");
        verify(storage).delete(startsWith("incidents/"));
    }

    @Test void refusesWritesOutsideATransaction() {
        FileStorage storage = mock(FileStorage.class);
        IncidentFiles files = new IncidentFiles(storage);
        assertThatThrownBy(() -> files.write(new byte[] {1}, "image/png")).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(storage);
    }

    @Test void missingPhotosUseOnlyTheConfiguredStorage() {
        FileStorage storage = mock(FileStorage.class);
        String key = "incidents/" + UUID.randomUUID();
        StoredFileNotFoundException missing = new StoredFileNotFoundException(key);
        when(storage.read(key)).thenThrow(missing);

        assertThatThrownBy(() -> new IncidentFiles(storage).read(key)).isSameAs(missing);
        verify(storage).read(key);
        verifyNoMoreInteractions(storage);
    }

    @Test void keysMustBelongToTheIncidentNamespace() {
        FileStorage storage = mock(FileStorage.class);
        IncidentFiles files = new IncidentFiles(storage);
        assertThatThrownBy(() -> files.read(UUID.randomUUID().toString())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> files.read("../outside")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> files.read("places/photo.jpg")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> files.read("incidents/../outside")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> files.read("incidents/1-1-1-1-1")).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(storage);
    }

    @Test void springCreatesTheComponentWithOnlySharedStorage() {
        FileStorage storage = mock(FileStorage.class);
        try (var context = new AnnotationConfigApplicationContext()) {
            context.registerBean(FileStorage.class, () -> storage);
            context.register(IncidentFiles.class);
            context.refresh();
            assertThat(context.getBean(IncidentFiles.class)).isNotNull();
        }
    }

    @Test void incidentLimitsAndWebpSupportDoNotInheritTheCatalogPhotoPolicy() {
        IncidentFiles files = new IncidentFiles(new LocalFileStorage(root));
        assertThatThrownBy(() -> files.contentType(new byte[5 * 1024 * 1024 + 1])).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> files.contentType(new byte[0])).isInstanceOf(ValidationException.class);
        byte[] webp = Base64.getDecoder().decode("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA");
        assertThat(files.contentType(webp)).isEqualTo("image/webp");
    }

    private void complete(int status) {
        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCompletion(status));
    }
}
