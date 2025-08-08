import { AzureSearchIndexingService, IndexableDocumentChunk } from '../azure-search-indexing-service';
import { AzureSearchCredentials } from '../multilingual-configuration-manager';

// Mock fetch globally
global.fetch = jest.fn();

describe('Azure Search Indexing Integration', () => {
  let service: AzureSearchIndexingService;
  let mockCredentials: AzureSearchCredentials;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockCredentials = {
      endpoint: 'https://test-search.search.windows.net',
      key: 'test-key-123',
      indexName: 'multilingual-test-index'
    };

    service = new AzureSearchIndexingService(mockCredentials);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  describe('end-to-end multilingual indexing workflow', () => {
    it('should handle complete multilingual document indexing workflow', async () => {
      // Mock index creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'multilingual-test-index' })
      } as Response);

      // Mock successful indexing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            { key: 'chunk_1', status: true, statusCode: 200 },
            { key: 'chunk_2', status: true, statusCode: 200 },
            { key: 'chunk_3', status: true, statusCode: 200 }
          ]
        })
      } as Response);

      // Mock health check calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'multilingual-test-index',
          fields: [
            { name: 'id' },
            { name: 'content' },
            { name: 'embedding' },
            { name: 'filePath' },
            { name: 'originalLanguage' },
            { name: 'targetLanguage' },
            { name: 'isTranslated' }
          ]
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentCount: 3, storageSize: 1536 })
      } as Response);

      // Create multilingual document chunks
      const multilingualChunks: IndexableDocumentChunk[] = [
        {
          id: 'chunk_1',
          content: 'This is English content that should be indexed directly.',
          embedding: new Array(1536).fill(0.1),
          metadata: {
            filePath: '/documents/english-doc.pdf',
            fileName: 'english-doc.pdf',
            chunkIndex: 0,
            totalChunks: 1,
            originalLanguage: 'en',
            targetLanguage: 'en',
            isTranslated: false,
            documentType: 'pdf',
            uploadTimestamp: '2024-01-01T00:00:00Z',
            processingTimestamp: '2024-01-01T00:00:00Z',
            contentHash: 'hash1',
            chunkSize: 58
          }
        },
        {
          id: 'chunk_2',
          content: 'This is translated content from Romanian to English.',
          embedding: new Array(1536).fill(0.2),
          metadata: {
            filePath: '/documents/romanian-doc.pdf',
            fileName: 'romanian-doc.pdf',
            chunkIndex: 0,
            totalChunks: 2,
            originalLanguage: 'ro',
            targetLanguage: 'en',
            isTranslated: true,
            documentType: 'pdf',
            uploadTimestamp: '2024-01-01T00:00:00Z',
            processingTimestamp: '2024-01-01T00:00:00Z',
            contentHash: 'hash2',
            chunkSize: 52,
            tokenCount: 13
          }
        },
        {
          id: 'chunk_3',
          content: 'Another translated chunk from the same Romanian document.',
          embedding: new Array(1536).fill(0.3),
          metadata: {
            filePath: '/documents/romanian-doc.pdf',
            fileName: 'romanian-doc.pdf',
            chunkIndex: 1,
            totalChunks: 2,
            originalLanguage: 'ro',
            targetLanguage: 'en',
            isTranslated: true,
            documentType: 'pdf',
            uploadTimestamp: '2024-01-01T00:00:00Z',
            processingTimestamp: '2024-01-01T00:00:00Z',
            contentHash: 'hash3',
            chunkSize: 58,
            tokenCount: 14
          }
        }
      ];

      // Track progress updates
      const progressUpdates: any[] = [];

      // Create the index first
      await service.createOrUpdateIndex('multilingual-test-index');

      // Execute the indexing workflow
      const result = await service.indexDocumentChunks(
        multilingualChunks,
        'multilingual-test-index',
        10,
        (progress) => {
          progressUpdates.push(progress);
        }
      );

      // Verify results
      expect(result.success).toBe(true);
      expect(result.documentsIndexed).toBe(3);
      expect(result.documentsSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.indexName).toBe('multilingual-test-index');

      // Verify progress tracking
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('preparing');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('completed');

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledTimes(4); // Index creation + indexing + 2 health checks

      // Verify index creation call (first call)
      const indexCreationCall = mockFetch.mock.calls[0];
      expect(indexCreationCall[0]).toContain('/indexes/multilingual-test-index');
      expect(indexCreationCall[1]?.method).toBe('PUT');

      // Verify indexing call (second call)
      const indexingCall = mockFetch.mock.calls[1];
      expect(indexingCall[0]).toContain('/docs/index');
      expect(indexingCall[1]?.method).toBe('POST');
      
      const indexingBody = JSON.parse(indexingCall[1]?.body as string);
      expect(indexingBody.value).toHaveLength(3);
      expect(indexingBody.value[0]['@search.action']).toBe('mergeOrUpload');
    });

    it('should handle mixed language content with proper metadata', async () => {
      // Mock index creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'multilingual-test-index' })
      } as Response);

      // Mock indexing with one failure
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            { key: 'en_chunk', status: true, statusCode: 200 },
            { key: 'ro_chunk', status: false, statusCode: 400, errorMessage: 'Invalid content' },
            { key: 'fr_chunk', status: true, statusCode: 200 }
          ]
        })
      } as Response);

      // Mock health check calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'multilingual-test-index',
          fields: [{ name: 'id' }, { name: 'content' }, { name: 'embedding' }, { name: 'filePath' }, { name: 'originalLanguage' }]
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentCount: 2, storageSize: 1024 })
      } as Response);

      const mixedLanguageChunks: IndexableDocumentChunk[] = [
        AzureSearchIndexingService.convertToIndexableChunk(
          { content: 'English content', embedding: new Array(1536).fill(0.1) },
          '/docs/english.pdf',
          0,
          { originalLanguage: 'en', targetLanguage: 'en', isTranslated: false, totalChunks: 1 }
        ),
        AzureSearchIndexingService.convertToIndexableChunk(
          { content: 'Conținut tradus din română', embedding: new Array(1536).fill(0.2) },
          '/docs/romanian.pdf',
          0,
          { originalLanguage: 'ro', targetLanguage: 'en', isTranslated: true, totalChunks: 1 }
        ),
        AzureSearchIndexingService.convertToIndexableChunk(
          { content: 'Contenu traduit du français', embedding: new Array(1536).fill(0.3) },
          '/docs/french.pdf',
          0,
          { originalLanguage: 'fr', targetLanguage: 'en', isTranslated: true, totalChunks: 1 }
        )
      ];

      // Create the index first
      await service.createOrUpdateIndex('multilingual-test-index');

      const result = await service.indexDocumentChunks(mixedLanguageChunks);

      // Should succeed overall but with one error
      expect(result.success).toBe(true); // Still success because some documents indexed
      expect(result.documentsIndexed).toBe(2); // Only successful documents are counted
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorMessage).toBe('Invalid content');

      // Verify the indexing payload contains proper multilingual metadata
      // Find the indexing call (POST to /docs/index)
      const indexingCall = mockFetch.mock.calls.find(call => 
        call[0].includes('/docs/index') && call[1]?.method === 'POST'
      );
      
      expect(indexingCall).toBeDefined();
      expect(indexingCall![1]?.body).toBeDefined();
      
      const indexingBody = JSON.parse(indexingCall![1]?.body as string);
      
      const englishDoc = indexingBody.value.find((doc: any) => doc.originalLanguage === 'en');
      const romanianDoc = indexingBody.value.find((doc: any) => doc.originalLanguage === 'ro');
      const frenchDoc = indexingBody.value.find((doc: any) => doc.originalLanguage === 'fr');

      expect(englishDoc).toBeDefined();
      expect(romanianDoc).toBeDefined();
      expect(frenchDoc).toBeDefined();
      
      expect(englishDoc.isTranslated).toBe(false);
      expect(romanianDoc.isTranslated).toBe(true);
      expect(frenchDoc.isTranslated).toBe(true);
      expect(englishDoc.targetLanguage).toBe('en');
      expect(romanianDoc.targetLanguage).toBe('en');
      expect(frenchDoc.targetLanguage).toBe('en');
    });

    it('should handle index health monitoring', async () => {
      // Mock healthy index
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'multilingual-test-index',
          fields: [
            { name: 'id' },
            { name: 'content' },
            { name: 'embedding' },
            { name: 'filePath' },
            { name: 'originalLanguage' },
            { name: 'targetLanguage' },
            { name: 'isTranslated' },
            { name: 'documentType' },
            { name: 'chunkIndex' }
          ],
          lastModified: '2024-01-01T12:00:00Z'
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documentCount: 2,
          storageSize: 1024
        })
      } as Response);

      const health = await service.checkIndexHealth('multilingual-test-index');

      expect(health.exists).toBe(true);
      expect(health.status).toBe('healthy');
      expect(health.documentCount).toBe(2); // Based on the mock response
      expect(health.storageSize).toBe(1024); // Based on the mock response
      expect(health.issues).toHaveLength(0);
      expect(health.warnings).toHaveLength(0); // No warnings for healthy index with documents
    });

    it('should validate multilingual schema requirements', async () => {
      const schema = (service as any).buildMultilingualIndexSchema('test-index');

      // Verify required multilingual fields are present
      const fieldNames = schema.fields.map((f: any) => f.name);
      
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('content');
      expect(fieldNames).toContain('embedding');
      expect(fieldNames).toContain('originalLanguage');
      expect(fieldNames).toContain('targetLanguage');
      expect(fieldNames).toContain('isTranslated');
      expect(fieldNames).toContain('filePath');
      expect(fieldNames).toContain('fileName');
      expect(fieldNames).toContain('documentType');
      expect(fieldNames).toContain('chunkIndex');
      expect(fieldNames).toContain('processingTimestamp');

      // Verify embedding field configuration
      const embeddingField = schema.fields.find((f: any) => f.name === 'embedding');
      expect(embeddingField.type).toBe('Collection(Edm.Single)');
      expect(embeddingField.dimensions).toBe(1536);
      expect(embeddingField.searchable).toBe(true);

      // Verify language fields are filterable and facetable
      const originalLanguageField = schema.fields.find((f: any) => f.name === 'originalLanguage');
      expect(originalLanguageField.filterable).toBe(true);
      expect(originalLanguageField.facetable).toBe(true);

      const isTranslatedField = schema.fields.find((f: any) => f.name === 'isTranslated');
      expect(isTranslatedField.type).toBe('Edm.Boolean');
      expect(isTranslatedField.filterable).toBe(true);
      expect(isTranslatedField.facetable).toBe(true);

      // Verify suggesters and scoring profiles
      expect(schema.suggesters).toHaveLength(1);
      expect(schema.suggesters[0].name).toBe('content-suggester');
      expect(schema.suggesters[0].sourceFields).toContain('content');
      expect(schema.suggesters[0].sourceFields).toContain('fileName');

      expect(schema.scoringProfiles).toHaveLength(1);
      expect(schema.scoringProfiles[0].name).toBe('multilingual-boost');
    });
  });

  describe('error scenarios', () => {
    it('should handle Azure service failures gracefully', async () => {
      // Mock index creation failure - return a rejected promise
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(service.createOrUpdateIndex()).rejects.toThrow('Error creating/updating index: Network timeout');
    });

    it('should handle batch indexing failures with retry', async () => {
      const chunks = [
        AzureSearchIndexingService.convertToIndexableChunk(
          { content: 'test content', embedding: new Array(1536).fill(0.1) },
          '/test.pdf',
          0
        )
      ];

      // Mock index creation success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'test-index' })
      } as Response);

      // Mock indexing failure then success (retry scenario)
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary service error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            value: [{ key: 'chunk_test_0', status: true, statusCode: 200 }]
          })
        } as Response);

      // Mock health check
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

      expect(result.success).toBe(true);
      expect(result.documentsIndexed).toBe(1);
    });
  });
});