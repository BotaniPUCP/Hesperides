package pe.edu.pucp.hesperides.modules.planning.sets.service;

import pe.edu.pucp.hesperides.modules.planning.sets.repository.GreenAreaSetQueries.OwnRuleOverlap;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/** Normalización y mensajes de un conjunto (SPEC-203 §3.1), sin Spring ni base de datos. */
public final class GreenAreaSetRules {

    private GreenAreaSetRules() {
    }

    public static String normalizeName(String name) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            throw new BusinessRuleException("El nombre del conjunto es obligatorio");
        }
        return trimmed;
    }

    public static List<Long> distinctIds(Collection<Long> ids, String emptyMessage) {
        List<Long> distinct = ids == null ? List.of() : ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            throw new BusinessRuleException(emptyMessage);
        }
        return distinct;
    }

    /** Como {@link #distinctIds}, pero una lista vacía o ausente es válida. */
    public static List<Long> optionalIds(Collection<Long> ids) {
        return ids == null ? List.of() : ids.stream().filter(Objects::nonNull).distinct().toList();
    }

    public static void rejectAny(List<Long> invalid, String prefix) {
        if (!invalid.isEmpty()) {
            throw new BusinessRuleException(prefix + invalid.stream().map(String::valueOf)
                    .collect(Collectors.joining(", ")));
        }
    }

    /** D-08: un aviso, nunca un bloqueo, cuando un jardín queda bajo dos reglas propias. */
    public static List<String> crossWarnings(List<OwnRuleOverlap> overlaps) {
        return overlaps.stream().map(o -> "La sección " + o.zoneName() + " ya sigue otra frecuencia propia de "
                + o.activityLabel() + " en «" + o.otherSetName() + "»; se usará la más frecuente").toList();
    }
}
