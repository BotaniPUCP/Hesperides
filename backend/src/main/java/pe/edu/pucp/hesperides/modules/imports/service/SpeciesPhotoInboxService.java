package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.csv.PhotoReference;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse.Issue;
import pe.edu.pucp.hesperides.modules.imports.dto.InboxLoadResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.InboxLoadResponse.Failure;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.modules.imports.speciesphotos.InboxFolder;
import pe.edu.pucp.hesperides.modules.imports.speciesphotos.SpeciesPhotoPreview;
import pe.edu.pucp.hesperides.modules.imports.speciesphotos.SpeciesPhotoPreview.Planned;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.PhotoStore;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;
import pe.edu.pucp.hesperides.shared.storage.UploadLimits;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Carga inicial de las fotos de especie desde la bandeja del servidor (SPEC-104
 * D-05, D-06): una foto a la vez, especie por especie, y cada original se borra
 * solo después de quedar guardada su versión reducida. Volver a ejecutarla
 * continúa con lo que quede.
 */
@Service
@RequiredArgsConstructor
public class SpeciesPhotoInboxService {

    static final String FOLDER = "species-photos";

    private final SpecimenLookupRepository lookup;
    private final PhotoStore store;
    private final SpeciesPhotoSets sets;
    private final TransactionTemplate transaction;
    private final ImportLock lock;

    @Value("${hesperides.storage.inbox-dir:}")
    private String inboxDir;

    /** Lo que llevó una ejecución: se arma especie por especie. */
    private static final class Run {
        int loaded;
        int species;
        final List<Failure> failures = new ArrayList<>();
    }

    public InboxLoadResponse load(String adminEmail) {
        return lock.run(() -> loadFolder(folder(), lookup.userId(adminEmail)));
    }

    private InboxFolder folder() {
        if (inboxDir == null || inboxDir.isBlank()) {
            throw new BusinessRuleException("The inbox is not configured: set STORAGE_INBOX_DIR");
        }
        return new InboxFolder(Path.of(inboxDir).resolve(FOLDER));
    }

    private InboxLoadResponse loadFolder(InboxFolder inbox, long userId) {
        Map<String, Path> files = inbox.photos();
        Optional<byte[]> csv = inbox.csv();
        if (csv.isEmpty()) {
            if (!files.isEmpty()) {
                throw new BusinessRuleException("The inbox has photos but no " + InboxFolder.CSV);
            }
            return new InboxLoadResponse(0, 0, List.of(), 0);
        }
        CsvTable table = CsvTable.parse(csv.get());
        Set<String> listed = table.rows().stream().map(r -> PhotoFiles.name(r.get("foto"))).collect(Collectors.toSet());
        SpeciesPhotoPreview preview = SpeciesPhotoPreview.of(table, lookup.speciesByName(), listed);
        if (!preview.issues().isEmpty()) {
            throw new ValidationException(InboxFolder.CSV + " has errors: " + preview.issues().stream().limit(5)
                    .map(i -> "line " + i.line() + " " + i.column() + ": " + i.message()).collect(Collectors.joining("; ")));
        }
        Run run = new Run();
        preview.sets().values().forEach(set -> loadSet(inbox, files, set, userId, run));
        reportLeftovers(files, listed, preview, run);
        inbox.deleteCsvIfDone();
        return new InboxLoadResponse(run.loaded, run.species, run.failures, inbox.photos().size());
    }

    private void loadSet(InboxFolder inbox, Map<String, Path> files, List<Planned> set, long userId, Run run) {
        List<Path> present = set.stream().map(r -> files.get(PhotoFiles.name(r.photo()))).filter(f -> f != null).toList();
        if (present.isEmpty()) {
            return; // Ya cargada en una ejecución anterior: sus originales se borraron.
        }
        Map<Integer, StoredPhoto> stored = new HashMap<>();
        for (Planned row : set) {
            String failure = store(inbox, files.get(PhotoFiles.name(row.photo())), row, stored);
            if (failure != null) {
                run.failures.add(new Failure(row.photo(), failure));
            }
        }
        List<Issue> ignored = new ArrayList<>();
        Planned first = set.get(0);
        Boolean replaced = transaction.execute(status ->
                sets.replace(first.speciesId(), first.slug(), set, stored, r -> null, userId, ignored));
        if (Boolean.TRUE.equals(replaced)) {
            present.forEach(inbox::delete);
            run.loaded += set.size();
            run.species++;
        }
    }

    /** @return por qué no se guardó, o nulo si se guardó */
    private String store(InboxFolder inbox, Path file, Planned row, Map<Integer, StoredPhoto> stored) {
        if (PhotoReference.isLink(row.photo())) {
            return "The inbox takes file names, not links";
        }
        if (file == null) {
            return "Not in the inbox";
        }
        if (inbox.size(file) > UploadLimits.MAX_PHOTO_BYTES) {
            return "Larger than " + UploadLimits.MAX_PHOTO_LABEL;
        }
        try {
            stored.put(row.line(), store.save("species/" + row.slug(), inbox.read(file)));
            return null;
        } catch (ValidationException e) {
            return e.getMessage();
        }
    }

    /** Lo que se queda en la bandeja sin ser de ninguna especie cargable. */
    private void reportLeftovers(Map<String, Path> files, Set<String> listed, SpeciesPhotoPreview preview, Run run) {
        Set<String> planned = preview.rows().stream().map(r -> PhotoFiles.name(r.photo())).collect(Collectors.toSet());
        files.forEach((name, file) -> {
            if (!listed.contains(name)) {
                run.failures.add(new Failure(file.getFileName().toString(), "Not listed in " + InboxFolder.CSV));
            } else if (!planned.contains(name)) {
                run.failures.add(new Failure(file.getFileName().toString(), "Its species is not in the catalog"));
            }
        });
    }
}
