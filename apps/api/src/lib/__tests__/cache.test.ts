import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheService } from '../cache';
import { redis } from '../redis';

// Mock redis module
vi.mock('../redis', () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    on: vi.fn(),
  };
  return { redis: mockRedis };
});

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheService = new CacheService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('should return null when key does not exist', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await cacheService.get('nonexistent');

      expect(result).toBeNull();
      expect(redis.get).toHaveBeenCalledWith('nonexistent');
    });

    it('should return parsed value when key exists', async () => {
      const testData = { id: 1, name: 'Test' };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get<typeof testData>('test-key');

      expect(result).toEqual(testData);
      expect(redis.get).toHaveBeenCalledWith('test-key');
    });

    it('should handle Redis errors gracefully and return null', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Connection lost'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', async () => {
      vi.mocked(redis.get).mockResolvedValue('invalid json{');

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store value with default TTL', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK');

      await cacheService.set('test-key', { data: 'value' });

      expect(redis.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ data: 'value' }),
        'EX',
        300,
      );
    });

    it('should store value with custom TTL', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK');

      await cacheService.set('test-key', { data: 'value' }, 600);

      expect(redis.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ data: 'value' }),
        'EX',
        600,
      );
    });

    it('should handle Redis errors gracefully without throwing', async () => {
      vi.mocked(redis.set).mockRejectedValue(new Error('Connection lost'));

      await expect(cacheService.set('test-key', { data: 'value' })).resolves.toBeUndefined();
    });

    it('should serialize complex objects correctly', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK');
      const complexData = {
        id: 1,
        nested: { value: 'test' },
        array: [1, 2, 3],
        date: new Date('2024-01-01'),
      };

      await cacheService.set('test-key', complexData);

      expect(redis.set).toHaveBeenCalledWith('test-key', JSON.stringify(complexData), 'EX', 300);
    });
  });

  describe('del', () => {
    it('should delete a specific key', async () => {
      vi.mocked(redis.del).mockResolvedValue(1);

      await cacheService.del('test-key');

      expect(redis.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle Redis errors gracefully', async () => {
      vi.mocked(redis.del).mockRejectedValue(new Error('Connection lost'));

      await expect(cacheService.del('test-key')).resolves.toBeUndefined();
    });
  });

  describe('delPattern', () => {
    it('should delete all keys matching pattern', async () => {
      vi.mocked(redis.keys).mockResolvedValue([
        'lojas:list:page:1',
        'lojas:list:page:2',
        'lojas:list:page:3',
      ]);
      vi.mocked(redis.del).mockResolvedValue(3);

      await cacheService.delPattern('lojas:list:*');

      expect(redis.keys).toHaveBeenCalledWith('lojas:list:*');
      expect(redis.del).toHaveBeenCalledWith(
        'lojas:list:page:1',
        'lojas:list:page:2',
        'lojas:list:page:3',
      );
    });

    it('should not call del when no keys match pattern', async () => {
      vi.mocked(redis.keys).mockResolvedValue([]);

      await cacheService.delPattern('nonexistent:*');

      expect(redis.keys).toHaveBeenCalledWith('nonexistent:*');
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      vi.mocked(redis.keys).mockRejectedValue(new Error('Connection lost'));

      await expect(cacheService.delPattern('test:*')).resolves.toBeUndefined();
    });
  });

  describe('wrap', () => {
    it('should return cached value if exists', async () => {
      const cachedData = { id: 1, name: 'Cached' };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(cachedData));

      const fn = vi.fn().mockResolvedValue({ id: 2, name: 'Fresh' });

      const result = await cacheService.wrap('test-key', fn);

      expect(result).toEqual(cachedData);
      expect(fn).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('should execute function and cache result on cache miss', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.set).mockResolvedValue('OK');

      const freshData = { id: 2, name: 'Fresh' };
      const fn = vi.fn().mockResolvedValue(freshData);

      const result = await cacheService.wrap('test-key', fn);

      expect(result).toEqual(freshData);
      expect(fn).toHaveBeenCalledTimes(1);

      // Wait for async set to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(redis.set).toHaveBeenCalledWith('test-key', JSON.stringify(freshData), 'EX', 300);
    });

    it('should use custom TTL when provided', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.set).mockResolvedValue('OK');

      const freshData = { id: 2, name: 'Fresh' };
      const fn = vi.fn().mockResolvedValue(freshData);

      await cacheService.wrap('test-key', fn, 600);

      // Wait for async set to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(redis.set).toHaveBeenCalledWith('test-key', JSON.stringify(freshData), 'EX', 600);
    });

    it('should return fresh data even if cache set fails', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.set).mockRejectedValue(new Error('Connection lost'));

      const freshData = { id: 2, name: 'Fresh' };
      const fn = vi.fn().mockResolvedValue(freshData);

      const result = await cacheService.wrap('test-key', fn);

      expect(result).toEqual(freshData);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle function errors by propagating them', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);

      const fn = vi.fn().mockRejectedValue(new Error('Function failed'));

      await expect(cacheService.wrap('test-key', fn)).rejects.toThrow('Function failed');
    });
  });

  describe('graceful degradation', () => {
    it('should continue working when Redis is unavailable', async () => {
      // Simulate Redis being unavailable by making it private
      // We'll test this through the behavior of methods returning null/undefined
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis unavailable'));
      vi.mocked(redis.set).mockRejectedValue(new Error('Redis unavailable'));

      // Get should return null
      const getResult = await cacheService.get('test-key');
      expect(getResult).toBeNull();

      // Set should not throw
      await expect(cacheService.set('test-key', { data: 'value' })).resolves.toBeUndefined();

      // Del should not throw
      await expect(cacheService.del('test-key')).resolves.toBeUndefined();

      // Wrap should execute function and return result
      const fn = vi.fn().mockResolvedValue({ data: 'fresh' });
      const wrapResult = await cacheService.wrap('test-key', fn);
      expect(wrapResult).toEqual({ data: 'fresh' });
      expect(fn).toHaveBeenCalled();
    });
  });
});
