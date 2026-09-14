package pe.edu.pucp.hesperides.migration;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * La numeracion de migraciones es cronologica y sin huecos (REGLAS.md §4): cada
 * migracion nueva toma el siguiente numero libre y va al final.
 *
 * Esta invariante es lo que permite dejar out-of-order en false. Un hueco o un
 * numero repetido significa que alguien reservo por adelantado o reutilizo una
 * version ya publicada, y ambas cosas rompen Flyway en las bases existentes.
 * No necesita base de datos: solo mira los nombres de archivo.
 */
class MigrationNumberingTest {

    private static final Pattern VERSIONED = Pattern.compile("^V(\\d+)__.+\\.sql$");

    private List<Integer> migrationNumbers() throws IOException {
        Resource[] found = new PathMatchingResourcePatternResolver()
                .getResources("classpath:db/migration/*.sql");

        return java.util.Arrays.stream(found)
                .map(Resource::getFilename)
                .map(VERSIONED::matcher)
                .filter(Matcher::matches)
                .map(m -> Integer.parseInt(m.group(1)))
                .sorted()
                .toList();
    }

    @Test
    void migrationsAreNumberedSequentiallyFromOneWithNoGaps() throws IOException {
        List<Integer> numbers = migrationNumbers();

        assertThat(numbers).isNotEmpty();
        assertThat(numbers).containsExactlyElementsOf(
                IntStream.rangeClosed(1, numbers.size()).boxed().toList());
    }

    @Test
    void noVersionNumberIsUsedTwice() throws IOException {
        List<Integer> numbers = migrationNumbers();

        assertThat(numbers).doesNotHaveDuplicates();
    }
}
