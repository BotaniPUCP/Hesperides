package pe.edu.pucp.hesperides.shared.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.Optional;

/** Archivos en un directorio del servidor: desarrollo y on-premise. */
public class LocalFileStorage implements FileStorage {

    private final Path root;

    public LocalFileStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    @Override
    public void put(String key, byte[] content, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar " + key, e);
        }
    }

    @Override
    public byte[] read(String key) {
        try {
            return Files.readAllBytes(resolve(key));
        } catch (NoSuchFileException e) {
            throw new StoredFileNotFoundException(key);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo borrar " + key, e);
        }
    }

    @Override
    public Optional<URI> directUrl(String key) {
        return Optional.empty();
    }

    /** Una clave con «..» no puede salir del directorio de almacenamiento. */
    private Path resolve(String key) {
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Clave fuera del almacenamiento: " + key);
        }
        return target;
    }
}
