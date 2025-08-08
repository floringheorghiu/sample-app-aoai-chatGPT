import {
  EmbeddingService,
  EmbeddingServiceError,
  EmbeddingRequest,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingProgress
} from '../embedding-service';
import { AzureOpenAICredentials } from '../multilingual-configuration-manager';

// Mock fetch globally
global.fetch = jest.fn();

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockCredentials: AzureOpenAICredentials;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockCredentials = {
      endpoint: 'https://test-openai.openai.azure.com',
      key: 'test-key-123',
      embeddingModel: 'text-embedding-ada-002',
      apiVersion: '2024-05-01-preview'
    };

    service = new EmbeddingService(mockCredentials);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct credentials and configuration', () => {
      expect(service).toBeInstanceOf(EmbeddingService);
      expect(service['credentials']).toEqual(mockCredentials);
      expect(service['baseUrl']).toBe('https://test-openai.openai.azure.com');
      expect(service['headers']).toEqual({
        'Content-Type': 'application/json',
        'api-key': 'test-key-123'
      });
    });

    it('should handle endpoint with trailing slash', () => {
      const credentialsWithSlash = {
        ...mockCredentials,
        endpoint: 'https://test-openai.openai.azure.com/'
      };
      const serviceWithSlash = new EmbeddingService(credentialsWithSlash);
      expect(serviceWithSlash['baseUrl']).toBe('https://test-openai.openai.azure.com');
    });

    it('should accept custom rate limit configuration', () => {
      const customRateLimit = {
        requestsPerMinute: 30,
        tokensPerMinute: 60000,
        maxRetries: 5
      };
      const customService = new EmbeddingService(mockCredentials, customRateLimit);
      expect(customService['rateLimitConfig'].requestsPerMinute).toBe(30);
      expect(customService['rateLimitConfig'].tokensPerMinute).toBe(60000);
      expect(customService['rateLimitConfig'].maxRetries).toBe(5);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for single text', async () => {
      const mockResponse = {
        data: [
          {
            embedding: new Array(1536).fill(0.1),
            index: 0
          }
        ],
        usage: {
          total_tokens: 10
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.generateEmbedding('test text', 'test-id');

      expect(result.embedding).toHaveLength(1536);
      expect(result.text).toBe('test text');
      expect(result.id).toBe('test-id');
      expect(result.tokenCount).toBe(3); // Estimated from text length
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-openai.openai.azure.com/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-05-01-preview',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': 'test-key-123'
          },
          body: JSON.stringify({
            input: ['test text'],
            model: 'text-embedding-ada-002'
          })
        })
      );
    });

    it('should throw error for empty text', async () => {
      await expect(service.generateEmbedding('')).rejects.toThrow(EmbeddingServiceError);
      await expect(service.generateEmbedding('   ')).rejects.toThrow(EmbeddingServiceError);
    });

    it('should throw error for text too long', async () => {
      const longText = 'x'.repeat(8001);
      await expect(service.generateEmbedding(longText)).rejects.toThrow(
        new EmbeddingServiceError('Text too long for embedding (max 8000 characters)', 'TEXT_TOO_LONG')
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Invalid API key' }
        })
      } as Response);

      await expect(service.generateEmbedding('test')).rejects.toThrow(EmbeddingServiceError);
    });
  });

  describe('generateEmbeddingsBatch', () => {
    const createMockRequest = (text: string, id?: string): EmbeddingRequest => ({
      text,
      id,
      metadata: { source: 'test' }
    });

    const createMockResponse = (count: number) => ({
      data: Array.from({ length: count }, (_, i) => ({
        embedding: new Array(1536).fill(0.1 + i * 0.01),
        index: i
      })),
      usage: {
        total_tokens: count * 10
      }
    });

    it('should process batch of embedding requests', async () => {
      const requests = [
        createMockRequest('text 1', 'id1'),
        createMockRequest('text 2', 'id2'),
        createMockRequest('text 3', 'id3')
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(3)
      } as Response);

      const result = await service.generateEmbeddingsBatch(requests);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.totalTokens).toBe(30);
      expect(result.results[0].text).toBe('text 1');
      expect(result.results[0].id).toBe('id1');
      expect(result.results[0].metadata).toEqual({ source: 'test' });
    });

    it('should handle empty request array', async () => {
      const result = await service.generateEmbeddingsBatch([]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should filter out invalid requests', async () => {
      const requests = [
        createMockRequest('valid text', 'valid'),
        createMockRequest('', 'empty'), // Invalid: empty text
        createMockRequest('x'.repeat(8001), 'too-long'), // Invalid: too long
        createMockRequest('another valid', 'valid2')
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(2)
      } as Response);

      const result = await service.generateEmbeddingsBatch(requests);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].text).toBe('valid text');
      expect(result.results[1].text).toBe('another valid');
    });

    it('should handle all invalid requests', async () => {
      const requests = [
        createMockRequest('', 'empty'),
        createMockRequest('x'.repeat(8001), 'too-long')
      ];

      const result = await service.generateEmbeddingsBatch(requests);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorCode).toBe('NO_VALID_REQUESTS');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should process large batches in chunks', async () => {
      const requests = Array.from({ length: 25 }, (_, i) => 
        createMockRequest(`text ${i}`, `id${i}`)
      );

      // Mock responses for 3 batches (10, 10, 5)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(10)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(10)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(5)
        } as Response);

      const result = await service.generateEmbeddingsBatch(requests, 10);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(25);
      expect(result.totalTokens).toBe(250); // 10 + 10 + 5 batches * 10 tokens each
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should report progress during batch processing', async () => {
      const requests = Array.from({ length: 15 }, (_, i) => 
        createMockRequest(`text ${i}`, `id${i}`)
      );

      const progressUpdates: EmbeddingProgress[] = [];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(10)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(5)
        } as Response);

      await service.generateEmbeddingsBatch(requests, 10, (progress) => {
        progressUpdates.push(progress);
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('preparing');
      expect(progressUpdates[0].total).toBe(15);
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('completed');
      expect(progressUpdates[progressUpdates.length - 1].processed).toBe(15);
    });

    it('should handle partial batch failures', async () => {
      const requests = [
        createMockRequest('text 1', 'id1'),
        createMockRequest('text 2', 'id2')
      ];

      // First batch succeeds, second fails after retries
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(1)
        } as Response)
        .mockRejectedValue(new Error('Network error'));

      const result = await service.generateEmbeddingsBatch(requests, 1);

      expect(result.success).toBe(true); // Still success if some processed
      expect(result.results).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorCode).toBe('MAX_RETRIES_EXCEEDED');
    }, 10000);

    it('should retry failed batches', async () => {
      const requests = [createMockRequest('test text', 'test-id')];

      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(1)
        } as Response);

      const result = await service.generateEmbeddingsBatch(requests);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limiting with 429 status', async () => {
      const requests = [createMockRequest('test text', 'test-id')];

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({
            error: { message: 'Rate limit exceeded' }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(1)
        } as Response);

      const result = await service.generateEmbeddingsBatch(requests);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should stop retrying on non-retryable errors', async () => {
      const requests = [createMockRequest('test text', 'test-id')];

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Bad request' }
        })
      } as Response);

      const result = await service.generateEmbeddingsBatch(requests);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorCode).toBe('MAX_RETRIES_EXCEEDED');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries for 400 error
    });
  });

  describe('generateEmbeddingsForChunks', () => {
    it('should process document chunks with metadata', async () => {
      const chunks = [
        {
          content: 'First chunk content',
          metadata: { chunkIndex: 0, filePath: '/test/doc.pdf' }
        },
        {
          content: 'Second chunk content',
          metadata: { chunkIndex: 1, filePath: '/test/doc.pdf' }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { embedding: new Array(1536).fill(0.1), index: 0 },
            { embedding: new Array(1536).fill(0.2), index: 1 }
          ],
          usage: { total_tokens: 20 }
        })
      } as Response);

      const result = await service.generateEmbeddingsForChunks(chunks);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].id).toBe('chunk_0');
      expect(result.results[0].metadata).toEqual({
        chunkIndex: 0,
        filePath: '/test/doc.pdf'
      });
      expect(result.results[1].id).toBe('chunk_1');
      expect(result.results[1].metadata).toEqual({
        chunkIndex: 1,
        filePath: '/test/doc.pdf'
      });
    });

    it('should handle chunks without metadata', async () => {
      const chunks = [
        { content: 'Simple chunk content' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: new Array(1536).fill(0.1), index: 0 }],
          usage: { total_tokens: 10 }
        })
      } as Response);

      const result = await service.generateEmbeddingsForChunks(chunks);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('chunk_0');
      expect(result.results[0].metadata).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      } as Response);

      await expect(service.generateEmbedding('test')).rejects.toThrow(
        new EmbeddingServiceError('Invalid response format from embedding API', 'INVALID_RESPONSE', false)
      );
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockRejectedValue(new Error('AbortError'));

      await expect(service.generateEmbedding('test')).rejects.toThrow(EmbeddingServiceError);
    }, 10000);

    it('should map HTTP status codes correctly', async () => {
      const statusTests = [
        { status: 400, expectedCode: 'BAD_REQUEST' },
        { status: 401, expectedCode: 'UNAUTHORIZED' },
        { status: 403, expectedCode: 'FORBIDDEN' },
        { status: 404, expectedCode: 'NOT_FOUND' },
        { status: 429, expectedCode: 'RATE_LIMITED' },
        { status: 500, expectedCode: 'INTERNAL_SERVER_ERROR' },
        { status: 502, expectedCode: 'BAD_GATEWAY' },
        { status: 503, expectedCode: 'SERVICE_UNAVAILABLE' },
        { status: 504, expectedCode: 'GATEWAY_TIMEOUT' },
        { status: 999, expectedCode: 'UNKNOWN_ERROR' }
      ];

      for (const { status, expectedCode } of statusTests) {
        // Create a new service instance to avoid retry interference
        const testService = new EmbeddingService(mockCredentials, { maxRetries: 0 });
        
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          statusText: 'Test Error',
          json: async () => ({})
        } as Response);

        try {
          await testService.generateEmbedding('test');
          fail(`Expected error for status ${status}`);
        } catch (error) {
          expect(error).toBeInstanceOf(EmbeddingServiceError);
          expect((error as EmbeddingServiceError).code).toBe(expectedCode);
        }
      }
    });

    it('should determine retryability correctly', async () => {
      const retryableStatuses = [429, 500, 502, 503, 504];
      const nonRetryableStatuses = [400, 401, 403, 404];

      for (const status of retryableStatuses) {
        const testService = new EmbeddingService(mockCredentials, { maxRetries: 0 });
        
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          json: async () => ({})
        } as Response);

        try {
          await testService.generateEmbedding('test');
        } catch (error) {
          expect((error as EmbeddingServiceError).retryable).toBe(true);
        }
      }

      for (const status of nonRetryableStatuses) {
        const testService = new EmbeddingService(mockCredentials, { maxRetries: 0 });
        
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          json: async () => ({})
        } as Response);

        try {
          await testService.generateEmbedding('test');
        } catch (error) {
          expect((error as EmbeddingServiceError).retryable).toBe(false);
        }
      }
    });
  });

  describe('utility methods', () => {
    it('should estimate token count correctly', () => {
      const shortText = 'test';
      const longText = 'This is a longer text that should have more tokens';
      
      // Access private method for testing
      const shortTokens = (service as any).estimateTokenCount(shortText);
      const longTokens = (service as any).estimateTokenCount(longText);
      
      expect(shortTokens).toBe(1); // 4 chars / 4 = 1 token
      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    it('should estimate cost correctly', () => {
      const cost1000 = (service as any).estimateCost(1000);
      const cost2000 = (service as any).estimateCost(2000);
      
      expect(cost1000).toBe(0.0001); // $0.0001 per 1K tokens
      expect(cost2000).toBe(0.0002);
    });

    it('should calculate retry delay with exponential backoff', () => {
      const delay0 = (service as any).calculateRetryDelay(0);
      const delay1 = (service as any).calculateRetryDelay(1);
      const delay2 = (service as any).calculateRetryDelay(2);
      
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay2).toBeLessThanOrEqual(30000); // Max delay
    });

    it('should track token usage', () => {
      (service as any).updateTokenUsage(1000);
      (service as any).updateTokenUsage(500);
      
      const stats = service.getTokenUsageStats();
      expect(stats.totalTokens).toBe(1500);
      expect(stats.requestCount).toBe(2);
      expect(stats.remainingTokens).toBe(120000 - 1500); // Default limit - used
    });

    it('should reset token usage after time window', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      // Initialize the service with mocked time
      const testService = new EmbeddingService(mockCredentials);
      
      (testService as any).updateTokenUsage(1000);
      
      // Advance time by more than a minute
      mockTime += 70000;
      (testService as any).updateTokenUsage(500);
      
      const stats = testService.getTokenUsageStats();
      expect(stats.totalTokens).toBe(500); // Should be reset
      expect(stats.requestCount).toBe(1);
      
      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should check if can process more requests', () => {
      expect(service.canProcessMoreRequests()).toBe(true);
      
      // Use up all tokens
      (service as any).updateTokenUsage(120000);
      expect(service.canProcessMoreRequests()).toBe(false);
    });

    it('should return model information', () => {
      const modelInfo = service.getModelInfo();
      expect(modelInfo.model).toBe('text-embedding-ada-002');
      expect(modelInfo.dimensions).toBe(1536);
      expect(modelInfo.maxTokens).toBe(8191);
    });
  });

  describe('validation', () => {
    it('should validate requests correctly', () => {
      const requests = [
        { text: 'valid text', id: 'valid' },
        { text: '', id: 'empty' }, // Invalid
        { text: '   ', id: 'whitespace' }, // Invalid
        { text: 'x'.repeat(8001), id: 'too-long' }, // Invalid
        { text: 'another valid', id: 'valid2' }
      ];

      const validRequests = (service as any).validateRequests(requests);
      expect(validRequests).toHaveLength(2);
      expect(validRequests[0].id).toBe('valid');
      expect(validRequests[1].id).toBe('valid2');
    });

    it('should create batches correctly', () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const batches = (service as any).createBatches(items, 3);
      
      expect(batches).toHaveLength(3);
      expect(batches[0]).toEqual([1, 2, 3]);
      expect(batches[1]).toEqual([4, 5, 6]);
      expect(batches[2]).toEqual([7]);
    });
  });

  describe('rate limiting', () => {
    it('should wait between requests when rate limited', async () => {
      // Mock the waitForRateLimit function to verify it's called
      const fastService = new EmbeddingService(mockCredentials, {
        requestsPerMinute: 2 // Very low limit for testing
      });
      
      let waitCalled = false;
      const originalWaitForRateLimit = (fastService as any).waitForRateLimit;
      (fastService as any).waitForRateLimit = jest.fn().mockImplementation(async () => {
        waitCalled = true;
        return Promise.resolve();
      });
      
      // Make two quick requests
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: new Array(1536).fill(0.1), index: 0 }],
          usage: { total_tokens: 10 }
        })
      } as Response);

      await fastService.generateEmbeddingsBatch([
        { text: 'test 1', id: 'id1' },
        { text: 'test 2', id: 'id2' }
      ], 1); // Process in separate batches
      
      expect(waitCalled).toBe(true);
      
      // Restore original function
      (fastService as any).waitForRateLimit = originalWaitForRateLimit;
    });
  });
});