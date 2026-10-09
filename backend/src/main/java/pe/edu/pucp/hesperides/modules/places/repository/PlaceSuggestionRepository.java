package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.places.SuggestionCandidate;

/** Parecido de nombres (pg_trgm) y distancia de cada lugar a un punto: la materia prima de las sugerencias. */
@Repository
@RequiredArgsConstructor
public class PlaceSuggestionRepository {

    /**
     * {@code word_similarity} además de {@code similarity}: «civil» casi no se
     * parece a «Facultad de Ingeniería Civil» entero, pero está contenido en él.
     */
    private static final String CANDIDATES = """
            SELECT p.id, p.name,
                   GREATEST(similarity(unaccent(lower(p.name)), :text), word_similarity(:text, unaccent(lower(p.name))),
                            COALESCE((SELECT max(GREATEST(similarity(unaccent(lower(a.alias)), :text),
                                                          word_similarity(:text, unaccent(lower(a.alias)))))
                                        FROM place_aliases a WHERE a.place_id = p.id AND a.deleted_at IS NULL), 0)) AS sim,
                   (SELECT ST_Distance(o.geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography)
                      FROM place_outlines o WHERE o.place_id = p.id AND o.geom IS NOT NULL) AS dist
              FROM places p WHERE p.deleted_at IS NULL""";

    private final NamedParameterJdbcTemplate jdbc;

    /** @param text ya normalizado: minúsculas y sin tildes */
    public List<SuggestionCandidate> candidates(String text, double lat, double lon) {
        MapSqlParameterSource params = new MapSqlParameterSource("text", text).addValue("lat", lat).addValue("lon", lon);
        return jdbc.query(CANDIDATES, params, (rs, i) -> new SuggestionCandidate(rs.getLong("id"), rs.getString("name"),
                rs.getDouble("sim"), rs.getObject("dist", Double.class)));
    }
}
