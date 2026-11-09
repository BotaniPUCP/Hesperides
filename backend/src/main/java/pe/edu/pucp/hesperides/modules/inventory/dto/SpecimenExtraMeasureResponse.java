package pe.edu.pucp.hesperides.modules.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** El último valor registrado de una medida adicional en un ejemplar, con su fecha. */
public record SpecimenExtraMeasureResponse(String code, String label, String unitCode, BigDecimal value, LocalDate measuredAt) {
}
