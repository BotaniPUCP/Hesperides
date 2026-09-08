package pe.edu.pucp.hesperides.modules.auth.entity;

/**
 * Estado de entrega de las credenciales (SPEC-100 §2.6). Es metadato del
 * sistema, no un catálogo: un tercer estado que un administrador agregara desde
 * la UI de catálogos no tendría ningún código que lo produjera ni interpretara.
 */
public enum CredentialStatus {
    PENDING_DELIVERY,
    DELIVERED
}