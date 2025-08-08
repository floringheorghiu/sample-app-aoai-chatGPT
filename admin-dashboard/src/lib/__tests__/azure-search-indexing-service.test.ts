import { AzureSearchIndexingService, IndexableDocumentChunk, ChunkIndexMetadata, AzureSearchIndexingError } from '../azure-search-indexing-service';
import { AzureSearchCredentials } from '../multilingual-configuration-manager';

// Mock fetch globally
global.fetch = jest.fn();

describe('AzureSearchIndexingService', () => {
  let service: AzureSearchIndexingService;
  let mockCredentials: AzureSearchCredentials;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockCredentials = {
      endpoint: 'https://test-search.search.windows.net',
      key: 'test-key-123',
      indexName: 'test-index'
    };

    service = new AzureSearchIndexingService(mockCredentials);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct credentials and headers', () => {
      expect(service).toBeInstanceOf(AzureSearchIndexingService);
      // Test that the service was created with the right credentials
      expect(service['credentials']).toEqual(mockCredentials);
      expect(service['headers']).toEqual({
        'Content-Type': 'application/json',
        'api-key': 'test-key-123'
      });
    });

    it('should handle endpoint with trailing slash', () => {
      const credentialsWithSlash = {
        ...mockCredentials,
        endpoint: 'https://test-search.search.windows.net/'
      };
      const serviceWithSlash = new AzureSearchIndexingService(credentialsWithSlash);
      expect(serviceWithSlash['baseUrl']).toBe('https://test-search.search.windows.net');
    });
  });

  describe('createOrUpdateIndex', () => {
    it('should successfully create index with default schema', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'test-index' })
      } as Response);

      const result = await service.createOrUpdateIndex();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-search.search.windows.net/indexes/test-index?api-version=2023-11-01',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'api-key': 'test-key-123'
          },
          body: expect.stringContaining('"name":"test-index"')
        })
      );
    });

    it('should handle index creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid schema' } })
      } as Response);

      await expect(service.createOrUpdateIndex()).rejects.toThrow(AzureSearchIndexingError);
      
      // Reset mock for second call
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid schema' } })
      } as Response);
      
      await expect(service.createOrUpdateIndex()).rejects.toThrow('Failed to create/update index: Invalid schema');
    });

    it('should include custom fields in schema', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'test-index' })
      } as Response);

      const customFields = [{
        name: 'customField',
        type: 'Edm.String' as const,
        searchable: true
      }];

      await service.createOrUpdateIndex('test-index', customFields);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.fields).toContainEqual(expect.objectContaining({
        name: 'customField',
        type: 'Edm.String',
        searchable: true
      }));
    });
  });

  describe('indexDocumentChunks', () => {
    const createMockChunk = (id: string, content: string = 'test content'): IndexableDocumentChunk => ({
      id,
      content,
      embedding: new Array(1536).fill(0.1),
      metadata: {
        filePath: '/test/file.pdf',
        fileName: 'file.pdf',
        chunkIndex: 0,
        totalChunks: 1,
        originalLanguage: 'en',
        targetLanguage: 'en',
        isTranslated: false,
        documentType: 'pdf',
        uploadTimestamp: '2024-01-01T00:00:00Z',
        processingTimestamp: '2024-01-01T00:00:00Z',
        contentHash: 'abc123',
        chunkSize: content.length
      }
    });

    it('should successfully index valid chunks', async () => {
      const chunks = [
        createMockChunk('chunk1'),
        createMockChunk('chunk2')
      ];

      // Mock indexing response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            { key: 'chunk1', status: true, statusCode: 200 },
            { key: 'chunk2', status: true, statusCode: 200 }
          ]
        })
      } as Response);

      // Mock health check calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'test-index',
          fields: [{ name: 'id' }, { name: 'content' }, { name: 'embedding' }, { name: 'filePath' }, { name: 'originalLanguage' }]
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentCount: 2, storageSize: 1024 })
      } as Response);

      const result = await service.indexDocumentChunks(chunks);

      expect(result.success).toBe(true);
      expect(result.documentsIndexed).toBe(2);
      expect(result.documentsSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.indexName).toBe('test-index');
    });

    it('should handle partial indexing failures', async () => {
      const chunks = [
        createMockChunk('chunk1'),
        createMockChunk('chunk2')
      ];

      // Mock indexing response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            { key: 'chunk1', status: true, statusCode: 200 },
            { key: 'chunk2', status: false, statusCode: 400, errorMessage: 'Invalid document' }
          ]
        })
      } as Response);

      // Mock health check calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'test-index',
          fields: [{ name: 'id' }, { name: 'content' }, { name: 'embedding' }, { name: 'filePath' }, { name: 'originalLanguage' }]
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentCount: 1, storageSize: 512 })
      } as Response);

      const result = await service.indexDocumentChunks(chunks);

      expect(result.success).toBe(true); // Still success if some documents indexed
      expect(result.documentsIndexed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        documentId: 'chunk2',
        errorCode: 'Invalid document',
        errorMessage: 'Invalid document',
        statusCode: 400,
        retryable: false
      });
    });

    it('should skip invalid chunks', async () => {
      const validChunk = createMockChunk('valid');
      const invalidChunk = {
        id: '',
        content: '',
        metadata: {} as ChunkIndexMetadata
      } as IndexableDocumentChunk;

      const chunks = [validChunk, invalidChunk];

      // Mock indexing response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ key: 'valid', status: true, statusCode: 200 }]
        })
      } as Response);

      // Mock health check calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'test-index',
          fields: [{ name: 'id' }, { name: 'content' }, { name: 'embedding' }, { name: 'filePath' }, { name: 'originalLanguage' }]
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentCount: 1, storageSize: 256 })
      } as Response);

      const result = await service.indexDocumentChunks(chunks);

      expect(result.documentsSkipped).toBe(1);
      expect(result.documentsIndexed).toBe(1);
    });

    it('should handle batch processing with progress callback', async () => {
      const chunks = Array.from({ length: 5 }, (_, i) => createMockChunk(`chunk${i}`));
      const progressUpdates: any[] = [];

      // Mock indexing responses for batches
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          value: [
            { key: 'chunk0', status: true, statusCode: 200 },
            { key: 'chunk1', status: true, statusCode: 200 }
          ]
        })
      } as Response);

      // Mock health check calls (will be called after each batch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          name: 'test-index',
          fields: [{ name: 'id' }, { name: 'content' }, { name: 'embedding' }, { name: 'filePath' }, { name: 'originalLanguage' }]
        })
      } as Response);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ documentCount: 5, storageSize: 1280 })
      } as Response);

      await service.indexDocumentChunks(chunks, 'test-index', 2, (progress) => {
        progressUpdates.push(progress);
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('preparing');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('completed');
    });

    it('should return failure when no valid chunks', async () => {
      const invalidChunks = [
        { id: '', content: '', metadata: {} as ChunkIndexMetadata } as IndexableDocumentChunk
      ];

      const result = await service.indexDocumentChunks(invalidChunks);

      expect(result.success).toBe(false);
      expect(result.documentsIndexed).toBe(0);
      expect(result.documentsSkipped).toBe(1);
      expect(result.errors[0].errorCode).toBe('NO_VALID_CHUNKS');
    });
  });

  describe('checkIndexHealth', () => {
    it('should return healthy status for existing index', async () => {
      // Mock index info request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'test-index',
          fields: [
            { name: 'id' },
            { name: 'content' },
            { name: 'embedding' },
            { name: 'filePath' },
            { name: 'originalLanguage' }
          ],
          lastModified: '2024-01-01T00:00:00Z'
        })
      } as Response);

      // Mock stats request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documentCount: 100,
          storageSize: 1024000
        })
      } as Response);

      const health = await service.checkIndexHealth();

      expect(health.exists).toBe(true);
      expect(health.status).toBe('healthy');
      expect(health.documentCount).toBe(100);
      expect(health.storageSize).toBe(1024000);
      expect(health.issues).toHaveLength(0);
    });

    it('should return unhealthy status for non-existent index', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);

      const health = await service.checkIndexHealth();

      expect(health.exists).toBe(false);
      expect(health.status).toBe('unhealthy');
      expect(health.issues).toContain('Index does not exist');
    });

    it('should detect missing required fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'test-index',
          fields: [{ name: 'id' }] // Missing required fields
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentCount: 0, storageSize: 0 })
      } as Response);

      const health = await service.checkIndexHealth();

      expect(health.status).toBe('degraded');
      expect(health.issues[0]).toContain('Missing required fields');
    });

    it('should warn about empty index', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'test-index',
          fields: [
            { name: 'id' },
            { name: 'content' },
            { name: 'embedding' },
            { name: 'filePath' },
            { name: 'originalLanguage' }
          ]
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentCount: 0, storageSize: 0 })
      } as Response);

      const health = await service.checkIndexHealth();

      expect(health.status).toBe('healthy');
      expect(health.warnings).toContain('Index contains no documents');
    });
  });

  describe('deleteDocuments', () => {
    it('should successfully delete documents', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            { key: 'doc1', status: true, statusCode: 200 },
            { key: 'doc2', status: true, statusCode: 200 }
          ]
        })
      } as Response);

      const result = await service.deleteDocuments(['doc1', 'doc2']);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty document ID array', async () => {
      const result = await service.deleteDocuments([]);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle deletion failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            { key: 'doc1', status: false, statusCode: 404, errorMessage: 'Document not found' }
          ]
        })
      } as Response);

      const result = await service.deleteDocuments(['doc1']);

      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorMessage).toBe('Document not found');
    });
  });

  describe('clearIndex', () => {
    it('should successfully clear index with documents', async () => {
      // Mock search for documents
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ id: 'doc1' }, { id: 'doc2' }]
        })
      } as Response);

      // Mock delete operation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            { key: 'doc1', status: true, statusCode: 200 },
            { key: 'doc2', status: true, statusCode: 200 }
          ]
        })
      } as Response);

      const result = await service.clearIndex();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle empty index', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [] })
      } as Response);

      const result = await service.clearIndex();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only search, no delete
    });

    it('should handle search failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const result = await service.clearIndex();

      expect(result).toBe(false);
    });
  });

  describe('static methods', () => {
    describe('generateChunkId', () => {
      it('should generate consistent IDs for same input', () => {
        const id1 = AzureSearchIndexingService.generateChunkId('/test/file.pdf', 0);
        const id2 = AzureSearchIndexingService.generateChunkId('/test/file.pdf', 0);
        expect(id1).toBe(id2);
      });

      it('should generate different IDs for different inputs', () => {
        const id1 = AzureSearchIndexingService.generateChunkId('/test/file1.pdf', 0);
        const id2 = AzureSearchIndexingService.generateChunkId('/test/file2.pdf', 0);
        expect(id1).not.toBe(id2);
      });

      it('should include content hash when provided', () => {
        const id = AzureSearchIndexingService.generateChunkId('/test/file.pdf', 0, 'abcd1234');
        expect(id).toContain('abcd1234');
      });
    });

    describe('convertToIndexableChunk', () => {
      it('should convert chunk with all metadata', () => {
        const chunk = {
          content: 'test content',
          embedding: [0.1, 0.2, 0.3]
        };

        const metadata = {
          totalChunks: 5,
          originalLanguage: 'ro',
          targetLanguage: 'en',
          isTranslated: true,
          tokenCount: 10
        };

        const result = AzureSearchIndexingService.convertToIndexableChunk(
          chunk,
          '/test/document.pdf',
          2,
          metadata
        );

        expect(result.id).toContain('chunk_');
        expect(result.content).toBe('test content');
        expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
        expect(result.metadata.filePath).toBe('/test/document.pdf');
        expect(result.metadata.fileName).toBe('document.pdf');
        expect(result.metadata.chunkIndex).toBe(2);
        expect(result.metadata.totalChunks).toBe(5);
        expect(result.metadata.originalLanguage).toBe('ro');
        expect(result.metadata.isTranslated).toBe(true);
        expect(result.metadata.documentType).toBe('pdf');
        expect(result.metadata.tokenCount).toBe(10);
      });

      it('should handle minimal chunk data', () => {
        const chunk = { content: 'minimal content' };

        const result = AzureSearchIndexingService.convertToIndexableChunk(
          chunk,
          'simple.txt',
          0
        );

        expect(result.content).toBe('minimal content');
        expect(result.metadata.fileName).toBe('simple.txt');
        expect(result.metadata.documentType).toBe('txt');
        expect(result.metadata.originalLanguage).toBe('unknown');
        expect(result.metadata.targetLanguage).toBe('en');
        expect(result.metadata.isTranslated).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      );

      await expect(service.createOrUpdateIndex()).rejects.toThrow(AzureSearchIndexingError);
    });

    it('should retry failed requests', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ value: [{ key: 'test', status: true, statusCode: 200 }] })
        } as Response);

      const chunks = [createMockChunk('test')];
      
      // Access private method for testing
      const batchResult = await (service as any).indexBatch(chunks, 'test-index');
      
      expect(batchResult.successCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    function createMockChunk(id: string): IndexableDocumentChunk {
      return {
        id,
        content: 'test content',
        embedding: new Array(1536).fill(0.1),
        metadata: {
          filePath: '/test/file.pdf',
          fileName: 'file.pdf',
          chunkIndex: 0,
          totalChunks: 1,
          originalLanguage: 'en',
          targetLanguage: 'en',
          isTranslated: false,
          documentType: 'pdf',
          uploadTimestamp: '2024-01-01T00:00:00Z',
          processingTimestamp: '2024-01-01T00:00:00Z',
          contentHash: 'abc123',
          chunkSize: 12
        }
      };
    }
  });

  describe('validation', () => {
    it('should validate chunk content length', () => {
      const validChunk = {
        id: 'test',
        content: 'valid content',
        metadata: {
          filePath: '/test.pdf',
          originalLanguage: 'en',
          targetLanguage: 'en'
        } as ChunkIndexMetadata
      } as IndexableDocumentChunk;

      const emptyChunk = {
        id: 'empty',
        content: '',
        metadata: validChunk.metadata
      } as IndexableDocumentChunk;

      const tooLongChunk = {
        id: 'long',
        content: 'x'.repeat(33000),
        metadata: validChunk.metadata
      } as IndexableDocumentChunk;

      const validChunks = (service as any).validateChunks([validChunk, emptyChunk, tooLongChunk]);
      
      expect(validChunks).toHaveLength(1);
      expect(validChunks[0].id).toBe('test');
    });

    it('should validate embedding dimensions', () => {
      const validChunk = {
        id: 'valid',
        content: 'test',
        embedding: new Array(1536).fill(0.1),
        metadata: {
          filePath: '/test.pdf',
          originalLanguage: 'en',
          targetLanguage: 'en'
        } as ChunkIndexMetadata
      } as IndexableDocumentChunk;

      const invalidEmbeddingChunk = {
        id: 'invalid',
        content: 'test',
        embedding: [0.1, 0.2], // Wrong dimensions
        metadata: validChunk.metadata
      } as IndexableDocumentChunk;

      const validChunks = (service as any).validateChunks([validChunk, invalidEmbeddingChunk]);
      
      expect(validChunks).toHaveLength(1);
      expect(validChunks[0].id).toBe('valid');
    });
  });
});