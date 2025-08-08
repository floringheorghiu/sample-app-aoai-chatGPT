import { AzureSearchCredentials } from './multilingual-configuration-manager';

// Document chunk interface for indexing
export interface IndexableDocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: ChunkIndexMetadata;
}

// Enhanced metadata for search indexing
export interface ChunkIndexMetadata {
  filePath: string;
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  originalLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  documentType: string;
  uploadTimestamp: string;
  processingTimestamp: string;
  contentHash: string;
  chunkSize: number;
  tokenCount?: number;
}

// Search index schema definition
export interface SearchIndexSchema {
  name: string;
  fields: SearchIndexField[];
  corsOptions?: {
    allowedOrigins: string[];
    maxAgeInSeconds: number;
  };
  suggesters?: SearchSuggester[];
  scoringProfiles?: SearchScoringProfile[];
}

export interface SearchIndexField {
  name: string;
  type: 'Edm.String' | 'Edm.Int32' | 'Edm.Double' | 'Edm.Boolean' | 'Edm.DateTimeOffset' | 'Collection(Edm.Single)' | 'Collection(Edm.String)';
  searchable?: boolean;
  filterable?: boolean;
  retrievable?: boolean;
  sortable?: boolean;
  facetable?: boolean;
  key?: boolean;
  analyzer?: string;
  dimensions?: number; // For vector fields
  vectorSearchProfile?: string;
}

export interface SearchSuggester {
  name: string;
  searchMode: 'analyzingInfixMatching';
  sourceFields: string[];
}

export interface SearchScoringProfile {
  name: string;
  text?: {
    weights: Record<string, number>;
  };
  functions?: SearchScoringFunction[];
}

export interface SearchScoringFunction {
  type: 'magnitude' | 'freshness' | 'distance' | 'tag';
  boost: number;
  fieldName: string;
  interpolation: 'constant' | 'linear' | 'quadratic' | 'logarithmic';
}

// Batch indexing result
export interface BatchIndexingResult {
  success: boolean;
  documentsIndexed: number;
  documentsSkipped: number;
  errors: IndexingError[];
  duration: number;
  indexName: string;
}

// Indexing error interface
export interface IndexingError {
  documentId: string;
  errorCode: string;
  errorMessage: string;
  statusCode: number;
  retryable: boolean;
}

// Index health status
export interface IndexHealthStatus {
  indexName: string;
  exists: boolean;
  documentCount: number;
  storageSize: number;
  lastModified?: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  warnings: string[];
}

// Indexing service error
export class AzureSearchIndexingError extends Error {
  constructor(
    public errorCode: string,
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AzureSearchIndexingError';
  }
}

// Progress callback for batch operations
export type IndexingProgressCallback = (progress: {
  stage: 'preparing' | 'indexing' | 'validating' | 'completed';
  progress: number;
  message: string;
  documentsProcessed: number;
  totalDocuments: number;
  errors: IndexingError[];
}) => void;

/**
 * Azure Cognitive Search indexing service for multilingual RAG pipeline
 * Handles document indexing with multilingual metadata support
 */
export class AzureSearchIndexingService {
  private credentials: AzureSearchCredentials;
  private baseUrl: string;
  private headers: Record<string, string>;
  private defaultTimeout: number = 30000;
  private maxRetries: number = 3;
  private retryDelayMs: number = 1000;

  constructor(credentials: AzureSearchCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.endpoint.endsWith('/') 
      ? credentials.endpoint.slice(0, -1) 
      : credentials.endpoint;
    
    this.headers = {
      'Content-Type': 'application/json',
      'api-key': credentials.key
    };
  }

  /**
   * Create or update the search index with multilingual schema
   */
  async createOrUpdateIndex(
    indexName: string = this.credentials.indexName,
    customFields: SearchIndexField[] = []
  ): Promise<boolean> {
    try {
      const schema = this.buildMultilingualIndexSchema(indexName, customFields);
      
      const url = `${this.baseUrl}/indexes/${indexName}?api-version=2023-11-01`;
      
      const response = await this.makeRequest('PUT', url, schema);
      
      if (response.ok) {
        console.log(`Successfully created/updated index: ${indexName}`);
        return true;
      } else {
        const error = await response.json();
        throw new AzureSearchIndexingError(
          'INDEX_CREATION_FAILED',
          `Failed to create/update index: ${error.error?.message || 'Unknown error'}`,
          response.status,
          response.status >= 500
        );
      }
    } catch (error) {
      if (error instanceof AzureSearchIndexingError) {
        throw error;
      }
      throw new AzureSearchIndexingError(
        'INDEX_CREATION_ERROR',
        `Error creating/updating index: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        true
      );
    }
  }

  /**
   * Index document chunks in batches with error handling and retry logic
   */
  async indexDocumentChunks(
    chunks: IndexableDocumentChunk[],
    indexName: string = this.credentials.indexName,
    batchSize: number = 100,
    progressCallback?: IndexingProgressCallback
  ): Promise<BatchIndexingResult> {
    const startTime = Date.now();
    let documentsIndexed = 0;
    let documentsSkipped = 0;
    const allErrors: IndexingError[] = [];

    try {
      // Validate chunks before processing
      progressCallback?.({
        stage: 'preparing',
        progress: 0,
        message: 'Validating document chunks...',
        documentsProcessed: 0,
        totalDocuments: chunks.length,
        errors: []
      });

      const validChunks = this.validateChunks(chunks);
      if (validChunks.length !== chunks.length) {
        documentsSkipped = chunks.length - validChunks.length;
        console.warn(`Skipped ${documentsSkipped} invalid chunks`);
      }

      if (validChunks.length === 0) {
        return {
          success: false,
          documentsIndexed: 0,
          documentsSkipped: chunks.length,
          errors: [{
            documentId: 'batch',
            errorCode: 'NO_VALID_CHUNKS',
            errorMessage: 'No valid chunks to index',
            statusCode: 400,
            retryable: false
          }],
          duration: Date.now() - startTime,
          indexName
        };
      }

      // Process chunks in batches
      const batches = this.createBatches(validChunks, batchSize);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        progressCallback?.({
          stage: 'indexing',
          progress: Math.round((batchIndex / batches.length) * 90),
          message: `Indexing batch ${batchIndex + 1} of ${batches.length}...`,
          documentsProcessed: documentsIndexed,
          totalDocuments: validChunks.length,
          errors: allErrors
        });

        try {
          const batchResult = await this.indexBatch(batch, indexName);
          documentsIndexed += batchResult.successCount;
          allErrors.push(...batchResult.errors);
        } catch (error) {
          // Handle batch-level errors
          const batchError: IndexingError = {
            documentId: `batch_${batchIndex}`,
            errorCode: 'BATCH_INDEXING_FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown batch error',
            statusCode: error instanceof AzureSearchIndexingError ? error.statusCode || 500 : 500,
            retryable: error instanceof AzureSearchIndexingError ? error.retryable : true
          };
          allErrors.push(batchError);
          
          // Skip this batch but continue with others
          console.error(`Batch ${batchIndex} failed:`, batchError.errorMessage);
        }
      }

      // Final validation
      progressCallback?.({
        stage: 'validating',
        progress: 95,
        message: 'Validating indexing results...',
        documentsProcessed: documentsIndexed,
        totalDocuments: validChunks.length,
        errors: allErrors
      });

      // Check index health after indexing
      const healthStatus = await this.checkIndexHealth(indexName);
      if (healthStatus.status === 'unhealthy') {
        console.warn(`Index ${indexName} is unhealthy after indexing:`, healthStatus.issues);
      }

      progressCallback?.({
        stage: 'completed',
        progress: 100,
        message: `Indexing completed: ${documentsIndexed} documents indexed`,
        documentsProcessed: documentsIndexed,
        totalDocuments: validChunks.length,
        errors: allErrors
      });

      return {
        success: allErrors.length === 0 || documentsIndexed > 0,
        documentsIndexed,
        documentsSkipped,
        errors: allErrors,
        duration: Date.now() - startTime,
        indexName
      };

    } catch (error) {
      const indexingError: IndexingError = {
        documentId: 'batch_operation',
        errorCode: 'INDEXING_OPERATION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown indexing error',
        statusCode: error instanceof AzureSearchIndexingError ? error.statusCode || 500 : 500,
        retryable: error instanceof AzureSearchIndexingError ? error.retryable : true
      };

      return {
        success: false,
        documentsIndexed,
        documentsSkipped,
        errors: [indexingError],
        duration: Date.now() - startTime,
        indexName
      };
    }
  }

  /**
   * Check the health and status of a search index
   */
  async checkIndexHealth(indexName: string = this.credentials.indexName): Promise<IndexHealthStatus> {
    try {
      // Check if index exists and get basic info
      const indexUrl = `${this.baseUrl}/indexes/${indexName}?api-version=2023-11-01`;
      const indexResponse = await this.makeRequest('GET', indexUrl);

      if (!indexResponse.ok) {
        if (indexResponse.status === 404) {
          return {
            indexName,
            exists: false,
            documentCount: 0,
            storageSize: 0,
            status: 'unhealthy',
            issues: ['Index does not exist'],
            warnings: []
          };
        }
        throw new Error(`Failed to get index info: ${indexResponse.status}`);
      }

      const indexInfo = await indexResponse.json();

      // Get index statistics
      const statsUrl = `${this.baseUrl}/indexes/${indexName}/stats?api-version=2023-11-01`;
      const statsResponse = await this.makeRequest('GET', statsUrl);

      let documentCount = 0;
      let storageSize = 0;
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        documentCount = stats.documentCount || 0;
        storageSize = stats.storageSize || 0;
      }

      // Analyze health status
      const issues: string[] = [];
      const warnings: string[] = [];
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      // Check for common issues
      if (documentCount === 0) {
        warnings.push('Index contains no documents');
      }

      if (storageSize > 1000000000) { // 1GB
        warnings.push('Index storage size is large, consider optimization');
      }

      // Check index schema for required fields
      const requiredFields = ['id', 'content', 'embedding', 'filePath', 'originalLanguage'];
      const indexFields = indexInfo.fields?.map((f: any) => f.name) || [];
      const missingFields = requiredFields.filter(field => !indexFields.includes(field));
      
      if (missingFields.length > 0) {
        issues.push(`Missing required fields: ${missingFields.join(', ')}`);
        status = 'degraded';
      }

      // Determine overall status
      if (issues.length > 0) {
        status = issues.some(issue => issue.includes('Missing required fields')) ? 'degraded' : 'unhealthy';
      }

      return {
        indexName,
        exists: true,
        documentCount,
        storageSize,
        lastModified: indexInfo.lastModified ? new Date(indexInfo.lastModified) : undefined,
        status,
        issues,
        warnings
      };

    } catch (error) {
      return {
        indexName,
        exists: false,
        documentCount: 0,
        storageSize: 0,
        status: 'unhealthy',
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Delete documents from the index by document IDs
   */
  async deleteDocuments(
    documentIds: string[],
    indexName: string = this.credentials.indexName
  ): Promise<{ success: boolean; deletedCount: number; errors: IndexingError[] }> {
    try {
      if (documentIds.length === 0) {
        return { success: true, deletedCount: 0, errors: [] };
      }

      const deleteActions = documentIds.map(id => ({
        '@search.action': 'delete',
        id: id
      }));

      const batchResult = await this.indexBatch(deleteActions, indexName);
      
      return {
        success: batchResult.errors.length === 0,
        deletedCount: batchResult.successCount,
        errors: batchResult.errors
      };

    } catch (error) {
      return {
        success: false,
        deletedCount: 0,
        errors: [{
          documentId: 'delete_operation',
          errorCode: 'DELETE_FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown delete error',
          statusCode: error instanceof AzureSearchIndexingError ? error.statusCode || 500 : 500,
          retryable: error instanceof AzureSearchIndexingError ? error.retryable : true
        }]
      };
    }
  }

  /**
   * Clear all documents from the index
   */
  async clearIndex(indexName: string = this.credentials.indexName): Promise<boolean> {
    try {
      // Get all document IDs first
      const searchUrl = `${this.baseUrl}/indexes/${indexName}/docs?api-version=2023-11-01&$select=id&$top=1000`;
      const response = await this.makeRequest('GET', searchUrl);

      if (!response.ok) {
        throw new AzureSearchIndexingError(
          'CLEAR_INDEX_FAILED',
          `Failed to get documents for clearing: ${response.status}`,
          response.status,
          response.status >= 500
        );
      }

      const result = await response.json();
      const documentIds = result.value?.map((doc: any) => doc.id) || [];

      if (documentIds.length === 0) {
        return true; // Index is already empty
      }

      // Delete all documents
      const deleteResult = await this.deleteDocuments(documentIds, indexName);
      return deleteResult.success;

    } catch (error) {
      console.error(`Failed to clear index ${indexName}:`, error);
      return false;
    }
  }

  /**
   * Build the multilingual search index schema
   */
  private buildMultilingualIndexSchema(indexName: string, customFields: SearchIndexField[] = []): SearchIndexSchema {
    const baseFields: SearchIndexField[] = [
      {
        name: 'id',
        type: 'Edm.String',
        key: true,
        searchable: false,
        filterable: true,
        retrievable: true
      },
      {
        name: 'content',
        type: 'Edm.String',
        searchable: true,
        filterable: false,
        retrievable: true,
        analyzer: 'standard.lucene'
      },
      {
        name: 'embedding',
        type: 'Collection(Edm.Single)',
        searchable: true,
        filterable: false,
        retrievable: true,
        dimensions: 1536,
        vectorSearchProfile: 'default-vector-profile'
      },
      {
        name: 'filePath',
        type: 'Edm.String',
        searchable: false,
        filterable: true,
        retrievable: true,
        facetable: true
      },
      {
        name: 'fileName',
        type: 'Edm.String',
        searchable: true,
        filterable: true,
        retrievable: true,
        facetable: true
      },
      {
        name: 'chunkIndex',
        type: 'Edm.Int32',
        searchable: false,
        filterable: true,
        retrievable: true,
        sortable: true
      },
      {
        name: 'totalChunks',
        type: 'Edm.Int32',
        searchable: false,
        filterable: true,
        retrievable: true
      },
      {
        name: 'originalLanguage',
        type: 'Edm.String',
        searchable: false,
        filterable: true,
        retrievable: true,
        facetable: true
      },
      {
        name: 'targetLanguage',
        type: 'Edm.String',
        searchable: false,
        filterable: true,
        retrievable: true,
        facetable: true
      },
      {
        name: 'isTranslated',
        type: 'Edm.Boolean',
        searchable: false,
        filterable: true,
        retrievable: true,
        facetable: true
      },
      {
        name: 'documentType',
        type: 'Edm.String',
        searchable: false,
        filterable: true,
        retrievable: true,
        facetable: true
      },
      {
        name: 'uploadTimestamp',
        type: 'Edm.DateTimeOffset',
        searchable: false,
        filterable: true,
        retrievable: true,
        sortable: true
      },
      {
        name: 'processingTimestamp',
        type: 'Edm.DateTimeOffset',
        searchable: false,
        filterable: true,
        retrievable: true,
        sortable: true
      },
      {
        name: 'contentHash',
        type: 'Edm.String',
        searchable: false,
        filterable: true,
        retrievable: true
      },
      {
        name: 'chunkSize',
        type: 'Edm.Int32',
        searchable: false,
        filterable: true,
        retrievable: true
      },
      {
        name: 'tokenCount',
        type: 'Edm.Int32',
        searchable: false,
        filterable: true,
        retrievable: true,
        sortable: true
      }
    ];

    // Merge with custom fields
    const allFields = [...baseFields, ...customFields];

    return {
      name: indexName,
      fields: allFields,
      corsOptions: {
        allowedOrigins: ['*'],
        maxAgeInSeconds: 300
      },
      suggesters: [
        {
          name: 'content-suggester',
          searchMode: 'analyzingInfixMatching',
          sourceFields: ['content', 'fileName']
        }
      ],
      scoringProfiles: [
        {
          name: 'multilingual-boost',
          text: {
            weights: {
              content: 2.0,
              fileName: 1.5
            }
          },
          functions: [
            {
              type: 'freshness',
              boost: 1.2,
              fieldName: 'processingTimestamp',
              interpolation: 'linear'
            }
          ]
        }
      ]
    };
  }

  /**
   * Validate document chunks before indexing
   */
  private validateChunks(chunks: IndexableDocumentChunk[]): IndexableDocumentChunk[] {
    return chunks.filter(chunk => {
      // Check required fields
      if (!chunk.id || !chunk.content || !chunk.metadata) {
        console.warn(`Skipping chunk with missing required fields: ${chunk.id}`);
        return false;
      }

      // Check content length
      if (chunk.content.length === 0 || chunk.content.length > 32000) {
        console.warn(`Skipping chunk with invalid content length: ${chunk.id}`);
        return false;
      }

      // Check embedding dimensions if present
      if (chunk.embedding && chunk.embedding.length !== 1536) {
        console.warn(`Skipping chunk with invalid embedding dimensions: ${chunk.id}`);
        return false;
      }

      // Check metadata completeness
      const metadata = chunk.metadata;
      if (!metadata.filePath || !metadata.originalLanguage || !metadata.targetLanguage) {
        console.warn(`Skipping chunk with incomplete metadata: ${chunk.id}`);
        return false;
      }

      return true;
    });
  }

  /**
   * Create batches from array for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Index a single batch of documents with retry logic
   */
  private async indexBatch(
    documents: any[],
    indexName: string
  ): Promise<{ successCount: number; errors: IndexingError[] }> {
    const batchPayload = {
      value: documents.map(doc => ({
        '@search.action': 'mergeOrUpload',
        id: doc.id,
        content: doc.content,
        embedding: doc.embedding,
        // Flatten metadata to root level for Azure Search
        ...(doc.metadata || {})
      }))
    };

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `${this.baseUrl}/indexes/${indexName}/docs/index?api-version=2023-11-01`;
        const response = await this.makeRequest('POST', url, batchPayload);

        if (response.ok) {
          const result = await response.json();
          const errors: IndexingError[] = [];
          let successCount = 0;

          // Process individual document results
          if (result.value) {
            result.value.forEach((docResult: any) => {
              if (docResult.status && docResult.statusCode >= 200 && docResult.statusCode < 300) {
                successCount++;
              } else {
                errors.push({
                  documentId: docResult.key || 'unknown',
                  errorCode: docResult.errorMessage || 'UNKNOWN_ERROR',
                  errorMessage: docResult.errorMessage || 'Unknown indexing error',
                  statusCode: docResult.statusCode || 500,
                  retryable: docResult.statusCode >= 500
                });
              }
            });
          } else {
            // If no individual results, assume all succeeded
            successCount = documents.length;
          }

          return { successCount, errors };
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = new AzureSearchIndexingError(
            'BATCH_INDEXING_FAILED',
            errorData.error?.message || `HTTP ${response.status}`,
            response.status,
            response.status >= 500
          );
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }

      // Wait before retry (except on last attempt)
      if (attempt < this.maxRetries) {
        const delay = this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    throw lastError || new Error('Batch indexing failed after all retries');
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  private async makeRequest(
    method: string,
    url: string,
    body?: any
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AzureSearchIndexingError(
          'REQUEST_TIMEOUT',
          `Request timed out after ${this.defaultTimeout}ms`,
          408,
          true
        );
      }
      
      throw error;
    }
  }

  /**
   * Generate unique document ID for chunk
   */
  static generateChunkId(filePath: string, chunkIndex: number, contentHash?: string): string {
    const pathHash = Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const hashSuffix = contentHash ? `_${contentHash.substring(0, 8)}` : '';
    return `chunk_${pathHash}_${chunkIndex}${hashSuffix}`;
  }

  /**
   * Convert document chunk to indexable format
   */
  static convertToIndexableChunk(
    chunk: any,
    filePath: string,
    chunkIndex: number,
    metadata: Partial<ChunkIndexMetadata> = {}
  ): IndexableDocumentChunk {
    const now = new Date().toISOString();
    const fileName = filePath.split('/').pop() || filePath;
    const documentType = fileName.split('.').pop()?.toLowerCase() || 'unknown';
    
    // Generate content hash for deduplication
    const contentHash = Buffer.from(chunk.content || '').toString('base64').substring(0, 16);
    
    return {
      id: this.generateChunkId(filePath, chunkIndex, contentHash),
      content: chunk.content || '',
      embedding: chunk.embedding,
      metadata: {
        filePath,
        fileName,
        chunkIndex,
        totalChunks: metadata.totalChunks || 1,
        originalLanguage: metadata.originalLanguage || 'unknown',
        targetLanguage: metadata.targetLanguage || 'en',
        isTranslated: metadata.isTranslated || false,
        documentType,
        uploadTimestamp: metadata.uploadTimestamp || now,
        processingTimestamp: now,
        contentHash,
        chunkSize: chunk.content?.length || 0,
        tokenCount: metadata.tokenCount,
        ...metadata
      }
    };
  }
}