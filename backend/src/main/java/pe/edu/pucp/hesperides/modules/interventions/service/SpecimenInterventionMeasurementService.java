package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Cruce inteligente y biofísico de Especie × Tipo de Intervención:
 * Proyecta y actualiza automáticamente las medidas dendrométricas cuando
 * se ejecuta o valida una intervención de poda sobre un ejemplar censado.
 *
 * Mapeo biológico integral:
 * 1. PALM (Palmeras): Crecimiento monopodial apical. El meristemo y la altura
 *    NUNCA se podan. La poda solo retira frondas basales senescentes o enfermas (reducción mínima de copa 5-10%).
 * 2. TREE (Árboles): Dicotiledóneas y coníferas. Las podas de formación/mantenimiento/sanitaria
 *    solo reducen copa lateral (10-15%). Únicamente el despeje de interferencia reduce altura moderadamente (10%).
 * 3. SHRUB / HEDGE (Arbustos y Cercos): Ramificación basal densa que tolera rebaje de copa (15-25%) y altura (10-20%).
 * 4. CLIMBER / OTRAS (Trepadoras / Cubresuelos): Control de expansión lateral (20%) y rebaje (15%).
 *
 * En todos los casos:
 * - El DAP (diámetro del tronco) permanece inalterado.
 * - La altura del fuste se conserva.
 * - Se respeta un umbral biológico mínimo de copa (0.50 m).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpecimenInterventionMeasurementService {

    private final NamedParameterJdbcTemplate jdbc;

    public record PruningFactor(
            BigDecimal crownRatioReduction,
            BigDecimal heightRatioReduction,
            String label,
            String explanation
    ) {}

    /**
     * Resuelve los coeficientes de reducción dendrométrica según el cruce exacto:
     * Tipo de Intervención × Tipo de Vegetación/Especie.
     */
    public static PruningFactor getFactor(String interventionTypeCode, String speciesTypeCode) {
        String itCode = interventionTypeCode != null ? interventionTypeCode : "PODA_MANTENIMIENTO";
        String spCode = speciesTypeCode != null ? speciesTypeCode : "TREE";

        // 1. PALMERAS:
        // Las palmeras tienen un estípite columnar con penacho apical.
        // No tienen ramificación lateral ni yemas axilares. Cortar el ápice mataría la palmera.
        // Por ello, la altura NUNCA se reduce en ninguna poda. Solo se cortan frondas inferiores.
        if ("PALM".equals(spCode)) {
            return switch (itCode) {
                case "PODA_SANITARIA" -> new PruningFactor(
                        new BigDecimal("0.08"), BigDecimal.ZERO,
                        "Poda sanitaria en palmera",
                        "Retiro de frondas enfermas o infectadas. Altura y estípite protegidos sin corte"
                );
                case "PODA_DESPEJE" -> new PruningFactor(
                        new BigDecimal("0.10"), BigDecimal.ZERO,
                        "Poda de despeje en palmera",
                        "Recorte de frondas basales en interferencia con vías o cables. Altura intacta"
                );
                case "PODA_FORMACION" -> new PruningFactor(
                        BigDecimal.ZERO, BigDecimal.ZERO,
                        "Poda de formación en palmera",
                        "No aplicable corte estructural a palmeras (crecimiento apical no ramificado)"
                );
                default -> new PruningFactor(
                        new BigDecimal("0.05"), BigDecimal.ZERO,
                        "Poda de mantenimiento en palmera",
                        "Retiro de hojas secas o senescentes. Altura conservada"
                );
            };
        }

        // 2. ARBUSTOS Y SETOS / CERCOS VIVOS:
        // Crecimiento leñoso ramificado desde la base que admite podas de rebaje y perfilado frecuentes.
        if ("SHRUB".equals(spCode) || "HEDGE".equals(spCode)) {
            return switch (itCode) {
                case "PODA_FORMACION" -> new PruningFactor(
                        new BigDecimal("0.15"), new BigDecimal("0.10"),
                        "Poda de formación en arbusto",
                        "Perfilado morfológico y balance de ramas tiernas"
                );
                case "PODA_SANITARIA" -> new PruningFactor(
                        new BigDecimal("0.20"), new BigDecimal("0.15"),
                        "Poda sanitaria en arbusto",
                        "Saneamiento y retiro de madera muerta o enferma"
                );
                case "PODA_DESPEJE" -> new PruningFactor(
                        new BigDecimal("0.25"), new BigDecimal("0.20"),
                        "Poda de despeje en arbusto",
                        "Rebaje integral para recuperar visibilidad o paso peatonal"
                );
                default -> new PruningFactor(
                        new BigDecimal("0.20"), new BigDecimal("0.10"),
                        "Poda de mantenimiento en arbusto",
                        "Recorte periódico de rebrotes para control de volumen"
                );
            };
        }

        // 3. TREPADORAS, CUBRESUELOS Y OTRAS ESPECIES:
        if ("CLIMBER".equals(spCode) || "GROUNDCOVER".equals(spCode) || "HERB".equals(spCode)) {
            return new PruningFactor(
                    new BigDecimal("0.20"), new BigDecimal("0.15"),
                    "Poda de control vegetal",
                    "Control de desborde y mantenimiento de follaje perimetral"
            );
        }

        // 4. ÁRBOLES (TREE o tipo estándar):
        // La altura del ápice dominante solo se interviene en podas de despeje/reducción aérea.
        return switch (itCode) {
            case "PODA_FORMACION" -> new PruningFactor(
                    new BigDecimal("0.10"), BigDecimal.ZERO,
                    "Poda de formación en árbol",
                    "Corrección de horquillas y balance lateral sin recortar ápice rector"
            );
            case "PODA_SANITARIA" -> new PruningFactor(
                    new BigDecimal("0.15"), BigDecimal.ZERO,
                    "Poda sanitaria en árbol",
                    "Eliminación selectiva de ramas secas, quebradas o atacadas por plagas"
            );
            case "PODA_DESPEJE" -> new PruningFactor(
                    new BigDecimal("0.20"), new BigDecimal("0.10"),
                    "Poda de despeje y reducción en árbol",
                    "Reducción de ramas de interferencia aérea con tendido eléctrico o gálibo vial"
            );
            default -> new PruningFactor(
                    new BigDecimal("0.15"), BigDecimal.ZERO,
                    "Poda de mantenimiento en árbol",
                    "Raleo de chupones y ramas cruzadas conservando la altura total"
            );
        };
    }

    @Transactional
    public void applyInterventionEstimation(Long interventionId, Long locationId, Long actorUserId) {
        try {
            // 1. Obtener detalles de la intervención y su clase/tipo
            List<Map<String, Object>> rows = jdbc.queryForList("""
                    SELECT i.id, i.code AS intervention_code, i.scheduled_date,
                           ci_class.code AS class_code, ci_class.label AS class_label,
                           ci_type.code AS type_code, ci_type.label AS type_label
                      FROM interventions i
                      JOIN catalog_items ci_class ON ci_class.id = i.intervention_class_item_id
                      LEFT JOIN catalog_items ci_type ON ci_type.id = i.intervention_type_item_id
                     WHERE i.id = :interventionId
                    """, new MapSqlParameterSource("interventionId", interventionId));

            if (rows.isEmpty()) return;
            Map<String, Object> itRow = rows.get(0);
            String classCode = (String) itRow.get("class_code");
            if (!"PODA".equals(classCode)) {
                // Solo las intervenciones de la clase PODA alteran las dimensiones físicas del ejemplar
                return;
            }

            String interventionTypeCode = (String) itRow.get("type_code");
            String typeLabel = (String) itRow.get("type_label");
            String interventionCode = (String) itRow.get("intervention_code");
            LocalDate scheduledDate = ((java.sql.Date) itRow.get("scheduled_date")).toLocalDate();

            // 2. Obtener los ejemplares vinculados con su tipo biológico de especie
            List<Map<String, Object>> elements = jdbc.queryForList("""
                    SELECT g.id, g.code, g.height_m, g.trunk_height_m, g.dbh_cm, g.crown_radius_m, g.is_banded,
                           s.common_name, s.scientific_name,
                           ci_veg.code AS species_type_code, ci_veg.label AS species_type_label
                      FROM intervention_elements ie
                      JOIN green_elements g ON g.id = ie.green_element_id
                      LEFT JOIN species s ON s.id = g.species_id
                      LEFT JOIN catalog_items ci_veg ON ci_veg.id = s.species_type_item_id
                     WHERE ie.intervention_location_id = :locationId
                       AND ie.deleted_at IS NULL
                       AND g.deleted_at IS NULL
                    """, new MapSqlParameterSource("locationId", locationId));

            for (Map<String, Object> el : elements) {
                Long elementId = ((Number) el.get("id")).longValue();
                String specimenCode = (String) el.get("code");
                BigDecimal currentCrown = (BigDecimal) el.get("crown_radius_m");
                BigDecimal currentHeight = (BigDecimal) el.get("height_m");
                BigDecimal currentTrunk = (BigDecimal) el.get("trunk_height_m");
                BigDecimal currentDbh = (BigDecimal) el.get("dbh_cm");
                Boolean banded = (Boolean) el.get("is_banded");

                String speciesName = (String) el.get("common_name");
                if (speciesName == null) speciesName = (String) el.get("scientific_name");
                if (speciesName == null) speciesName = "Ejemplar";

                String speciesTypeCode = (String) el.get("species_type_code");

                if (currentCrown == null && currentHeight == null) {
                    continue; // Sin medidas previas que proyectar
                }

                // Obtener los factores biológicos calculados del cruce Intervención × Especie
                PruningFactor factor = getFactor(interventionTypeCode, speciesTypeCode);

                // Calcular nuevas dimensiones bajo los umbrales del cruce
                BigDecimal newCrown = currentCrown;
                if (currentCrown != null && factor.crownRatioReduction().compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal reduction = currentCrown.multiply(factor.crownRatioReduction());
                    newCrown = currentCrown.subtract(reduction).setScale(2, RoundingMode.HALF_UP);
                    if (newCrown.compareTo(new BigDecimal("0.50")) < 0) {
                        newCrown = new BigDecimal("0.50"); // Mínimo biológico razonable
                    }
                }

                BigDecimal newHeight = currentHeight;
                if (currentHeight != null && factor.heightRatioReduction().compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal reduction = currentHeight.multiply(factor.heightRatioReduction());
                    newHeight = currentHeight.subtract(reduction).setScale(2, RoundingMode.HALF_UP);
                    // Proteger que la altura no sea menor a la altura del fuste
                    if (currentTrunk != null && newHeight.compareTo(currentTrunk) <= 0) {
                        newHeight = currentTrunk.add(new BigDecimal("0.50"));
                    }
                }

                int crownPct = factor.crownRatioReduction().multiply(new BigDecimal("100")).intValue();
                int heightPct = factor.heightRatioReduction().multiply(new BigDecimal("100")).intValue();

                String reductionSummary;
                if (crownPct > 0 && heightPct > 0) {
                    reductionSummary = String.format("Reducción de copa estimada de %d%% y altura de %d%%", crownPct, heightPct);
                } else if (crownPct > 0) {
                    reductionSummary = String.format("Reducción de copa estimada de %d%% (altura conservada)", crownPct);
                } else {
                    reductionSummary = "Sin alteración dimensional proyectada";
                }

                String note = String.format(
                        "Estimación por labor técnica tras %s (%s). %s (%s) para %s.",
                        interventionCode,
                        typeLabel != null ? typeLabel : factor.label(),
                        reductionSummary,
                        factor.explanation(),
                        speciesName
                );

                // Insertar en historial de mediciones
                jdbc.update("""
                        INSERT INTO green_element_measurements
                            (green_element_id, measured_at, measured_by_user_id, height_m, trunk_height_m, dbh_cm, crown_radius_m, is_banded, notes)
                        VALUES
                            (:elementId, :measuredAt, :userId, :height, :trunk, :dbh, :crown, :banded, :notes)
                        """, new MapSqlParameterSource()
                        .addValue("elementId", elementId)
                        .addValue("measuredAt", java.sql.Date.valueOf(scheduledDate))
                        .addValue("userId", actorUserId)
                        .addValue("height", newHeight)
                        .addValue("trunk", currentTrunk)
                        .addValue("dbh", currentDbh)
                        .addValue("crown", newCrown)
                        .addValue("banded", banded)
                        .addValue("notes", note));

                // Actualizar dimensiones vigentes en green_elements
                jdbc.update("""
                        UPDATE green_elements
                           SET height_m = :height,
                               trunk_height_m = :trunk,
                               dbh_cm = :dbh,
                               crown_radius_m = :crown,
                               is_banded = :banded,
                               data_source = 'MEASURED',
                               measured_at = :measuredAt,
                               measured_by_user_id = :userId,
                               updated_at = NOW()
                         WHERE id = :elementId
                        """, new MapSqlParameterSource()
                        .addValue("elementId", elementId)
                        .addValue("height", newHeight)
                        .addValue("trunk", currentTrunk)
                        .addValue("dbh", currentDbh)
                        .addValue("crown", newCrown)
                        .addValue("banded", banded)
                        .addValue("measuredAt", java.sql.Date.valueOf(scheduledDate))
                        .addValue("userId", actorUserId));

                log.info("Estimación biofísica de poda aplicada a {} ({}) tras {}: copa {}m -> {}m, altura {}m -> {}m",
                        specimenCode, speciesName, interventionCode, currentCrown, newCrown, currentHeight, newHeight);
            }
        } catch (Exception ex) {
            log.error("Error aplicando proyección de medidas por poda para intervención {}", interventionId, ex);
        }
    }
}
