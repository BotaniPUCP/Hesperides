package pe.edu.pucp.hesperides.modules.places.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFClientAnchor;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceWorkbookExportRequest;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceWorkbookExportRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceWorkbookExportRepository.ExportPerspective;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceWorkbookExportRepository.ExportPlace;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;

@Service
@RequiredArgsConstructor
public class PlaceWorkbookExportService {

    private static final int BASE_COLUMNS = 11;
    private static final int PERSPECTIVE_COLUMNS = 5;
    private static final int MAX_PERSPECTIVES = 3;
    private static final Set<String> VALID_SIDES = Set.of("FRONT", "BACK", "SIDE");

    private final PlaceWorkbookExportRepository places;
    private final FileStorage storage;

    @Transactional(readOnly = true)
    public byte[] export(PlaceWorkbookExportRequest request) {
        List<String> sides = validate(request);
        String triangle = triangleWkt(request);
        List<ExportPlace> selected = places.findPlaces(blankToNull(request.categoryCode()),
                blankToNull(request.alias()), blankToNull(request.parentCode()), request.createdFrom(),
                request.createdTo(), triangle);
        List<Long> placeIds = selected.stream().map(ExportPlace::id).toList();
        Map<Long, List<ExportPerspective>> perspectives = places.findPerspectives(placeIds, sides).stream()
                .collect(Collectors.groupingBy(ExportPerspective::placeId, HashMap::new, Collectors.toList()));
        for (ExportPlace place : selected) {
            if (perspectives.getOrDefault(place.id(), List.of()).size() > MAX_PERSPECTIVES) {
                throw new ValidationException("El lugar «" + place.name()
                        + "» tiene más de tres perspectivas de los lados seleccionados; el formato de importación admite hasta tres.");
            }
        }
        return workbook(selected, perspectives, request.includePerspectives());
    }

    private static List<String> validate(PlaceWorkbookExportRequest request) {
        if (request == null) throw new ValidationException("Indica los filtros de exportación.");
        if (request.createdFrom() != null && request.createdTo() != null
                && request.createdFrom().isAfter(request.createdTo())) {
            throw new ValidationException("La fecha inicial no puede ser posterior a la fecha final.");
        }
        if (request.alias() != null && request.alias().strip().length() > 200) {
            throw new ValidationException("El alias no puede superar los 200 caracteres.");
        }

        int coordinates = 0;
        Double[] values = {request.point1Lat(), request.point1Lon(), request.point2Lat(), request.point2Lon(),
                request.point3Lat(), request.point3Lon()};
        for (Double value : values) if (value != null) coordinates++;
        if (coordinates != 0 && coordinates != values.length) {
            throw new ValidationException("Completa latitud y longitud de los tres puntos para filtrar por zona.");
        }
        if (coordinates == values.length) {
            validateCoordinate(request.point1Lat(), request.point1Lon());
            validateCoordinate(request.point2Lat(), request.point2Lon());
            validateCoordinate(request.point3Lat(), request.point3Lon());
            double area = (request.point2Lon() - request.point1Lon()) * (request.point3Lat() - request.point1Lat())
                    - (request.point2Lat() - request.point1Lat()) * (request.point3Lon() - request.point1Lon());
            if (Math.abs(area) < 1e-12) {
                throw new ValidationException("Los tres puntos deben formar un triángulo con área mayor que cero.");
            }
        }

        List<String> requestedSides = request.includePerspectives() && request.perspectiveSides() != null
                ? request.perspectiveSides().stream().distinct().toList()
                : List.of();
        if (request.includePerspectives() && requestedSides.isEmpty()) {
            throw new ValidationException("Selecciona al menos un punto cardinal para exportar perspectivas.");
        }
        if (requestedSides.stream().anyMatch(side -> !VALID_SIDES.contains(side))) {
            throw new ValidationException("Los lados de perspectiva deben ser FRONT, BACK o SIDE.");
        }
        return requestedSides;
    }

    private static void validateCoordinate(double latitude, double longitude) {
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new ValidationException("Las coordenadas deben tener latitud entre -90 y 90 y longitud entre -180 y 180.");
        }
    }

    private static String triangleWkt(PlaceWorkbookExportRequest request) {
        if (request.point1Lat() == null) return null;
        return "POLYGON((" + point(request.point1Lon(), request.point1Lat()) + ","
                + point(request.point2Lon(), request.point2Lat()) + ","
                + point(request.point3Lon(), request.point3Lat()) + ","
                + point(request.point1Lon(), request.point1Lat()) + "))";
    }

    private static String point(double longitude, double latitude) {
        return String.format(Locale.ROOT, "%s %s", Double.toString(longitude), Double.toString(latitude));
    }

    private byte[] workbook(List<ExportPlace> selected, Map<Long, List<ExportPerspective>> perspectives,
            boolean includePerspectives) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet(PlaceWorkbookImportService.SHEET);
            var headerRow = sheet.createRow(0);
            for (int column = 0; column < PlaceWorkbookImportService.HEADERS.size(); column++) {
                String headerText = PlaceWorkbookImportService.HEADERS.get(column);
                headerRow.createCell(column).setCellValue(headerText);
                sheet.setColumnWidth(column, Math.min(headerText.length() + 4, 36) * 256);
            }
            sheet.createFreezePane(0, 1);
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(
                    0, 0, 0, PlaceWorkbookImportService.HEADERS.size() - 1));

            var drawing = sheet.createDrawingPatriarch();
            List<ExportPlace> rows = new ArrayList<>(selected);
            for (int index = 0; index < rows.size(); index++) {
                ExportPlace place = rows.get(index);
                var row = sheet.createRow(index + 1);
                for (int column = 0; column < PlaceWorkbookImportService.HEADERS.size(); column++) {
                    row.createCell(column).setCellValue("");
                }
                row.getCell(0).setCellValue(place.name());
                row.getCell(1).setCellValue(place.kindCode());
                row.getCell(2).setCellValue(place.categoryCode());
                set(row, 3, place.parentCode());
                set(row, 4, place.aliases());
                set(row, 5, place.buildingIds());
                set(row, 6, place.zoneCode());
                set(row, 7, place.featureCode());
                if (place.pointLat() != null && place.pointLon() != null) {
                    row.getCell(8).setCellValue(place.pointLat());
                    row.getCell(9).setCellValue(place.pointLon());
                }
                row.getCell(10).setCellValue(place.fromChildren() ? "SI" : "NO");

                if (!includePerspectives) continue;
                List<ExportPerspective> selectedPerspectives = perspectives.getOrDefault(place.id(), List.of());
                for (int perspectiveIndex = 0; perspectiveIndex < selectedPerspectives.size(); perspectiveIndex++) {
                    ExportPerspective perspective = selectedPerspectives.get(perspectiveIndex);
                    int column = BASE_COLUMNS + perspectiveIndex * PERSPECTIVE_COLUMNS;
                    row.getCell(column).setCellValue(perspective.sideCode());
                    row.getCell(column + 1).setCellValue(perspective.lat());
                    row.getCell(column + 2).setCellValue(perspective.lon());
                    row.getCell(column + 3).setCellValue(perspective.headingDeg());
                    if (perspective.photoKey() != null) {
                        int picture = workbook.addPicture(storage.read(perspective.photoKey()), Workbook.PICTURE_TYPE_JPEG);
                        XSSFClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                        anchor.setRow1(index + 1);
                        anchor.setRow2(index + 2);
                        anchor.setCol1(column + 4);
                        anchor.setCol2(column + 5);
                        drawing.createPicture(anchor, picture);
                        row.setHeightInPoints(72);
                    }
                }
            }
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el Excel de exportación de lugares.", e);
        }
    }

    private static void set(org.apache.poi.ss.usermodel.Row row, int column, String value) {
        if (value != null) row.getCell(column).setCellValue(value);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
