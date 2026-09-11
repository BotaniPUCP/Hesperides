package pe.edu.pucp.hesperides.modules.users.entity;

/**
 * Metadato del sistema, no un dato de negocio: por eso es un enum Java y no un
 * catálogo configurable (SPEC-100 §4). Un administrador que añadiera un tercer
 * estado desde /admin/catalogs no encontraría código que lo produjera ni lo
 * interpretara.
 *
 * Responde "¿recibió su clave?", que es una pregunta distinta de "¿sigue
 * trabajando aquí?" (is_active). Colapsarlas impediría distinguir un alta
 * fallida de una baja deliberada.
 */
public enum CredentialStatus {
    /** El envío falló; el administrador debe reenviar o entregar por otra vía. */
    PENDING_DELIVERY,
    /** La persona recibió sus credenciales (o el administrador lo declaró). */
    DELIVERED
}
