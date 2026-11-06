package pe.edu.pucp.hesperides.modules.reports.dto;

import java.util.List;

/**
 * A list with a fixed cap and its exact total (SPEC-202 D-11). It is a board,
 * not a paginated listing, so it does not use {@code Page<T>}.
 */
public record TopList<T>(long total, List<T> items) {

    public static <T> TopList<T> of(List<T> all, int cap) {
        return new TopList<>(all.size(), List.copyOf(all.subList(0, Math.min(cap, all.size()))));
    }
}
