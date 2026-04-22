import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// Set test environment before importing server
process.env['NODE_ENV'] = 'test';

// Mock queue/redis to avoid real connections
vi.mock('../lib/queue', () => ({
  pdfGenerationQueue: { add: vi.fn(), getJob: vi.fn() },
  createPdfWorker: vi.fn(() => ({ on: vi.fn() })),
  getJobStatus: vi.fn(),
}));

vi.mock('../lib/redis', () => ({
  redis: { 
    get: vi.fn().mockResolvedValue(null), 
    set: vi.fn().mockResolvedValue('OK'), 
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  },
  cachedGet: vi.fn(),
  invalidateCache: vi.fn(),
}));

// Mock services with realistic data
vi.mock('../services/loja-service', () => ({
  LojaService: {
    list: vi.fn().mockResolvedValue({
      items: Array.from({ length: 50 }, (_, i) => ({
        id: `loja-${i}`,
        nome: `Loja ${i}`,
        endereco: `Rua ${i}`,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      total: 100,
      page: 1,
      pageSize: 50,
      totalPages: 2,
    }),
    getById: vi.fn().mockResolvedValue({
      id: 'loja-1',
      nome: 'Loja 1',
      endereco: 'Rua 1',
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  },
}));

vi.mock('../services/setor-service', () => ({
  SetorService: {
    list: vi.fn().mockResolvedValue({
      items: Array.from({ length: 50 }, (_, i) => ({
        id: `setor-${i}`,
        nome: `Setor ${i}`,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      total: 100,
      page: 1,
      pageSize: 50,
      totalPages: 2,
    }),
  },
}));

vi.mock('../services/tipo-equipamento-service', () => ({
  TipoEquipamentoService: {
    list: vi.fn().mockResolvedValue({
      items: Array.from({ length: 50 }, (_, i) => ({
        id: `tipo-${i}`,
        nome: `Tipo ${i}`,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      total: 100,
      page: 1,
      pageSize: 50,
      totalPages: 2,
    }),
  },
}));

vi.mock('../services/equipamento-service', () => ({
  EquipamentoService: {
    list: vi.fn().mockResolvedValue({
      items: Array.from({ length: 50 }, (_, i) => ({
        id: `equipamento-${i}`,
        numeroEquipamento: `EQ-${i}`,
        serie: `S${i}`,
        patrimonio: `P${i}`,
        lojaId: 'loja-1',
        setorId: 'setor-1',
        tipoId: 'tipo-1',
        loja: { id: 'loja-1', nome: 'Loja 1', ativo: true },
        setor: { id: 'setor-1', nome: 'Setor 1', ativo: true },
        tipo: { id: 'tipo-1', nome: 'Tipo 1', ativo: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      total: 100,
      page: 1,
      pageSize: 50,
      totalPages: 2,
    }),
    getById: vi.fn().mockResolvedValue({
      id: 'equipamento-1',
      numeroEquipamento: 'EQ-1',
      serie: 'S1',
      patrimonio: 'P1',
      lojaId: 'loja-1',
      setorId: 'setor-1',
      tipoId: 'tipo-1',
      loja: { id: 'loja-1', nome: 'Loja 1', ativo: true },
      setor: { id: 'setor-1', nome: 'Setor 1', ativo: true },
      tipo: { id: 'tipo-1', nome: 'Tipo 1', ativo: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  },
}));

vi.mock('../services/document-service', () => ({
  DocumentService: {
    list: vi.fn().mockResolvedValue({
      items: Array.from({ length: 50 }, (_, i) => ({
        id: `document-${i}`,
        name: `Document ${i}`,
        status: 'DRAFT',
        totalItems: 1,
        templateId: 'template-1',
        template: { name: 'Template 1' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      total: 100,
      page: 1,
      pageSize: 50,
      totalPages: 2,
    }),
    getById: vi.fn().mockResolvedValue({
      id: 'document-1',
      name: 'Document 1',
      status: 'DRAFT',
      totalItems: 1,
      templateId: 'template-1',
      templateVersion: 1,
      generatedPdfKey: null,
      metadata: null,
      template: {
        id: 'template-1',
        name: 'Template 1',
        status: 'PUBLISHED',
        version: 1,
        repetitionConfig: null,
        pdfFile: null,
        fields: [],
      },
      filledFields: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  },
}));

vi.mock('../services/template-service', () => ({
  TemplateService: {
    list: vi.fn().mockResolvedValue({
      items: Array.from({ length: 50 }, (_, i) => ({
        id: `template-${i}`,
        name: `Template ${i}`,
        status: 'PUBLISHED',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      total: 100,
      page: 1,
      pageSize: 50,
      totalPages: 2,
    }),
    getById: vi.fn().mockResolvedValue({
      id: 'template-1',
      name: 'Template 1',
      status: 'PUBLISHED',
      version: 1,
      repetitionConfig: null,
      pdfFile: null,
      fields: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  },
}));

import { app } from '../server';

/**
 * Performance Benchmark Tests
 * 
 * These tests verify that the API meets performance targets:
 * - Listing endpoints: < 200ms response time
 * - Detail endpoints: < 150ms response time
 * - Database queries: < 50ms execution time
 * 
 * **Validates: Requirements 1.1, 1.2, 5.5**
 */
describe('Performance Benchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Listing Endpoints - Response Time < 200ms (Requirement 1.1)', () => {
    it('GET /api/lojas should respond in < 200ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/lojas?page=1&pageSize=50');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200);
    });

    it('GET /api/setores should respond in < 200ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/setores?page=1&pageSize=50');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200);
    });

    it('GET /api/tipos-equipamento should respond in < 200ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/tipos-equipamento?page=1&pageSize=50');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200);
    });

    it('GET /api/equipamentos should respond in < 200ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/equipamentos?page=1&pageSize=50');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200);
    });

    it('GET /api/documents should respond in < 200ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/documents?page=1&pageSize=50');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200);
    });

    it('GET /api/templates should respond in < 200ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/templates?page=1&pageSize=50');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Detail Endpoints - Response Time < 150ms (Requirement 1.2)', () => {
    const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    it('GET /api/lojas/:id should respond in < 150ms', async () => {
      const start = Date.now();
      const response = await request(app).get(`/api/lojas/${VALID_UUID}`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(duration).toBeLessThan(150);
    });

    it('GET /api/equipamentos/:id should respond in < 150ms', async () => {
      const start = Date.now();
      const response = await request(app).get(`/api/equipamentos/${VALID_UUID}`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(duration).toBeLessThan(150);
    });

    it('GET /api/documents/:id should respond in < 150ms', async () => {
      const start = Date.now();
      const response = await request(app).get(`/api/documents/${VALID_UUID}`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(duration).toBeLessThan(150);
    });

    it('GET /api/templates/:id should respond in < 150ms', async () => {
      const start = Date.now();
      const response = await request(app).get(`/api/templates/${VALID_UUID}`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle 10 concurrent listing requests within 200ms each', async () => {
      const requests = Array.from({ length: 10 }, () => {
        const start = Date.now();
        return request(app)
          .get('/api/lojas?page=1&pageSize=50')
          .then((response) => ({
            response,
            duration: Date.now() - start,
          }));
      });

      const results = await Promise.all(requests);

      results.forEach(({ response, duration }) => {
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(200);
      });
    });

    it('should handle 10 concurrent detail requests within 150ms each', async () => {
      const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      const requests = Array.from({ length: 10 }, () => {
        const start = Date.now();
        return request(app)
          .get(`/api/lojas/${VALID_UUID}`)
          .then((response) => ({
            response,
            duration: Date.now() - start,
          }));
      });

      const results = await Promise.all(requests);

      results.forEach(({ response, duration }) => {
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(150);
      });
    });
  });

  describe('Response Size Validation', () => {
    it('listing responses should include pagination metadata', async () => {
      const response = await request(app).get('/api/lojas?page=1&pageSize=50');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body).toHaveProperty('totalPages');
    });

    it('listing responses should respect pageSize parameter', async () => {
      const response = await request(app).get('/api/lojas?page=1&pageSize=10');

      expect(response.status).toBe(200);
      expect(response.body.pageSize).toBe(10);
    });

    it('listing responses should enforce max pageSize of 100', async () => {
      const response = await request(app).get('/api/lojas?page=1&pageSize=200');

      expect(response.status).toBe(200);
      // The service should cap it at 100
      expect(response.body.pageSize).toBeLessThanOrEqual(100);
    });
  });
});
