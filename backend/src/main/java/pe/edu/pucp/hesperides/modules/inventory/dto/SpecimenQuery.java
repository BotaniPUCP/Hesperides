package pe.edu.pucp.hesperides.modules.inventory.dto;

import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.Locale;
import java.util.Set;

/**
 * Filtros, orden y página del listado de ejemplares, ya validados. El orden es
 * una lista cerrada porque termina en el ORDER BY: nunca se concatena lo que
 * llega del cliente.
 */
public record SpecimenQuery(String search, String location, String sort, boolean descending, int page, int size) {

    public static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> SORTS = Set.of("code", "reference", "location");

    public static SpecimenQuery of(String search, String location, String sort, String direction, int page, int size) {
        String sortKey = sort == null ? "reference" : sort.toLowerCase(Locale.ROOT);
        if (!SORTS.contains(sortKey)) {
            throw new ValidationException("sort must be one of " + SORTS);
        }
        if (direction != null && !direction.equalsIgnoreCase("asc") && !direction.equalsIgnoreCase("desc")) {
            throw new ValidationException("direction must be asc or desc");
        }
        PageRequestCheck.check(page, size);
        return new SpecimenQuery(blankToNull(search), blankToNull(location), sortKey,
                "desc".equalsIgnoreCase(direction), page, size);
    }

    static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }

    /** Los límites de página, compartidos con el listado de especies. */
    public static final class PageRequestCheck {
        private PageRequestCheck() {
        }

        public static void check(int page, int size) {
            if (page < 0) {
                throw new ValidationException("page must be zero or positive");
            }
            if (size < 1 || size > MAX_PAGE_SIZE) {
                throw new ValidationException("size must be between 1 and " + MAX_PAGE_SIZE);
            }
        }
    }
}
