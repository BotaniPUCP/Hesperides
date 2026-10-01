package pe.edu.pucp.hesperides.modules.inventory.repository;

import java.util.List;

/** Una especie tal como sale de la base, con la foto original de uno de sus ejemplares. */
public record SpeciesRow(String slug, String scientificName, String commonName, List<String> otherNames,
                         String family, String typeCode, String typeLabel, long specimenCount, String photoUrl) {
}
