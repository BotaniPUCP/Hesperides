package pe.edu.pucp.hesperides.modules.reports.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class ReportsConfig {

    /**
     * The reports compute "this week" and "last closed month" from a clock that
     * tests can fix. UTC on purpose: the civil date always comes from the
     * configured zone, never from the machine's.
     */
    @Bean
    public Clock reportsClock() {
        return Clock.systemUTC();
    }
}
