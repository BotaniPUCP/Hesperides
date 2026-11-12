package pe.edu.pucp.hesperides.modules.places.repository;

import java.sql.Array;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;

/** Convierte un arreglo de PostgreSQL en una lista de Java. */
final class SqlArrays {

    private SqlArrays() {
    }

    static List<Long> longs(Array array) throws SQLException {
        if (array == null) {
            return List.of();
        }
        return Arrays.stream((Object[]) array.getArray()).map(value -> ((Number) value).longValue()).toList();
    }
}
