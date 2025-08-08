import { AzureTranslatorCredentials } from './multilingual-configuration-manager';

// Translation service interfaces
export interface TranslationResult {
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface TranslationBatchResult {
  results: TranslationResult[];
  errors: TranslationError[];
  totalProcessed: number;
  totalFailed: number;
}

export interface TranslationError {
  originalText: string;
  error: string;
  index: number;
  retryable: boolean;
}

export interface TranslationOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  batchSize?: number;
  includeAlignment?: boolean;
  includeSentenceLength?: boolean;
}

// Azure Translator API response interfaces
interface AzureTranslatorResponse {
  translations: Array<{
    text: string;
    to: string;
  }>;
  detectedLanguage?: {
    language: string;
    score: number;
  };
}

interface AzureTranslatorBatchResponse extends Array<AzureTranslatorResponse> {}

// Translation service error classes
export class TranslationServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TranslationServiceError';
  }
}

export class TranslationRateLimitError extends TranslationServiceError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429, true);
    this.name = 'TranslationRateLimitError';
  }
}

export class TranslationQuotaExceededError extends TranslationServiceError {
  constructor(message: string) {
    super(message, 'QUOTA_EXCEEDED', 403, false);
    this.name = 'TranslationQuotaExceededError';
  }
}

export class UnsupportedLanguageError extends TranslationServiceError {
  constructor(language: string) {
    super(`Unsupported language: ${language}`, 'UNSUPPORTED_LANGUAGE', 400, false);
    this.name = 'UnsupportedLanguageError';
  }
}

export class TranslationService {
  private credentials: AzureTranslatorCredentials;
  private defaultOptions: Required<TranslationOptions>;
  private supportedLanguages: Set<string>;

  constructor(
    credentials: AzureTranslatorCredentials,
    options: TranslationOptions = {}
  ) {
    this.credentials = credentials;
    this.defaultOptions = {
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
      timeoutMs: options.timeoutMs ?? 30000,
      batchSize: options.batchSize ?? 25, // Azure Translator limit is 100, but we use 25 for better performance
      includeAlignment: options.includeAlignment ?? false,
      includeSentenceLength: options.includeSentenceLength ?? false
    };

    // Initialize supported languages (Azure Translator supports 100+ languages)
    this.supportedLanguages = new Set([
      'af', 'ar', 'bg', 'bn', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'fa', 'fi', 'fr', 'ga', 'gu', 'he', 'hi', 'hr', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'ka', 'kk', 'km', 'kn', 'ko', 'ku', 'ky', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'or', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'sk', 'sl', 'sm', 'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'tl', 'to', 'tr', 'ty', 'uk', 'ur', 'uz', 'vi', 'zh'
    ]);
  }

  /**
   * Translate a single text from one language to another
   */
  async translateText(
    text: string,
    fromLanguage: string,
    toLanguage: string,
    options: TranslationOptions = {}
  ): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      throw new TranslationServiceError('Text cannot be empty');
    }

    this.validateLanguages(fromLanguage, toLanguage);

    const mergedOptions = { ...this.defaultOptions, ...options };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= mergedOptions.maxRetries; attempt++) {
      try {
        const response = await this.makeTranslationRequest(
          [{ text }],
          fromLanguage,
          toLanguage,
          mergedOptions
        );

        if (response.length === 0 || !response[0].translations || response[0].translations.length === 0) {
          throw new TranslationServiceError('Empty response from translation service');
        }

        const translationResponse = response[0];
        const translation = translationResponse.translations[0];

        return {
          translatedText: translation.text,
          originalLanguage: fromLanguage,
          targetLanguage: toLanguage,
          confidence: translationResponse.detectedLanguage?.score ?? 1.0
        };

      } catch (error) {
        lastError = error as Error;

        if (error instanceof TranslationRateLimitError) {
          const delay = error.retryAfter ? error.retryAfter * 1000 : this.calculateRetryDelay(attempt, mergedOptions.retryDelayMs);
          await this.sleep(delay);
          continue;
        }

        if (error instanceof TranslationServiceError && !error.retryable) {
          throw error;
        }

        if (attempt < mergedOptions.maxRetries) {
          const delay = this.calculateRetryDelay(attempt, mergedOptions.retryDelayMs);
          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    throw new TranslationServiceError(
      `Translation failed after ${mergedOptions.maxRetries + 1} attempts: ${lastError?.message}`,
      'MAX_RETRIES_EXCEEDED',
      undefined,
      false
    );
  }

  /**
   * Translate multiple texts in batch for better performance
   */
  async translateBatch(
    texts: string[],
    fromLanguage: string,
    toLanguage: string,
    options: TranslationOptions = {}
  ): Promise<TranslationBatchResult> {
    if (!texts || texts.length === 0) {
      return {
        results: [],
        errors: [],
        totalProcessed: 0,
        totalFailed: 0
      };
    }

    this.validateLanguages(fromLanguage, toLanguage);

    const mergedOptions = { ...this.defaultOptions, ...options };
    const results: TranslationResult[] = [];
    const errors: TranslationError[] = [];

    // Filter out empty texts and track their original indices
    const validTexts: Array<{ text: string; originalIndex: number }> = [];
    texts.forEach((text, index) => {
      if (text && text.trim().length > 0) {
        validTexts.push({ text: text.trim(), originalIndex: index });
      } else {
        errors.push({
          originalText: text,
          error: 'Empty or whitespace-only text',
          index,
          retryable: false
        });
      }
    });

    // Process texts in batches
    for (let i = 0; i < validTexts.length; i += mergedOptions.batchSize) {
      const batch = validTexts.slice(i, i + mergedOptions.batchSize);
      const batchTexts = batch.map(item => ({ text: item.text }));

      let lastError: Error | null = null;
      let batchSuccess = false;

      for (let attempt = 0; attempt <= mergedOptions.maxRetries; attempt++) {
        try {
          const response = await this.makeTranslationRequest(
            batchTexts,
            fromLanguage,
            toLanguage,
            mergedOptions
          );

          // Process successful translations
          response.forEach((translationResponse, batchIndex) => {
            const originalIndex = batch[batchIndex].originalIndex;
            
            if (translationResponse.translations && translationResponse.translations.length > 0) {
              const translation = translationResponse.translations[0];
              results[originalIndex] = {
                translatedText: translation.text,
                originalLanguage: fromLanguage,
                targetLanguage: toLanguage,
                confidence: translationResponse.detectedLanguage?.score ?? 1.0
              };
            } else {
              errors.push({
                originalText: batch[batchIndex].text,
                error: 'Empty translation response',
                index: originalIndex,
                retryable: false
              });
            }
          });

          batchSuccess = true;
          break;

        } catch (error) {
          lastError = error as Error;

          if (error instanceof TranslationRateLimitError) {
            const delay = error.retryAfter ? error.retryAfter * 1000 : this.calculateRetryDelay(attempt, mergedOptions.retryDelayMs);
            await this.sleep(delay);
            continue;
          }

          if (error instanceof TranslationServiceError && !error.retryable) {
            // Add all texts in this batch to errors
            batch.forEach((item, batchIndex) => {
              errors.push({
                originalText: item.text,
                error: error.message,
                index: item.originalIndex,
                retryable: false
              });
            });
            batchSuccess = true; // Don't retry non-retryable errors
            break;
          }

          if (attempt < mergedOptions.maxRetries) {
            const delay = this.calculateRetryDelay(attempt, mergedOptions.retryDelayMs);
            await this.sleep(delay);
            continue;
          }

          break;
        }
      }

      if (!batchSuccess) {
        // Add all texts in this batch to errors
        batch.forEach((item) => {
          errors.push({
            originalText: item.text,
            error: `Translation failed after ${mergedOptions.maxRetries + 1} attempts: ${lastError?.message}`,
            index: item.originalIndex,
            retryable: true
          });
        });
      }
    }

    return {
      results: results.filter(result => result !== undefined),
      errors,
      totalProcessed: results.filter(result => result !== undefined).length,
      totalFailed: errors.length
    };
  }

  /**
   * Check if a language is supported by the translation service
   */
  isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.has(language.toLowerCase());
  }

  /**
   * Get list of all supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.supportedLanguages).sort();
  }

  /**
   * Validate that the provided languages are supported
   */
  private validateLanguages(fromLanguage: string, toLanguage: string): void {
    if (!this.isLanguageSupported(fromLanguage)) {
      throw new UnsupportedLanguageError(fromLanguage);
    }

    if (!this.isLanguageSupported(toLanguage)) {
      throw new UnsupportedLanguageError(toLanguage);
    }

    if (fromLanguage.toLowerCase() === toLanguage.toLowerCase()) {
      throw new TranslationServiceError('Source and target languages cannot be the same');
    }
  }

  /**
   * Make the actual HTTP request to Azure Translator API
   */
  private async makeTranslationRequest(
    texts: Array<{ text: string }>,
    fromLanguage: string,
    toLanguage: string,
    options: Required<TranslationOptions>
  ): Promise<AzureTranslatorBatchResponse> {
    const url = `${this.credentials.endpoint}/translate?api-version=3.0&from=${fromLanguage}&to=${toLanguage}`;
    
    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': this.credentials.key,
      'Ocp-Apim-Subscription-Region': this.credentials.region,
      'Content-Type': 'application/json',
      'X-ClientTraceId': this.generateTraceId()
    };

    // Add optional parameters
    const urlParams = new URLSearchParams();
    if (options.includeAlignment) {
      urlParams.append('includeAlignment', 'true');
    }
    if (options.includeSentenceLength) {
      urlParams.append('includeSentenceLength', 'true');
    }

    const finalUrl = urlParams.toString() ? `${url}&${urlParams.toString()}` : url;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(texts),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result = await response.json() as AzureTranslatorBatchResponse;
      return result;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof TranslationServiceError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TranslationServiceError(
            `Translation request timed out after ${options.timeoutMs}ms`,
            'TIMEOUT',
            undefined,
            true
          );
        }

        if (error.message.includes('fetch')) {
          throw new TranslationServiceError(
            `Network error: ${error.message}`,
            'NETWORK_ERROR',
            undefined,
            true
          );
        }
      }

      throw new TranslationServiceError(
        `Unexpected error: ${error}`,
        'UNKNOWN_ERROR',
        undefined,
        true
      );
    }
  }

  /**
   * Handle error responses from Azure Translator API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorMessage = `HTTP ${statusCode}: ${response.statusText}`;

    try {
      const errorBody = await response.json();
      if (errorBody.error && errorBody.error.message) {
        errorMessage = errorBody.error.message;
      }
    } catch {
      // If we can't parse the error body, use the default message
    }

    switch (statusCode) {
      case 400:
        throw new TranslationServiceError(errorMessage, 'BAD_REQUEST', statusCode, false);
      
      case 401:
        throw new TranslationServiceError('Invalid authentication credentials', 'UNAUTHORIZED', statusCode, false);
      
      case 403:
        if (errorMessage.toLowerCase().includes('quota')) {
          throw new TranslationQuotaExceededError(errorMessage);
        }
        throw new TranslationServiceError(errorMessage, 'FORBIDDEN', statusCode, false);
      
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        throw new TranslationRateLimitError(errorMessage, retryAfterSeconds);
      
      case 500:
      case 502:
      case 503:
      case 504:
        throw new TranslationServiceError(errorMessage, 'SERVER_ERROR', statusCode, true);
      
      default:
        throw new TranslationServiceError(errorMessage, 'UNKNOWN_ERROR', statusCode, statusCode >= 500);
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateRetryDelay(attempt: number, baseDelayMs: number): number {
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add up to 10% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a unique trace ID for request tracking
   */
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Test the connection to Azure Translator service
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test with a simple translation
      await this.translateText('Hello', 'en', 'es', { maxRetries: 1, timeoutMs: 10000 });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get service statistics and limits information
   */
  async getServiceInfo(): Promise<{
    supportedLanguages: string[];
    maxBatchSize: number;
    defaultTimeout: number;
    maxRetries: number;
  }> {
    return {
      supportedLanguages: this.getSupportedLanguages(),
      maxBatchSize: this.defaultOptions.batchSize,
      defaultTimeout: this.defaultOptions.timeoutMs,
      maxRetries: this.defaultOptions.maxRetries
    };
  }
}

// Factory function to create translation service with configuration
export async function createTranslationService(
  credentials: AzureTranslatorCredentials,
  options?: TranslationOptions
): Promise<TranslationService> {
  const service = new TranslationService(credentials, options);
  
  // Test the connection during creation
  const connectionTest = await service.testConnection();
  if (!connectionTest.success) {
    throw new TranslationServiceError(
      `Failed to connect to Azure Translator service: ${connectionTest.error}`,
      'CONNECTION_FAILED',
      undefined,
      false
    );
  }

  return service;
}

// Export types for external use
export type {
  TranslationOptions,
  AzureTranslatorCredentials
};