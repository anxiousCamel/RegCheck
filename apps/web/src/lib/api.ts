import type { ApiResponse, PaginatedResponse } from '@regcheck/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const body = (await res.json()) as ApiResponse<T>;

    if (!body.success || !res.ok) {
      throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
    }

    return body.data as T;
  }

  /** Upload a file (multipart) */
  async upload<T>(path: string, file: File, extraParams?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const queryParams = extraParams ? '?' + new URLSearchParams(extraParams).toString() : '';
    const res = await fetch(`${this.baseUrl}${path}${queryParams}`, {
      method: 'POST',
      body: formData,
    });

    const body = (await res.json()) as ApiResponse<T>;
    if (!body.success) throw new Error(body.error?.message ?? 'Upload failed');
    return body.data as T;
  }

  // Templates
  listTemplates(page = 1, pageSize = 20) {
    return this.request<PaginatedResponse<unknown>>(`/api/templates?page=${page}&pageSize=${pageSize}`);
  }

  getTemplate(id: string) {
    return this.request<unknown>(`/api/templates/${id}`);
  }

  createTemplate(data: { name: string; description?: string; pdfFileKey: string }) {
    return this.request<unknown>('/api/templates', { method: 'POST', body: JSON.stringify(data) });
  }

  updateTemplate(id: string, data: Record<string, unknown>) {
    return this.request<unknown>(`/api/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  publishTemplate(id: string) {
    return this.request<unknown>(`/api/templates/${id}/publish`, { method: 'POST', body: JSON.stringify({ confirm: true }) });
  }

  deleteTemplate(id: string) {
    return this.request<void>(`/api/templates/${id}`, { method: 'DELETE' });
  }

  // Fields
  createField(templateId: string, data: Record<string, unknown>) {
    return this.request<unknown>(`/api/templates/${templateId}/fields`, { method: 'POST', body: JSON.stringify(data) });
  }

  updateField(templateId: string, fieldId: string, data: Record<string, unknown>) {
    return this.request<unknown>(`/api/templates/${templateId}/fields/${fieldId}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  deleteField(templateId: string, fieldId: string) {
    return this.request<void>(`/api/templates/${templateId}/fields/${fieldId}`, { method: 'DELETE' });
  }

  batchUpdatePositions(templateId: string, updates: Array<{ id: string; position: Record<string, number> }>) {
    return this.request<void>(`/api/templates/${templateId}/fields/batch-positions`, {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  }

  // Documents
  listDocuments(page = 1, pageSize = 20) {
    return this.request<PaginatedResponse<unknown>>(`/api/documents?page=${page}&pageSize=${pageSize}`);
  }

  getDocument(id: string) {
    return this.request<unknown>(`/api/documents/${id}`);
  }

  createDocument(data: { templateId: string; name: string; totalItems: number }) {
    return this.request<unknown>('/api/documents', { method: 'POST', body: JSON.stringify(data) });
  }

  saveFilledData(documentId: string, fields: Array<Record<string, unknown>>) {
    return this.request<void>(`/api/documents/${documentId}/fill`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    });
  }

  generatePdf(documentId: string) {
    return this.request<{ message: string }>(`/api/documents/${documentId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
  }

  getDownloadUrl(documentId: string) {
    return this.request<{ downloadUrl: string }>(`/api/documents/${documentId}/download`);
  }

  // Uploads
  uploadPdf(file: File) {
    return this.upload<{ fileKey: string; pageCount: number; pdfFileId: string }>('/api/uploads/pdf', file);
  }

  uploadImage(file: File, type: 'image' | 'signature' = 'image') {
    return this.upload<{ fileKey: string }>('/api/uploads/image', file, { type });
  }
}

export const api = new ApiClient(API_URL);
