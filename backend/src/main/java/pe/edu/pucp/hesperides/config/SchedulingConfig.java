package pe.edu.pucp.hesperides.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Activa las tareas programadas (hoy, la limpieza diaria de fotos dadas de baja). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
