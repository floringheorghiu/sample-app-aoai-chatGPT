import { AzureOpenAICredentials } from './multilingual-configuration-manager';

// Interfaces for embedding service
export interface EmbeddingRequest {
  text: string;
  id?: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  id?: string;
  metadata?: Record<string, any>;
  tokenCount?: number;
}

export interface BatchEmbeddingResult {
  success: boolean;
  results: EmbeddingResult[];
  errors: EmbeddingError[];
  totalTokens: number;
  processingTime: number;
}

export interface EmbeddingError {
  text: string;
  id?: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
}

export interface EmbeddingProgress {
  stage: 'preparing' | 'processing' | 'completed' | 'failed';
  processed: number;
  total: number;
  percentage: number;
  currentBatch?: number;
  totalBatches?: number;
  tokensUsed: number;
  estimatedCost?: number;
}

// Custom error class for embedding operations
export class EmbeddingServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'EmbeddingServiceError';
  }
}

// Rate limiting configuration
interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export class EmbeddingService {
  private credentials: AzureOpenAICredentials;
  private baseUrl: string;
  private headers: Record<string, string>;
  private rateLimitConfig: RateLimitConfig;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private tokenUsageTracker = {
    totalTokens: 0,
    requestCount: 0,
    resetTime: Date.now() + 60000 // Reset every minute
  };

  constructor(
    credentials: AzureOpenAICredentials,
    rateLimitConfig?: Partial<RateLimitConfig>
  ) {
    this.credentials = credentials;
    this.baseUrl = credentials.endpoint.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      'api-key': credentials.key
    };

    // Default rate limiting configuration
    this.rateLimitConfig = {
      requestsPerMinute: 60,
      tokensPerMinute: 120000,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      ...rateLimitConfig
    };
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string, id?: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new EmbeddingServiceError('Text cannot be empty', 'EMPTY_TEXT');
    }

    if (text.length > 8000) {
      throw new EmbeddingServiceError(
        'Text too long for embedding (max 8000 characters)',
        'TEXT_TOO_LONG'
      );
    }

    const request: EmbeddingRequest = { text: text.trim(), id };
    
    // For single embedding, call the API directly to preserve original error codes
    try {
      const result = await this.callEmbeddingAPI([request]);
      if (result.errors.length > 0) {
        const error = result.errors[0];
        throw new EmbeddingServiceError(error.errorMessage, error.errorCode, error.retryable);
      }
      if (result.results.length === 0) {
        throw new EmbeddingServiceError('No embedding generated', 'NO_RESULT');
      }
      return result.results[0];
    } catch (error) {
      if (error instanceof EmbeddingServiceError) {
        throw error;
      }
      throw new EmbeddingServiceError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR',
        true
      );
    }
  }

  /**
   * Generate embeddings for multiple texts with batch processing
   */
  async generateEmbeddingsBatch(
    requests: EmbeddingRequest[],
    batchSize: number = 10,
    progressCallback?: (progress: EmbeddingProgress) => void
  ): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    const results: EmbeddingResult[] = [];
    const errors: EmbeddingError[] = [];
    let totalTokens = 0;

    if (requests.length === 0) {
      return {
        success: true,
        results: [],
        errors: [],
        totalTokens: 0,
        processingTime: 0
      };
    }

    // Validate and filter requests
    const validRequests = this.validateRequests(requests);
    const invalidCount = requests.length - validRequests.length;

    if (invalidCount > 0) {
      console.warn(`Skipped ${invalidCount} invalid embedding requests`);
    }

    if (validRequests.length === 0) {
      return {
        success: false,
        results: [],
        errors: [
          {
            text: '',
            errorCode: 'NO_VALID_REQUESTS',
            errorMessage: 'No valid embedding requests provided',
            retryable: false
          }
        ],
        totalTokens: 0,
        processingTime: Date.now() - startTime
      };
    }

    // Process in batches
    const batches = this.createBatches(validRequests, batchSize);
    const totalBatches = batches.length;

    // Report initial progress
    if (progressCallback) {
      progressCallback({
        stage: 'preparing',
        processed: 0,
        total: validRequests.length,
        percentage: 0,
        totalBatches,
        tokensUsed: 0
      });
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        // Report batch processing progress
        if (progressCallback) {
          progressCallback({
            stage: 'processing',
            processed: results.length,
            total: validRequests.length,
            percentage: Math.round((results.length / validRequests.length) * 100),
            currentBatch: batchIndex + 1,
            totalBatches,
            tokensUsed: totalTokens
          });
        }

        const batchResult = await this.processBatch(batch);
        results.push(...batchResult.results);
        errors.push(...batchResult.errors);
        totalTokens += batchResult.totalTokens;

        // Add delay between batches to respect rate limits
        if (batchIndex < batches.length - 1) {
          await this.waitForRateLimit();
        }
      } catch (error) {
        console.error(`Batch ${batchIndex + 1} failed:`, error);
        
        // Add errors for all requests in the failed batch
        batch.forEach(request => {
          errors.push({
            text: request.text,
            id: request.id,
            errorCode: 'BATCH_FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown batch error',
            retryable: true
          });
        });
      }
    }

    const processingTime = Date.now() - startTime;
    const success = results.length > 0;

    // Report completion
    if (progressCallback) {
      progressCallback({
        stage: success ? 'completed' : 'failed',
        processed: results.length,
        total: validRequests.length,
        percentage: 100,
        totalBatches,
        tokensUsed: totalTokens,
        estimatedCost: this.estimateCost(totalTokens)
      });
    }

    return {
      success,
      results,
      errors,
      totalTokens,
      processingTime
    };
  }

  /**
   * Generate embeddings for document chunks with metadata preservation
   */
  async generateEmbeddingsForChunks(
    chunks: Array<{ content: string; metadata?: Record<string, any> }>,
    progressCallback?: (progress: EmbeddingProgress) => void
  ): Promise<BatchEmbeddingResult> {
    const requests: EmbeddingRequest[] = chunks.map((chunk, index) => ({
      text: chunk.content,
      id: `chunk_${index}`,
      metadata: chunk.metadata
    }));

    return this.generateEmbeddingsBatch(requests, 10, progressCallback);
  }

  /**
   * Process a single batch of embedding requests
   */
  private async processBatch(batch: EmbeddingRequest[]): Promise<BatchEmbeddingResult> {
    const maxRetries = this.rateLimitConfig.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.callEmbeddingAPI(batch);
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof EmbeddingServiceError && !error.retryable) {
          break;
        }

        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          console.warn(`Batch attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
          await this.sleep(delay);
        }
      }
    }

    // If all retries failed, return error results
    const errors: EmbeddingError[] = batch.map(request => ({
      text: request.text,
      id: request.id,
      errorCode: 'MAX_RETRIES_EXCEEDED',
      errorMessage: lastError?.message || 'Unknown error after max retries',
      retryable: false
    }));

    return {
      success: false,
      results: [],
      errors,
      totalTokens: 0,
      processingTime: 0
    };
  }

  /**
   * Make the actual API call to Azure OpenAI
   */
  private async callEmbeddingAPI(batch: EmbeddingRequest[]): Promise<BatchEmbeddingResult> {
    const texts = batch.map(req => req.text);
    const apiVersion = this.credentials.apiVersion || '2024-05-01-preview';
    
    const url = `${this.baseUrl}/openai/deployments/${this.credentials.embeddingModel}/embeddings?api-version=${apiVersion}`;
    
    const requestBody = {
      input: texts,
      model: this.credentials.embeddingModel
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      // Determine if error is retryable
      const retryable = response.status >= 500 || response.status === 429;
      
      throw new EmbeddingServiceError(
        errorMessage,
        this.mapHttpStatusToErrorCode(response.status),
        retryable,
        response.status
      );
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new EmbeddingServiceError(
        'Invalid response format from embedding API',
        'INVALID_RESPONSE',
        false
      );
    }

    // Process results
    const results: EmbeddingResult[] = [];
    const errors: EmbeddingError[] = [];

    data.data.forEach((item: any, index: number) => {
      const request = batch[index];
      
      if (item.embedding && Array.isArray(item.embedding)) {
        results.push({
          embedding: item.embedding,
          text: request.text,
          id: request.id,
          metadata: request.metadata,
          tokenCount: this.estimateTokenCount(request.text)
        });
      } else {
        errors.push({
          text: request.text,
          id: request.id,
          errorCode: 'INVALID_EMBEDDING',
          errorMessage: 'Invalid embedding data received',
          retryable: false
        });
      }
    });

    const totalTokens = data.usage?.total_tokens || 
      results.reduce((sum, result) => sum + (result.tokenCount || 0), 0);

    // Update token usage tracking
    this.updateTokenUsage(totalTokens);

    return {
      success: true,
      results,
      errors,
      totalTokens,
      processingTime: 0
    };
  }

  /**
   * Validate embedding requests
   */
  private validateRequests(requests: EmbeddingRequest[]): EmbeddingRequest[] {
    return requests.filter(request => {
      if (!request.text || typeof request.text !== 'string') {
        return false;
      }
      
      const trimmedText = request.text.trim();
      if (trimmedText.length === 0 || trimmedText.length > 8000) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Create batches from requests
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.rateLimitConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, this.rateLimitConfig.maxDelayMs);
  }

  /**
   * Wait for rate limit compliance
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 60000 / this.rateLimitConfig.requestsPerMinute;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Update token usage tracking
   */
  private updateTokenUsage(tokens: number): void {
    const now = Date.now();
    
    // Reset counters if a minute has passed
    if (now > this.tokenUsageTracker.resetTime) {
      this.tokenUsageTracker = {
        totalTokens: tokens,
        requestCount: 1,
        resetTime: now + 60000
      };
    } else {
      this.tokenUsageTracker.totalTokens += tokens;
      this.tokenUsageTracker.requestCount += 1;
    }
  }

  /**
   * Estimate token count for text
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost based on token usage
   */
  private estimateCost(tokens: number): number {
    // Azure OpenAI text-embedding-ada-002 pricing: ~$0.0001 per 1K tokens
    return (tokens / 1000) * 0.0001;
  }

  /**
   * Map HTTP status codes to error codes
   */
  private mapHttpStatusToErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 429:
        return 'RATE_LIMITED';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      case 504:
        return 'GATEWAY_TIMEOUT';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current token usage statistics
   */
  getTokenUsageStats(): {
    totalTokens: number;
    requestCount: number;
    resetTime: number;
    remainingTokens: number;
  } {
    const remainingTokens = Math.max(
      0,
      this.rateLimitConfig.tokensPerMinute - this.tokenUsageTracker.totalTokens
    );

    return {
      ...this.tokenUsageTracker,
      remainingTokens
    };
  }

  /**
   * Check if service is ready to process more requests
   */
  canProcessMoreRequests(): boolean {
    const stats = this.getTokenUsageStats();
    return stats.remainingTokens > 0;
  }

  /**
   * Get embedding model information
   */
  getModelInfo(): {
    model: string;
    dimensions: number;
    maxTokens: number;
  } {
    // Default to text-embedding-ada-002 specifications
    return {
      model: this.credentials.embeddingModel,
      dimensions: 1536,
      maxTokens: 8191
    };
  }
}