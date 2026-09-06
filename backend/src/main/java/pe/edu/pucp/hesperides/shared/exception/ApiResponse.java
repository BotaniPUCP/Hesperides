package pe.edu.pucp.hesperides.shared.exception;

/**
 * Standard response envelope for every endpoint, successful or failed.
 * The HTTP status code always accompanies this envelope: never return 200 on error.
 */
public class ApiResponse<T> {

    private final boolean ok;
    private final String message;
    private final T data;

    private ApiResponse(boolean ok, String message, T data) {
        this.ok = ok;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }

    /** Error envelope that still carries a payload, such as field validation errors. */
    public static <T> ApiResponse<T> errorWithData(String message, T data) {
        return new ApiResponse<>(false, message, data);
    }

    public boolean isOk() {
        return ok;
    }

    public String getMessage() {
        return message;
    }

    public T getData() {
        return data;
    }
}
