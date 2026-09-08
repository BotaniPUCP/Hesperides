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

/**
 * Shape of ApiResponse.data on a users listing (SPEC-100 §3, GET /users).
 * The backend serializes this flat shape (not the nested Page<T> above).
 */
export interface UsersPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface FieldError {
  field: string;
  message: string;
}

/** Shape of ApiResponse.data on a 400 validation failure. */
export interface ValidationErrors {
  errors: FieldError[];
}
