import type {
  ApiResponse,
  PaginatedResponse,
  LojaDTO,
  SetorDTO,
  TipoEquipamentoDTO,
  EquipamentoDTO,
} from '@regcheck/shared';

// Em dev, usa o mesmo host que serviu a página (funciona no mobile e no desktop)
// Em prod, usa a variável de ambiente configurada
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser/mobile: usa o mesmo host que está servindo o Next.js
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4000`;
  }
  // SSR / build time
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}

class ApiClient {
  private get baseUrl(): string {
    return getApiUrl();
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // 204 No Content — no body to parse
    if (res.status === 204) {
      return undefined as T;
    }

    // Check if response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Server error: ${res.status} ${res.statusText}`);
    }

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

  batchUpdatePositions(templateId: string, updates: Array<{ id: string; position: Record<string, number>; config?: Record<string, unknown>; scope?: string; slotIndex?: number | null; bindingKey?: string | null }>) {
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

  createDocument(data: { templateId: string; name: string; totalItems?: number }) {
    return this.request<unknown>('/api/documents', { method: 'POST', body: JSON.stringify({ totalItems: 1, ...data }) });
  }

  populateDocument(documentId: string, data: { tipoId: string; lojaId: string }) {
    return this.request<{
      totalItems: number;
      assignments: Array<{
        itemIndex: number;
        setorId: string;
        setorNome: string;
        equipamentoId: string;
        numeroEquipamento: string;
      }>;
    }>(`/api/documents/${documentId}/populate`, { method: 'POST', body: JSON.stringify(data) });
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

  getDocumentStatus(documentId: string) {
    return this.request<{
      status: string;
      generatedPdfKey: string | null;
      job?: { state: string | null; progress: number; failedReason?: string };
    }>(`/api/documents/${documentId}/status`);
  }

  deleteDocument(id: string): Promise<void> {
    return this.request<void>(`/api/documents/${id}`, { method: 'DELETE' });
  }

  // Uploads
  uploadPdf(file: File) {
    return this.upload<{ fileKey: string; pageCount: number; pdfFileId: string }>('/api/uploads/pdf', file);
  }

  uploadImage(file: File, type: 'image' | 'signature' = 'image') {
    return this.upload<{ fileKey: string }>('/api/uploads/image', file, { type });
  }

  // Lojas
  listLojas(page = 1, pageSize = 100) {
    return this.request<PaginatedResponse<LojaDTO>>(`/api/lojas?page=${page}&pageSize=${pageSize}`);
  }

  listActiveLojas() {
    return this.request<LojaDTO[]>('/api/lojas/active');
  }

  createLoja(data: { nome: string }) {
    return this.request<LojaDTO>('/api/lojas', { method: 'POST', body: JSON.stringify(data) });
  }

  updateLoja(id: string, data: { nome?: string; ativo?: boolean }) {
    return this.request<LojaDTO>(`/api/lojas/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  toggleLoja(id: string) {
    return this.request<LojaDTO>(`/api/lojas/${id}/toggle`, { method: 'PATCH' });
  }

  deleteLoja(id: string) {
    return this.request<void>(`/api/lojas/${id}`, { method: 'DELETE' });
  }

  // Setores
  listSetores(page = 1, pageSize = 100) {
    return this.request<PaginatedResponse<SetorDTO>>(`/api/setores?page=${page}&pageSize=${pageSize}`);
  }

  listActiveSetores() {
    return this.request<SetorDTO[]>('/api/setores/active');
  }

  createSetor(data: { nome: string }) {
    return this.request<SetorDTO>('/api/setores', { method: 'POST', body: JSON.stringify(data) });
  }

  updateSetor(id: string, data: { nome?: string; ativo?: boolean }) {
    return this.request<SetorDTO>(`/api/setores/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  toggleSetor(id: string) {
    return this.request<SetorDTO>(`/api/setores/${id}/toggle`, { method: 'PATCH' });
  }

  deleteSetor(id: string) {
    return this.request<void>(`/api/setores/${id}`, { method: 'DELETE' });
  }

  // Tipos Equipamento
  listTipos(page = 1, pageSize = 100) {
    return this.request<PaginatedResponse<TipoEquipamentoDTO>>(`/api/tipos-equipamento?page=${page}&pageSize=${pageSize}`);
  }

  listActiveTipos() {
    return this.request<TipoEquipamentoDTO[]>('/api/tipos-equipamento/active');
  }

  createTipo(data: { nome: string }) {
    return this.request<TipoEquipamentoDTO>('/api/tipos-equipamento', { method: 'POST', body: JSON.stringify(data) });
  }

  updateTipo(id: string, data: { nome?: string; ativo?: boolean }) {
    return this.request<TipoEquipamentoDTO>(`/api/tipos-equipamento/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  toggleTipo(id: string) {
    return this.request<TipoEquipamentoDTO>(`/api/tipos-equipamento/${id}/toggle`, { method: 'PATCH' });
  }

  deleteTipo(id: string) {
    return this.request<void>(`/api/tipos-equipamento/${id}`, { method: 'DELETE' });
  }

  // Equipamentos
  listEquipamentos(page = 1, pageSize = 20, filters?: Record<string, string>) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    }
    return this.request<PaginatedResponse<EquipamentoDTO>>(`/api/equipamentos?${params}`);
  }

  getEquipamento(id: string) {
    return this.request<EquipamentoDTO>(`/api/equipamentos/${id}`);
  }

  createEquipamento(data: {
    lojaId: string;
    setorId: string;
    tipoId: string;
    numeroEquipamento: string;
    serie?: string;
    patrimonio?: string;
    glpiId?: string;
  }) {
    return this.request<EquipamentoDTO>('/api/equipamentos', { method: 'POST', body: JSON.stringify(data) });
  }

  updateEquipamento(id: string, data: Record<string, unknown>) {
    return this.request<EquipamentoDTO>(`/api/equipamentos/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  getImageUrl(key: string) {
    return `${this.baseUrl}/api/uploads/file?key=${encodeURIComponent(key)}`;
  }

  deleteEquipamento(id: string) {
    return this.request<void>(`/api/equipamentos/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
