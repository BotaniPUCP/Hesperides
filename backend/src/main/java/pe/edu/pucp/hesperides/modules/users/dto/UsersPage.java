package pe.edu.pucp.hesperides.modules.users.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Forma Page<T> que SPEC-C03 §5.2 define para el listado: no se serializa el
 * Page de Spring (expone pageable/sort internos y llama "number" al índice);
 * se declara explícitamente el contrato {content, page, size, totalElements,
 * totalPages, first, last}.
 */
public record UsersPage<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last) {

    public static <T> UsersPage<T> from(Page<T> source) {
        return new UsersPage<>(
                source.getContent(),
                source.getNumber(),
                source.getSize(),
                source.getTotalElements(),
                source.getTotalPages(),
                source.isFirst(),
                source.isLast());
    }
}