package pe.edu.pucp.hesperides.modules.imports.service;

import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.OperationInProgressException;

import java.util.concurrent.Semaphore;
import java.util.function.Supplier;

/**
 * Una importación a la vez (SPEC-104 D-10). Con 1 GB de heap cabe una carga al
 * límite (ZIP de 250 MB y 500 MB descomprimidos) pero no dos: es preferible
 * rechazar la segunda que un OutOfMemoryError que tumbe el backend para todos.
 */
@Component
public class ImportLock {

    private final Semaphore permit = new Semaphore(1);

    public <T> T run(Supplier<T> work) {
        if (!permit.tryAcquire()) {
            throw new OperationInProgressException("Another import is in progress. Try again in a few minutes");
        }
        try {
            return work.get();
        } finally {
            permit.release();
        }
    }
}
