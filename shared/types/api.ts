/** Standard response envelope returned by every backend endpoint. */
export interface ApiResponse<T> {
  ok: boolean;
  message: string;
  data: T | null;
}

/** Paginated payload. Always travels inside ApiResponse.data. */
export interface Page<T> {
  content: T[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface FieldError {
  field: string;
  message: string;
}

/** Shape of ApiResponse.data on a 400 validation failure. */
export interface ValidationErrors {
  errors: FieldError[];
}
