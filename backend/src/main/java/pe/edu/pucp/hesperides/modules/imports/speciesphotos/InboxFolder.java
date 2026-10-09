package pe.edu.pucp.hesperides.modules.imports.speciesphotos;

import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * La carpeta de la bandeja con las fotos de especie y su CSV (SPEC-104 D-05). Los
 * nombres se comparan como en el ZIP: sin carpeta ni mayúsculas.
 */
public final class InboxFolder {

    public static final String CSV = "fotos-especies.csv";

    private final Path dir;

    public InboxFolder(Path dir) {
        this.dir = dir;
    }

    public Optional<byte[]> csv() {
        Path csv = dir.resolve(CSV);
        return Files.exists(csv) ? Optional.of(read(csv)) : Optional.empty();
    }

    /** Nombre normalizado → archivo, sin el CSV. */
    public Map<String, Path> photos() {
        if (!Files.isDirectory(dir)) {
            return Map.of();
        }
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(Files::isRegularFile)
                    .filter(f -> !f.getFileName().toString().equalsIgnoreCase(CSV))
                    .filter(f -> !f.getFileName().toString().startsWith("."))
                    .collect(Collectors.toMap(f -> PhotoFiles.name(f.getFileName().toString()), Function.identity()));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not list the inbox " + dir, e);
        }
    }

    public long size(Path photo) {
        try {
            return Files.size(photo);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + photo, e);
        }
    }

    public byte[] read(Path file) {
        try {
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + file, e);
        }
    }

    public void delete(Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not delete " + file, e);
        }
    }

    /** Sin fotos pendientes el CSV ya no describe nada: se borra y la bandeja queda vacía. */
    public void deleteCsvIfDone() {
        if (photos().isEmpty()) {
            delete(dir.resolve(CSV));
        }
    }
}
