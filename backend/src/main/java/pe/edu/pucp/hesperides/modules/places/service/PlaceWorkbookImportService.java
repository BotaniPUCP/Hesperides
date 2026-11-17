package pe.edu.pucp.hesperides.modules.places.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ooxml.POIXMLException;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFPicture;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.places.dto.OutlineRequest;
import pe.edu.pucp.hesperides.modules.places.dto.PerspectiveRequest;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceRequest;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceDetail;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.Perspective;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceWorkbookRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceWorkbookRepository.ExistingIdentifier;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceWorkbookRepository.LocationInput;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceWorkbookRepository.LocationMatch;
import pe.edu.pucp.hesperides.modules.places.service.PlacePhotoService.PhotoTarget;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.PhotoProcessor;
import pe.edu.pucp.hesperides.shared.storage.UploadLimits;
import tools.jackson.databind.ObjectMapper;

/** Vista previa y alta atómica de lugares desde una única hoja .xlsx. */
@Service
@RequiredArgsConstructor
public class PlaceWorkbookImportService {

    public static final String SHEET = "Lugares";
    private static final int PERSPECTIVE_COUNT = 3;
    private static final int BASE_COLUMNS = 11;
    public static final List<String> HEADERS = headers();

    public record ImportIssue(int row, String column, String value, String message) {
    }

    public record ExistingPlace(String code, String name) {
    }

    public record LocationConflict(int row, double lat, double lon, List<ExistingPlace> places) {
    }

    public record Replacement(int row, String placeCode) {
    }

    public record Preview(int rows, boolean canImport, List<ImportIssue> errors, List<LocationConflict> locationConflicts) {
    }

    public record ImportedPlace(String code, String name, boolean replaced) {
    }

    public record ImportResult(int imported, List<ImportedPlace> places) {
    }

    private record PerspectiveData(String side, Double lat, Double lon, Double heading, byte[] photo) {
    }

    private record PlaceData(int row, PlaceRequest request, List<PerspectiveData> perspectives,
            Double locationLat, Double locationLon) {
    }

    private record Parsed(List<PlaceData> places, List<ImportIssue> errors, int rows,
            List<LocationConflict> locationConflicts) {
    }

    private final ObjectMapper json;
    private final PlaceValuesResolver values;
    private final PlaceService places;
    private final PlaceQueryService placeQueries;
    private final PerspectiveService perspectives;
    private final PlacePhotoService photos;
    private final PlaceWorkbookRepository identifiers;

    public Preview preview(byte[] bytes, String filename) {
        Parsed parsed = read(bytes, filename, null);
        return new Preview(parsed.rows(), parsed.errors().isEmpty() && parsed.rows() > 0,
                parsed.errors(), parsed.locationConflicts());
    }

    @Transactional
    public ImportResult importWorkbook(byte[] bytes, String filename, String uploaderEmail,
            List<Replacement> replacements) {
        Map<Integer, String> selectedPlaces = replacementMap(replacements);
        Parsed parsed = read(bytes, filename, selectedPlaces);
        List<ImportIssue> replacementErrors = validateReplacements(parsed, selectedPlaces);
        if (!replacementErrors.isEmpty()) {
            throw new ValidationException(replacementErrors.stream()
                    .map(issue -> "Fila " + issue.row() + ": " + issue.message())
                    .collect(java.util.stream.Collectors.joining(" ")));
        }
        if (!parsed.errors().isEmpty() || parsed.rows() == 0) {
            throw new ValidationException("El Excel tiene errores; corrígelos en la vista previa antes de importar.");
        }

        List<ImportedPlace> imported = new ArrayList<>();
        for (PlaceData row : parsed.places()) {
            String code = selectedPlaces.get(row.row());
            boolean replaced = code != null;
            if (replaced) {
                PlaceDetail existing = placeQueries.detail(code);
                for (Perspective perspective : existing.perspectives()) {
                    perspectives.delete(code, perspective.id());
                }
                places.update(code, row.request());
            } else {
                code = places.create(row.request());
            }
            for (PerspectiveData data : row.perspectives()) {
                if (data.side() == null) {
                    continue;
                }
                Perspective created = perspectives.create(code,
                        new PerspectiveRequest(data.side(), data.lat(), data.lon(), data.heading(), null));
                if (data.photo() != null) {
                    photos.add(code, data.photo(), new PhotoTarget(created.id(), null, null, null), uploaderEmail);
                }
            }
            imported.add(new ImportedPlace(code, row.request().name(), replaced));
        }
        return new ImportResult(imported.size(), imported);
    }

    public byte[] template() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet(SHEET);
            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.size(); i++) {
                header.createCell(i).setCellValue(HEADERS.get(i));
                sheet.setColumnWidth(i, Math.min(HEADERS.get(i).length() + 4, 36) * 256);
            }
            sheet.createFreezePane(0, 1);
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, HEADERS.size() - 1));
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar la plantilla de lugares.", e);
        }
    }

    private Parsed read(byte[] bytes, String filename, Map<Integer, String> selectedReplacements) {
        if (filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw new ValidationException("Solo se aceptan archivos de Excel .xlsx.");
        }
        if (bytes == null || bytes.length == 0) {
            throw new ValidationException("El archivo Excel está vacío.");
        }

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            if (workbook.getNumberOfSheets() != 1 || !SHEET.equalsIgnoreCase(workbook.getSheetName(0).strip())) {
                return headerError("El archivo debe tener una sola hoja llamada «Lugares».");
            }
            XSSFSheet sheet = workbook.getSheetAt(0);
            Row header = sheet.getRow(0);
            if (header == null) {
                return headerError("Falta la fila de encabezados.");
            }

            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            Map<String, Integer> columns = columnIndexes(header, formatter);
            if (columns.size() != HEADERS.size()) {
                List<ImportIssue> errors = new ArrayList<>();
                for (String expected : HEADERS) {
                    if (!columns.containsKey(expected)) {
                        errors.add(new ImportIssue(1, expected, "", "Falta esta columna obligatoria de la plantilla."));
                    }
                }
                return new Parsed(List.of(), errors, 0, List.of());
            }

            Map<Long, Map<Integer, byte[]>> pictures = pictures(sheet);
            List<PlaceData> rows = new ArrayList<>();
            List<ImportIssue> errors = new ArrayList<>();
            if (!pictures.getOrDefault(0L, Map.of()).isEmpty()) {
                errors.add(new ImportIssue(1, "Imagen", "", "No insertes imágenes en la fila de encabezados."));
            }
            int rowCount = 0;
            long lastPictureRow = pictures.keySet().stream().mapToLong(Long::longValue).max().orElse(0);
            int lastRow = (int) Math.max(sheet.getLastRowNum(), lastPictureRow);
            for (int index = 1; index <= lastRow; index++) {
                Row row = sheet.getRow(index);
                Map<Integer, byte[]> rowPictures = pictures.getOrDefault((long) index, Map.of());
                if (blankRow(row, formatter) && rowPictures.isEmpty()) {
                    continue;
                }
                rowCount++;
                parseRow(row, index + 1, rowPictures, columns, formatter, rows, errors);
            }
            if (rowCount == 0) {
                errors.add(new ImportIssue(2, "Fila", "", "Agrega al menos una fila de lugar después de los encabezados."));
            }
            List<LocationConflict> locationConflicts = findLocationConflicts(rows);
            validateIdentifiers(rows, errors, locationConflicts, selectedReplacements);
            return new Parsed(rows, errors, rowCount, locationConflicts);
        } catch (IOException | POIXMLException e) {
            throw new ValidationException("No se pudo leer el Excel. Verifica que sea un archivo .xlsx válido.");
        }
    }

    private void parseRow(Row row, int rowNumber, Map<Integer, byte[]> rowPictures, Map<String, Integer> columns,
            DataFormatter formatter, List<PlaceData> parsed, List<ImportIssue> errors) {
        int errorStart = errors.size();
        String name = cell(row, columns, "Nombre", formatter);
        String kind = upper(cell(row, columns, "Tipo", formatter));
        String category = upper(cell(row, columns, "Categoría", formatter));
        String parentCode = emptyToNull(cell(row, columns, "Código padre", formatter));
        String aliasesText = cell(row, columns, "Alias (separados por ;)", formatter);
        List<String> aliases = splitAliases(aliasesText);

        required(rowNumber, "Nombre", name, "Ingresa el nombre del lugar.", errors);
        required(rowNumber, "Tipo", kind, "Usa OUTDOOR o INDOOR.", errors);
        required(rowNumber, "Categoría", category, "Ingresa un código de categoría válido.", errors);
        if (name.length() > 200) issue(errors, rowNumber, "Nombre", name, "No puede superar 200 caracteres.");
        if (kind != null && !Set.of("OUTDOOR", "INDOOR").contains(kind)) {
            issue(errors, rowNumber, "Tipo", kind, "Usa OUTDOOR o INDOOR.");
        }
        for (String alias : aliases) {
            if (alias.length() > 200) issue(errors, rowNumber, "Alias", alias, "Un alias no puede superar 200 caracteres.");
        }

        List<Long> buildingIds = parseBuildingIds(cell(row, columns, "IDs de edificio (separados por ;)", formatter),
                rowNumber, errors);
        String zoneCode = emptyToNull(cell(row, columns, "Código de zona", formatter));
        String featureCode = emptyToNull(cell(row, columns, "Código de estacionamiento", formatter));
        Double outlineLat = decimal(row, columns, "Latitud de punto", formatter, rowNumber, errors);
        Double outlineLon = decimal(row, columns, "Longitud de punto", formatter, rowNumber, errors);
        Boolean fromChildren = yesNo(row, columns, "Usar contorno de hijos (SI/NO)", formatter, rowNumber, errors);
        boolean missingOutdoorPoint = "OUTDOOR".equals(kind) && (outlineLat == null || outlineLon == null);
        boolean hasOtherOutdoorSource = !buildingIds.isEmpty() || zoneCode != null || featureCode != null
                || Boolean.TRUE.equals(fromChildren);
        if ("OUTDOOR".equals(kind)) {
            required(rowNumber, "Latitud de punto", cell(row, columns, "Latitud de punto", formatter),
                    "La latitud del punto del mapa es obligatoria para lugares exteriores.", errors);
            required(rowNumber, "Longitud de punto", cell(row, columns, "Longitud de punto", formatter),
                    "La longitud del punto del mapa es obligatoria para lugares exteriores.", errors);
            if (hasOtherOutdoorSource) {
                issue(errors, rowNumber, "Ubicación", "", "El punto del mapa debe ser la única fuente de ubicación; deja vacíos los edificios, zona, estacionamiento y contorno de hijos.");
            }
        }
        if ((outlineLat == null) != (outlineLon == null)) {
            issue(errors, rowNumber, "Latitud de punto / Longitud de punto", "", "Completa ambas coordenadas del punto.");
        }
        if (outlineLat != null && (outlineLat < -90 || outlineLat > 90)) {
            issue(errors, rowNumber, "Latitud de punto", String.valueOf(outlineLat), "Debe estar entre -90 y 90.");
        }
        if (outlineLon != null && (outlineLon < -180 || outlineLon > 180)) {
            issue(errors, rowNumber, "Longitud de punto", String.valueOf(outlineLon), "Debe estar entre -180 y 180.");
        }

        var geometry = outlineLat != null && outlineLon != null
                ? json.valueToTree(Map.of("type", "Point", "coordinates", List.of(outlineLon, outlineLat)))
                : null;
        OutlineRequest outline = new OutlineRequest(buildingIds, zoneCode, featureCode, geometry,
                Boolean.TRUE.equals(fromChildren));
        PlaceRequest request = name.isBlank() || kind == null || category == null
                ? null
                : new PlaceRequest(name, kind, category, parentCode, outline, aliases);

        List<PerspectiveData> perspectiveData = new ArrayList<>();
        Set<String> uniqueSides = new HashSet<>();
        for (int n = 1; n <= PERSPECTIVE_COUNT; n++) {
            String sideColumn = "Lado perspectiva " + n;
            String latColumn = "Latitud perspectiva " + n;
            String lonColumn = "Longitud perspectiva " + n;
            String headingColumn = "Rumbo perspectiva " + n;
            int photoColumn = columns.get("Foto perspectiva " + n + " (insertar en celda)");
            String side = upper(cell(row, columns, sideColumn, formatter));
            Double lat = decimal(row, columns, latColumn, formatter, rowNumber, errors);
            Double lon = decimal(row, columns, lonColumn, formatter, rowNumber, errors);
            Double heading = decimal(row, columns, headingColumn, formatter, rowNumber, errors);
            byte[] photo = rowPictures.get(photoColumn);

            boolean anyPerspectiveField = side != null || lat != null || lon != null || heading != null;
            if (!anyPerspectiveField && photo == null) {
                perspectiveData.add(new PerspectiveData(null, null, null, null, null));
                continue;
            }
            if (side == null) issue(errors, rowNumber, sideColumn, "", "Indica el tipo de perspectiva.");
            else if (!Set.of("FRONT", "BACK", "SIDE").contains(side)) {
                issue(errors, rowNumber, sideColumn, side, "Usa FRONT, BACK o SIDE.");
            } else if (!uniqueSides.add(side) && !"SIDE".equals(side)) {
                issue(errors, rowNumber, sideColumn, side, "Solo puede haber una perspectiva FRONT y una BACK por lugar.");
            }
            if (lat == null) issue(errors, rowNumber, latColumn, "", "La latitud es obligatoria cuando hay perspectiva.");
            if (lon == null) issue(errors, rowNumber, lonColumn, "", "La longitud es obligatoria cuando hay perspectiva.");
            if (heading == null) issue(errors, rowNumber, headingColumn, "", "El rumbo es obligatorio cuando hay perspectiva.");
            if (lat != null && (lat < -90 || lat > 90)) issue(errors, rowNumber, latColumn, String.valueOf(lat), "Debe estar entre -90 y 90.");
            if (lon != null && (lon < -180 || lon > 180)) issue(errors, rowNumber, lonColumn, String.valueOf(lon), "Debe estar entre -180 y 180.");
            if (heading != null && (heading < 0 || heading >= 360)) issue(errors, rowNumber, headingColumn, String.valueOf(heading), "Debe estar entre 0 y menos de 360.");
            if (photo != null) {
                if (photo.length > UploadLimits.MAX_PHOTO_BYTES) {
                    issue(errors, rowNumber, "Foto perspectiva " + n, "", "La imagen supera el límite de 25 MB.");
                } else {
                    try {
                        PhotoProcessor.process(photo);
                    } catch (ValidationException e) {
                        issue(errors, rowNumber, "Foto perspectiva " + n, "", "La imagen no es válida: " + e.getMessage());
                    }
                }
            }
            perspectiveData.add(new PerspectiveData(side, lat, lon, heading, photo));
        }
        for (Integer column : rowPictures.keySet()) {
            if (column < BASE_COLUMNS || (column - BASE_COLUMNS) % 5 != 4) {
                issue(errors, rowNumber, "Imagen", "", "Inserta las imágenes únicamente en las celdas «Foto perspectiva 1–3».");
            }
        }

        if (request != null) {
            try {
                values.resolve(request, null);
            } catch (ValidationException | BusinessRuleException | ConflictException | ResourceNotFoundException e) {
                boolean missingOnlyPoint = missingOutdoorPoint && e instanceof BusinessRuleException
                        && "An outdoor place needs an outline to be located on the map".equals(e.getMessage());
                boolean duplicateOutdoorSource = "OUTDOOR".equals(kind) && hasOtherOutdoorSource
                        && "Give one outline source: buildings, a zone, a feature, a drawing or the places inside it"
                                .equals(e.getMessage());
                if (!missingOnlyPoint && !duplicateOutdoorSource) {
                    issue(errors, rowNumber, "Lugar", name, explain(e.getMessage()));
                }
            }
            if ("INDOOR".equals(kind) && !perspectiveData.stream().allMatch(p -> p.side() == null)) {
                issue(errors, rowNumber, "Perspectivas", name, "Los lugares interiores no pueden tener perspectivas exteriores.");
            }
        }
        if (errors.size() == errorStart && request != null) {
            parsed.add(new PlaceData(rowNumber, request, perspectiveData, outlineLat, outlineLon));
        }
    }

    private void validateIdentifiers(List<PlaceData> rows, List<ImportIssue> errors,
            List<LocationConflict> locationConflicts, Map<Integer, String> selectedReplacements) {
        if (rows.isEmpty()) {
            return;
        }
        Map<String, Set<String>> existing = identifiers.existingIdentifiers().stream()
                .collect(java.util.stream.Collectors.groupingBy(identifier -> normalize(identifier.value()),
                        java.util.stream.Collectors.mapping(ExistingIdentifier::placeCode,
                                java.util.stream.Collectors.toSet())));
        Map<Integer, Set<String>> allowedOwners = allowedIdentifierOwners(locationConflicts, selectedReplacements);
        Map<String, PlaceData> seen = new HashMap<>();
        for (PlaceData row : rows) {
            List<String> rowIdentifiers = new ArrayList<>();
            rowIdentifiers.add(row.request().name());
            rowIdentifiers.addAll(row.request().aliasesOrEmpty());
            Set<String> withinRow = new HashSet<>();
            String nameKey = normalize(row.request().name());
            for (String value : rowIdentifiers) {
                String key = normalize(value);
                if (key.isEmpty()) continue;
                if (!withinRow.add(key)) {
                    if (!key.equals(nameKey)) {
                        issue(errors, row.row(), "Nombre / Alias", value, "El alias está repetido en esta fila.");
                    }
                    continue;
                }
                Set<String> owners = existing.getOrDefault(key, Set.of());
                if (owners.stream().anyMatch(owner -> !allowedOwners.getOrDefault(row.row(), Set.of()).contains(owner))) {
                    issue(errors, row.row(), "Nombre / Alias", value, "Este nombre o alias ya existe en el catálogo.");
                }
                PlaceData previous = seen.putIfAbsent(key, row);
                if (previous != null) {
                    issue(errors, row.row(), "Nombre / Alias", value,
                            "El nombre o alias se repite en la fila " + previous.row() + " del Excel.");
                }
            }
        }
    }

    private List<LocationConflict> findLocationConflicts(List<PlaceData> rows) {
        List<LocationInput> inputs = rows.stream()
                .filter(row -> row.locationLat() != null && row.locationLon() != null)
                .map(row -> new LocationInput(row.row(), row.locationLat(), row.locationLon())).toList();
        if (inputs.isEmpty()) return List.of();

        Map<Integer, PlaceData> rowsByNumber = rows.stream()
                .collect(java.util.stream.Collectors.toMap(PlaceData::row, row -> row));
        Map<Integer, List<ExistingPlace>> matchesByRow = new HashMap<>();
        for (LocationMatch match : identifiers.placesAtLocations(inputs)) {
            matchesByRow.computeIfAbsent(match.row(), ignored -> new ArrayList<>())
                    .add(new ExistingPlace(match.code(), match.name()));
        }
        return matchesByRow.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    PlaceData row = rowsByNumber.get(entry.getKey());
                    return new LocationConflict(row.row(), row.locationLat(), row.locationLon(), entry.getValue());
                })
                .toList();
    }

    private static Map<Integer, Set<String>> allowedIdentifierOwners(List<LocationConflict> locationConflicts,
            Map<Integer, String> selectedReplacements) {
        Map<Integer, Set<String>> result = new HashMap<>();
        if (selectedReplacements == null) {
            for (LocationConflict conflict : locationConflicts) {
                result.put(conflict.row(), conflict.places().stream().map(ExistingPlace::code)
                        .collect(java.util.stream.Collectors.toSet()));
            }
        } else {
            selectedReplacements.forEach((row, code) -> result.put(row, Set.of(code)));
        }
        return result;
    }

    private static Map<Integer, String> replacementMap(List<Replacement> replacements) {
        if (replacements == null || replacements.isEmpty()) return Map.of();
        Map<Integer, String> result = new HashMap<>();
        for (Replacement replacement : replacements) {
            if (replacement == null || replacement.row() < 2 || replacement.placeCode() == null
                    || replacement.placeCode().isBlank()) {
                throw new ValidationException("Cada reemplazo debe indicar una fila y un lugar existente.");
            }
            if (result.putIfAbsent(replacement.row(), replacement.placeCode()) != null) {
                throw new ValidationException("No indiques más de un lugar para reemplazar en la misma fila.");
            }
        }
        return result;
    }

    private static List<ImportIssue> validateReplacements(Parsed parsed, Map<Integer, String> selectedReplacements) {
        List<ImportIssue> errors = new ArrayList<>();
        Map<Integer, LocationConflict> conflicts = parsed.locationConflicts().stream()
                .collect(java.util.stream.Collectors.toMap(LocationConflict::row, conflict -> conflict));
        Set<String> selectedCodes = new HashSet<>();

        selectedReplacements.forEach((row, code) -> {
            LocationConflict conflict = conflicts.get(row);
            if (conflict == null || conflict.places().stream().noneMatch(place -> place.code().equals(code))) {
                errors.add(new ImportIssue(row, "Ubicación", code,
                        "El lugar seleccionado no coincide con la ubicación de esta fila."));
            } else if (!selectedCodes.add(code)) {
                errors.add(new ImportIssue(row, "Ubicación", code,
                        "Un mismo lugar existente no se puede reemplazar desde más de una fila."));
            }
        });
        for (LocationConflict conflict : parsed.locationConflicts()) {
            if (!selectedReplacements.containsKey(conflict.row())) {
                errors.add(new ImportIssue(conflict.row(), "Ubicación",
                        conflict.lat() + ", " + conflict.lon(),
                        "Selecciona el lugar que deseas sobrescribir o cancela la importación."));
            }
        }
        return errors;
    }

    private static Map<String, Integer> columnIndexes(Row header, DataFormatter formatter) {
        Map<String, Integer> result = new HashMap<>();
        for (int column = 0; column < header.getLastCellNum(); column++) {
            String value = formatter.formatCellValue(header.getCell(column)).strip();
            if (HEADERS.contains(value)) result.put(value, column);
        }
        return result;
    }

    private static Map<Long, Map<Integer, byte[]>> pictures(XSSFSheet sheet) {
        Map<Long, Map<Integer, byte[]>> result = new HashMap<>();
        XSSFDrawing drawing = sheet.getDrawingPatriarch();
        if (drawing == null) return result;
        for (var shape : drawing.getShapes()) {
            if (!(shape instanceof XSSFPicture picture)) continue;
            var anchor = picture.getClientAnchor();
            Map<Integer, byte[]> row = result.computeIfAbsent((long) anchor.getRow1(), ignored -> new HashMap<>());
            int column = anchor.getCol1();
            if (row.putIfAbsent(column, picture.getPictureData().getData()) != null) {
                row.put(column, new byte[0]);
            }
        }
        return result;
    }

    private static List<Long> parseBuildingIds(String value, int row, List<ImportIssue> errors) {
        if (value.isBlank()) return List.of();
        List<Long> ids = new ArrayList<>();
        for (String token : value.split(";")) {
            try {
                long id = Long.parseLong(token.strip());
                if (id <= 0) throw new NumberFormatException();
                ids.add(id);
            } catch (NumberFormatException e) {
                issue(errors, row, "IDs de edificio", token, "Usa IDs numéricos positivos separados por punto y coma.");
            }
        }
        return ids.stream().distinct().toList();
    }

    private static Double decimal(Row row, Map<String, Integer> columns, String column, DataFormatter formatter,
            int rowNumber, List<ImportIssue> errors) {
        String value = cell(row, columns, column, formatter);
        if (value.isBlank()) return null;
        try {
            double number = Double.parseDouble(value.strip());
            if (!Double.isFinite(number)) throw new NumberFormatException();
            return number;
        } catch (NumberFormatException e) {
            issue(errors, rowNumber, column, value, "Usa un número decimal con punto como separador.");
            return null;
        }
    }

    private static Boolean yesNo(Row row, Map<String, Integer> columns, String column, DataFormatter formatter,
            int rowNumber, List<ImportIssue> errors) {
        String value = upper(cell(row, columns, column, formatter));
        if (value == null || "NO".equals(value)) return false;
        if ("SI".equals(value) || "SÍ".equals(value)) return true;
        issue(errors, rowNumber, column, value, "Usa SI o NO.");
        return false;
    }

    private static String cell(Row row, Map<String, Integer> columns, String column, DataFormatter formatter) {
        if (row == null) return "";
        return formatter.formatCellValue(row.getCell(columns.get(column))).strip();
    }

    private static boolean blankRow(Row row, DataFormatter formatter) {
        if (row == null) return true;
        for (int i = row.getFirstCellNum(); i >= 0 && i < row.getLastCellNum(); i++) {
            if (!formatter.formatCellValue(row.getCell(i)).isBlank()) return false;
        }
        return true;
    }

    private static void required(int row, String column, String value, String message, List<ImportIssue> errors) {
        if (value == null || value.isBlank()) issue(errors, row, column, value == null ? "" : value, message);
    }

    private static void issue(List<ImportIssue> errors, int row, String column, String value, String message) {
        errors.add(new ImportIssue(row, column, value, message));
    }

    private static String upper(String value) {
        return emptyToNull(value) == null ? null : value.strip().toUpperCase(Locale.ROOT);
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static List<String> splitAliases(String aliases) {
        if (aliases.isBlank()) return List.of();
        return java.util.Arrays.stream(aliases.split(";")).map(String::strip).filter(value -> !value.isBlank()).toList();
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value.strip(), Normalizer.Form.NFD).replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }

    private static String explain(String message) {
        return switch (message) {
            case "An outdoor place needs an outline to be located on the map" ->
                "Un lugar exterior necesita las coordenadas del punto del mapa.";
            case "Give one outline source: buildings, a zone, a feature, a drawing or the places inside it" ->
                "El punto del mapa debe ser la única fuente de ubicación del lugar exterior; deja vacíos los edificios, zona, estacionamiento y contorno de hijos.";
            case "An indoor place must be inside another place" ->
                "Un lugar interior requiere el código de su lugar padre.";
            case "An indoor place is located by its parent and has no outline of its own" ->
                "Un lugar interior se ubica por su padre y no debe tener contorno propio.";
            case "The drawn outline is not valid GeoJSON", "The drawn outline is not a valid geometry" ->
                "El punto del contorno no es válido.";
            default -> message;
        };
    }

    private static Parsed headerError(String message) {
        return new Parsed(List.of(), List.of(new ImportIssue(1, "Hoja", "", message)), 0, List.of());
    }

    private static List<String> headers() {
        List<String> result = new ArrayList<>(List.of(
                "Nombre", "Tipo", "Categoría", "Código padre", "Alias (separados por ;)",
                "IDs de edificio (separados por ;)", "Código de zona", "Código de estacionamiento",
                "Latitud de punto", "Longitud de punto", "Usar contorno de hijos (SI/NO)"));
        for (int i = 1; i <= PERSPECTIVE_COUNT; i++) {
            result.add("Lado perspectiva " + i);
            result.add("Latitud perspectiva " + i);
            result.add("Longitud perspectiva " + i);
            result.add("Rumbo perspectiva " + i);
            result.add("Foto perspectiva " + i + " (insertar en celda)");
        }
        return List.copyOf(result);
    }
}
