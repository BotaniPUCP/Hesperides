package pe.edu.pucp.hesperides.modules.directory.repository;

/** Lo que devuelve un alta: el id para seguir trabajando y el código para la respuesta. */
public record Created(long id, String code) {
}
