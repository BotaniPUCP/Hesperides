package pe.edu.pucp.hesperides.modules.inventory.dto;

/** Una medida adicional del catálogo; {@code referenceNote} solo existe al pertenecer a una especie. */
public record ExtraMeasureResponse(String code, String label, String unitCode, String referenceNote) {
}
