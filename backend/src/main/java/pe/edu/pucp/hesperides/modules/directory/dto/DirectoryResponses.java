package pe.edu.pucp.hesperides.modules.directory.dto;

import java.util.List;

/** Respuestas del Directorio. El id numérico nunca sale: se identifica por código. */
public final class DirectoryResponses {

    private DirectoryResponses() {
    }

    public record CodeLabel(String code, String label) {
    }

    public record Page<T>(int page, int size, long total, List<T> items) {
    }

    /** {@code active}: una organización dada de baja sigue apareciendo en lo que ya la usaba.
     *  {@code role}: el rol del contacto en esa organización (D-08b), nulo sin rol. */
    public record OrganizationRef(String code, String name, boolean active, String role) {
    }

    public record OrganizationSummary(String code, String name, CodeLabel type, String phone, int contactCount) {
    }

    /** Un contacto de una organización: la ficha muestra su rol (D-08b), nulo sin rol. */
    public record ContactCard(String code, String fullName, String extension, String mobile, String email,
            String role) {
    }

    public record OrganizationDetail(String code, String name, CodeLabel type, String ruc, String phone,
            List<String> aliases, boolean active, List<ContactCard> contacts) {
    }

    public record OrganizationSuggestion(String code, String name) {
    }

    public record ContactSummary(String code, String fullName, String extension, String mobile, String email,
            List<OrganizationRef> organizations) {
    }

    public record ContactDetail(String code, String fullName, String extension, String mobile, String email,
            boolean active, boolean hasActiveOrganization, List<OrganizationRef> organizations) {
    }
}
