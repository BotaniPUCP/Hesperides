package pe.edu.pucp.hesperides.modules.imports.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.shared.exception.OperationInProgressException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Una importación a la vez (SPEC-104 D-10): dos no caben en 1 GB de heap. */
class ImportLockTest {

    @Test
    void aSecondImportWhileOneRunsIsRejected() {
        ImportLock lock = new ImportLock();

        assertThat(lock.run(() -> {
            assertThatThrownBy(() -> lock.run(() -> "second"))
                    .isInstanceOf(OperationInProgressException.class);
            return "first";
        })).isEqualTo("first");
    }

    @Test
    void theLockIsReleasedAfterAFailure() {
        ImportLock lock = new ImportLock();

        assertThatThrownBy(() -> lock.run(() -> {
            throw new IllegalStateException("boom");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(lock.run(() -> "next")).isEqualTo("next");
    }
}
