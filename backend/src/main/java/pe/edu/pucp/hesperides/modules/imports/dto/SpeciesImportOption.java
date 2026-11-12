package pe.edu.pucp.hesperides.modules.imports.dto;

/** A catalog species that can be linked to a source name during specimen import. */
public record SpeciesImportOption(String slug, String scientificName, String commonName,
                                  String vegetationTypeName, boolean active) {
}
