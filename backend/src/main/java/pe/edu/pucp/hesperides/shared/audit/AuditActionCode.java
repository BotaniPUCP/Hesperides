package pe.edu.pucp.hesperides.shared.audit;

/**
 * Acciones auditables. Es un enum Java y no un catálogo configurable porque cada
 * valor corresponde a una línea de código concreta que lo emite (SPEC-004 §3.1):
 * un valor que un administrador añadiera desde la UI no lo produciría nadie.
 *
 * Añadir un valor aquí obliga a actualizar la tabla de SPEC-004 §3.2.
 */
public enum AuditActionCode {
    USER_CREATED,
    USER_ROLE_CHANGED,
    USER_DEACTIVATED,
    USER_REACTIVATED,
    /** Añadida por SPEC-100 §9.3: explica meses después por qué alguien nunca pudo entrar. */
    USER_CREDENTIALS_DELIVERY_FAILED,
    /** Añadida por el módulo de administración: quién cambió un parámetro general y de qué a qué. */
    SYSTEM_PARAMETER_CHANGED,
    /** SPEC-104: quién cambió el conjunto de fotos de una especie, y cuántas quedaron. */
    SPECIES_PHOTOS_REPLACED,
    /** SPEC-104: una foto agregada a una especie desde el formulario. */
    SPECIES_PHOTO_ADDED,
    /** Quién registró una nueva especie en el catálogo botánico. */
    SPECIES_CREATED,
    /** SPEC-105: quién corrigió los datos de una especie. */
    SPECIES_UPDATED,
    /** SPEC-105: quién cambió si la altura de una especie decide cómo se atiende, de qué a qué. */
    SPECIES_CRITICALITY_CHANGED,
    /** SPEC-105: quién cambió el promedio de una especie, de qué a qué. */
    SPECIES_REFERENCE_CHANGED,
    /** Catálogo de lugares: quién creó, cambió o dio de baja un lugar, una perspectiva o una foto. */
    PLACE_CREATED,
    PLACE_UPDATED,
    PLACE_DELETED,
    PLACE_PERSPECTIVE_CREATED,
    PLACE_PERSPECTIVE_UPDATED,
    PLACE_PERSPECTIVE_DELETED,
    PLACE_PHOTO_ADDED,
    PLACE_PHOTO_DELETED,
    /** Migración de referencias: quién decidió a qué lugar va cada referencia antigua, o que no es un lugar. */
    PLACE_REFERENCES_LINKED,
    PLACE_REFERENCES_DISCARDED,
    /** SPEC-106: quién creó, cambió o dio de baja una organización del Directorio. */
    ORGANIZATION_CREATED,
    ORGANIZATION_UPDATED,
    ORGANIZATION_DEACTIVATED,
    /** SPEC-106: lo mismo para un contacto; el detalle dice qué campos cambiaron, nunca sus valores. */
    CONTACT_CREATED,
    CONTACT_UPDATED,
    CONTACT_DEACTIVATED,
    /** SPEC-106: a qué organización se vinculó un contacto existente. */
    CONTACT_LINKED,
    /** SPEC-106 §4.3: rol del contacto en una organización (cambio de rol, sin valor). */
    CONTACT_LINK_ROLE_UPDATED,
    /** SPEC-107 D-02b: quién quedó a cargo de una reserva; con los códigos de contacto. */
    GARDEN_RESERVATION_RESPONSIBLE_CHANGED,
    /** SPEC-203: quién creó, cambió o dio de baja un conjunto de áreas verdes, y con cuántos jardines. */
    GREEN_AREA_SET_CREATED,
    GREEN_AREA_SET_UPDATED,
    GREEN_AREA_SET_DELETED,
    /** SPEC-107: quién reservó, editó o anuló un jardín; con el código de la reserva y el del jardín. */
    GARDEN_RESERVATION_CREATED,
    GARDEN_RESERVATION_UPDATED,
    GARDEN_RESERVATION_CANCELLED,
    /** SPEC-107 (enmienda 11 nov 2026): la confirmación de uso del solicitante, de qué a qué. */
    GARDEN_RESERVATION_CONFIRMATION_CHANGED,
    /** SPEC-107 (enmienda 11 nov 2026): la marca de uso del espacio, de qué a qué. */
    GARDEN_RESERVATION_USAGE_CHANGED
}
