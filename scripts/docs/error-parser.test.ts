/**
 * Unit tests for Error Parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseErrorCodes,
  groupErrorsByStatus,
  getErrorCodes,
  getErrorByCode,
} from './error-parser';
import * as path from 'path';

describe('Error Parser', () => {
  const routesDir = path.join(__dirname, '../../apps/api/src/routes');
  const servicesDir = path.join(__dirname, '../../apps/api/src/services');
  const errorHandlerPath = path.join(__dirname, '../../apps/api/src/middleware/error-handler.ts');

  describe('parseErrorCodes', () => {
    it('should return standardized ParserOutput format', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      expect(output).toHaveProperty('source');
      expect(output).toHaveProperty('generatedAt');
      expect(output).toHaveProperty('data');

      expect(output.source).toBe('error-code-parser');
      expect(output.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
      expect(Array.isArray(output.data)).toBe(true);
    });

    it('should extract VALIDATION_ERROR from error handler', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const validationError = output.data.find((e) => e.code === 'VALIDATION_ERROR');
      expect(validationError).toBeDefined();
      expect(validationError?.httpStatus).toBe(400);
      expect(validationError?.message).toContain('validation');
    });

    it('should extract INTERNAL_ERROR from error handler', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const internalError = output.data.find((e) => e.code === 'INTERNAL_ERROR');
      expect(internalError).toBeDefined();
      expect(internalError?.httpStatus).toBe(500);
    });

    it('should extract NOT_FOUND errors from service files', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const notFoundError = output.data.find((e) => e.code === 'NOT_FOUND');
      expect(notFoundError).toBeDefined();
      expect(notFoundError?.httpStatus).toBe(404);
    });

    it('should extract TEMPLATE_NOT_PUBLISHED error', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const error = output.data.find((e) => e.code === 'TEMPLATE_NOT_PUBLISHED');
      expect(error).toBeDefined();
      expect(error?.httpStatus).toBe(400);
      expect(error?.message).toContain('published');
    });

    it('should extract TEMPLATE_PUBLISHED error', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const error = output.data.find((e) => e.code === 'TEMPLATE_PUBLISHED');
      expect(error).toBeDefined();
      expect(error?.httpStatus).toBe(400);
    });

    it('should extract file upload errors', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const fileTooLarge = output.data.find((e) => e.code === 'FILE_TOO_LARGE');
      expect(fileTooLarge).toBeDefined();
      expect(fileTooLarge?.httpStatus).toBe(400);

      const invalidFileType = output.data.find((e) => e.code === 'INVALID_FILE_TYPE');
      expect(invalidFileType).toBeDefined();
      expect(invalidFileType?.httpStatus).toBe(400);
    });

    it('should extract IN_USE error for resources with dependencies', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const inUseError = output.data.find((e) => e.code === 'IN_USE');
      expect(inUseError).toBeDefined();
      expect(inUseError?.httpStatus).toBe(409);
    });

    it('should extract NO_EQUIPMENT error', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const error = output.data.find((e) => e.code === 'NO_EQUIPMENT');
      expect(error).toBeDefined();
      expect(error?.httpStatus).toBe(400);
    });

    it('should extract ALREADY_GENERATING error', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const error = output.data.find((e) => e.code === 'ALREADY_GENERATING');
      expect(error).toBeDefined();
      expect(error?.httpStatus).toBe(409);
    });

    it('should include source file for each error', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      for (const error of output.data) {
        expect(error.sourceFile).toBeTruthy();
        expect(typeof error.sourceFile).toBe('string');
      }
    });

    it('should extract context when available', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const notFoundError = output.data.find((e) => e.code === 'NOT_FOUND');
      expect(notFoundError?.context).toBeTruthy();
    });

    it('should return errors sorted by code', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const codes = output.data.map((e) => e.code);
      const sortedCodes = [...codes].sort();

      expect(codes).toEqual(sortedCodes);
    });

    it('should not have duplicate error codes', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const codes = output.data.map((e) => e.code);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });
  });

  describe('groupErrorsByStatus', () => {
    it('should group errors by HTTP status code', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
      const grouped = groupErrorsByStatus(output.data);

      expect(grouped.size).toBeGreaterThan(0);

      // Should have 400 errors
      expect(grouped.has(400)).toBe(true);

      // Should have 404 errors
      expect(grouped.has(404)).toBe(true);

      // Should have 500 errors
      expect(grouped.has(500)).toBe(true);
    });

    it('should group all errors correctly', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
      const grouped = groupErrorsByStatus(output.data);

      let totalGrouped = 0;
      for (const errors of grouped.values()) {
        totalGrouped += errors.length;
      }

      expect(totalGrouped).toBe(output.data.length);
    });
  });

  describe('getErrorCodes', () => {
    it('should return array of error codes', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
      const codes = getErrorCodes(output);

      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBe(output.data.length);
      expect(codes).toContain('NOT_FOUND');
      expect(codes).toContain('VALIDATION_ERROR');
    });
  });

  describe('getErrorByCode', () => {
    it('should find error by code', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
      const error = getErrorByCode(output, 'NOT_FOUND');

      expect(error).toBeDefined();
      expect(error?.code).toBe('NOT_FOUND');
      expect(error?.httpStatus).toBe(404);
    });

    it('should return undefined for non-existent code', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
      const error = getErrorByCode(output, 'NON_EXISTENT_ERROR');

      expect(error).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing directories gracefully', () => {
      const output = parseErrorCodes(
        '/non/existent/routes',
        '/non/existent/services',
        errorHandlerPath,
      );

      // Should still extract errors from error handler
      expect(output.data.length).toBeGreaterThan(0);
      expect(output.data.some((e) => e.code === 'VALIDATION_ERROR')).toBe(true);
    });

    it('should handle files without errors', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      // Should not crash and should return valid output
      expect(output.source).toBe('error-code-parser');
      expect(Array.isArray(output.data)).toBe(true);
    });
  });

  describe('Real-world Error Patterns', () => {
    it('should extract errors from AppError throws', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      // These are real errors from the codebase
      const expectedErrors = [
        'NOT_FOUND',
        'TEMPLATE_NOT_PUBLISHED',
        'TEMPLATE_PUBLISHED',
        'IN_USE',
        'NO_EQUIPMENT',
        'ALREADY_GENERATING',
      ];

      const codes = getErrorCodes(output);
      for (const expected of expectedErrors) {
        expect(codes).toContain(expected);
      }
    });

    it('should extract correct HTTP status codes', () => {
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);

      const notFound = getErrorByCode(output, 'NOT_FOUND');
      expect(notFound?.httpStatus).toBe(404);

      const validation = getErrorByCode(output, 'VALIDATION_ERROR');
      expect(validation?.httpStatus).toBe(400);

      const internal = getErrorByCode(output, 'INTERNAL_ERROR');
      expect(internal?.httpStatus).toBe(500);

      const conflict = getErrorByCode(output, 'IN_USE');
      expect(conflict?.httpStatus).toBe(409);
    });
  });
});
