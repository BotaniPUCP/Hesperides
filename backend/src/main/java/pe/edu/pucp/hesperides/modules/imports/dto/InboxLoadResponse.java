package pe.edu.pucp.hesperides.modules.imports.dto;

import java.util.List;

/**
 * El resultado de cargar la bandeja (SPEC-104 §3). {@code remaining} son las
 * fotos que siguen en la bandeja: las fallidas, que no se borran.
 */
public record InboxLoadResponse(int loaded, int species, List<Failure> failures, int remaining) {

    public record Failure(String file, String reason) {
    }
}
