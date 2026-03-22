/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/** API error detail */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Pagination query params */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** File upload response */
export interface UploadResponse {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
}
