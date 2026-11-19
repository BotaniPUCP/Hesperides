package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.OptionResponse;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.List;

/** Ítems de catálogo que usa el módulo; un código desconocido es un 400, nunca un nulo silencioso. */
@Component @RequiredArgsConstructor
public class IncidentCatalogs {
    public static final String STATUS = "INCIDENT_STATUS";
    public static final String URGENCY = "URGENCY_LEVEL";
    public static final String TYPE = "INCIDENT_TYPE";
    public static final String CLASS = "INCIDENT_CLASS";
    public static final String SOURCE = "INCIDENT_SOURCE";
    public static final String UPDATE_KIND = "INCIDENT_UPDATE_KIND";
    private final CatalogItemsRepository catalogs;

    public CatalogItem required(String type, String code) {
        if (code == null || code.isBlank()) throw new ValidationException("Invalid catalog item");
        return optional(type, code);
    }

    public CatalogItem optional(String type, String code) {
        if (code == null || code.isBlank()) return null;
        return catalogs.findActiveItemByTypeAndCode(type, code)
                .orElseThrow(() -> new ValidationException("Invalid catalog item"));
    }

    public List<CatalogItem> active(String type) {
        return catalogs.findActiveByTypeCode(type);
    }

    public static OptionResponse option(CatalogItem item) {
        return item == null ? null : new OptionResponse(item.getId(), item.getCode(), item.getLabel());
    }

    public static String code(CatalogItem item) {
        return item == null ? null : item.getCode();
    }
}
