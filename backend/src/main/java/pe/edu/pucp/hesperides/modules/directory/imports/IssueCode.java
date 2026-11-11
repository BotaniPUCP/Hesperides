package pe.edu.pucp.hesperides.modules.directory.imports;

/** Los motivos por los que una fila del registro masivo no se puede crear. */
public enum IssueCode {
    REQUIRED,
    UNKNOWN_TYPE,
    RUC_FORMAT,
    RUC_NOT_FOR_UNIT,
    RUC_TAKEN,
    NAME_TAKEN,
    DUPLICATED_IN_FILE,
    EXTENSION_FORMAT,
    MOBILE_FORMAT,
    EMAIL_FORMAT,
    TOO_LONG,
    /** SPEC-106 §4.3: más roles que organizaciones en la fila de contactos. */
    ROLES_TOO_MANY
}
