package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.PreparedStatement;

/** Allocates permanent public slugs; the unique database index is the final guard. */
@Component
@RequiredArgsConstructor
public class SpeciesSlugAllocator {

    private final JdbcTemplate jdbc;

    /** Must run inside the transaction that inserts the species. */
    public String allocate(String baseSlug) {
        lockAllocator();
        int suffix = 1;
        String candidate;
        do {
            candidate = candidate(baseSlug, suffix);
            if (!Boolean.TRUE.equals(jdbc.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM species WHERE slug = ?)", Boolean.class, candidate))) {
                return candidate;
            }
            suffix++;
        } while (true);
    }

    private static String candidate(String baseSlug, int suffix) {
        String tail = suffix == 1 ? "" : "-" + suffix;
        int retained = Math.min(baseSlug.length(), 150 - tail.length());
        String prefix = baseSlug.substring(0, retained).replaceAll("-+$", "");
        if (prefix.isEmpty()) {
            throw new IllegalArgumentException("Species slug cannot be shortened to a valid identifier");
        }
        return prefix + tail;
    }

    private void lockAllocator() {
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            try (PreparedStatement statement = connection.prepareStatement("SELECT pg_advisory_xact_lock(472910, 103)")) {
                statement.execute();
            }
            return null;
        });
    }
}
