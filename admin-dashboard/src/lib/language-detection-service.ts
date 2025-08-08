import { AzureTranslatorCredentials } from './multilingual-configuration-manager';

// Language detection result interface
export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  isSupported: boolean;
}

// Batch language detection result
export interface BatchLanguageDetectionResult {
  results: LanguageDetectionResult[];
  errors: LanguageDetectionError[];
}

// Language detection error
export class LanguageDetectionError extends Error {
  constructor(
    public text: string,
    public originalError: Error,
    public retryable: boolean = true
  ) {
    super(`Language detection failed for text: ${originalError.message}`);
    this.name = 'LanguageDetectionError';
  }
}

// Azure Translator API response interfaces
interface AzureDetectResponse {
  language: string;
  score: number;
  isTranslationSupported: boolean;
  isTransliterationSupported: boolean;
  alternatives?: Array<{
    language: string;
    score: number;
    isTranslationSupported: boolean;
    isTransliterationSupported: boolean;
  }>;
}

interface AzureDetectBatchResponse extends Array<AzureDetectResponse> {}

export class LanguageDetectionService {
  private credentials: AzureTranslatorCredentials;
  private supportedLanguages: string[];
  private confidenceThreshold: number;
  private simulationMode: boolean;

  constructor(
    credentials: AzureTranslatorCredentials,
    supportedLanguages: string[] = [],
    confidenceThreshold: number = 0.8,
    simulationMode: boolean = false
  ) {
    this.credentials = credentials;
    this.supportedLanguages = supportedLanguages;
    this.confidenceThreshold = confidenceThreshold;
    this.simulationMode = simulationMode;
  }

  /**
   * Detect language for a single text
   */
  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    if (!text || text.trim().length === 0) {
      throw new LanguageDetectionError(
        text,
        new Error('Text cannot be empty'),
        false
      );
    }

    // Simulation mode for testing
    if (this.simulationMode) {
      return this.simulateLanguageDetection(text);
    }

    try {
      const response = await this.callAzureDetectAPI([text]);
      const detection = response[0];
      
      return this.mapAzureResponseToResult(detection, text);
    } catch (error) {
      throw new LanguageDetectionError(
        text,
        error instanceof Error ? error : new Error(String(error)),
        this.isRetryableError(error)
      );
    }
  }

  /**
   * Detect language for multiple texts in batch
   */
  async detectLanguageBatch(texts: string[]): Promise<BatchLanguageDetectionResult> {
    if (!texts || texts.length === 0) {
      return { results: [], errors: [] };
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    const results: LanguageDetectionResult[] = [];
    const errors: LanguageDetectionError[] = [];

    if (validTexts.length === 0) {
      return { results, errors };
    }

    // Simulation mode for testing
    if (this.simulationMode) {
      for (const text of validTexts) {
        try {
          results.push(this.simulateLanguageDetection(text));
        } catch (error) {
          errors.push(error as LanguageDetectionError);
        }
      }
      return { results, errors };
    }

    try {
      const response = await this.callAzureDetectAPI(validTexts);
      
      for (let i = 0; i < response.length; i++) {
        try {
          const result = this.mapAzureResponseToResult(response[i], validTexts[i]);
          results.push(result);
        } catch (error) {
          errors.push(new LanguageDetectionError(
            validTexts[i],
            error instanceof Error ? error : new Error(String(error)),
            false
          ));
        }
      }
    } catch (error) {
      // If the entire batch fails, create errors for all texts
      for (const text of validTexts) {
        errors.push(new LanguageDetectionError(
          text,
          error instanceof Error ? error : new Error(String(error)),
          this.isRetryableError(error)
        ));
      }
    }

    return { results, errors };
  }

  /**
   * Check if a language is supported for translation
   */
  isLanguageSupported(languageCode: string): boolean {
    if (this.supportedLanguages.length === 0) {
      // If no supported languages specified, assume all are supported
      return true;
    }
    return this.supportedLanguages.includes(languageCode.toLowerCase());
  }

  /**
   * Update supported languages list
   */
  updateSupportedLanguages(languages: string[]): void {
    this.supportedLanguages = languages.map(lang => lang.toLowerCase());
  }

  /**
   * Update confidence threshold
   */
  updateConfidenceThreshold(threshold: number): void {
    if (threshold < 0.1 || threshold > 1.0) {
      throw new Error('Confidence threshold must be between 0.1 and 1.0');
    }
    this.confidenceThreshold = threshold;
  }

  /**
   * Call Azure Translator detect API
   */
  private async callAzureDetectAPI(texts: string[]): Promise<AzureDetectBatchResponse> {
    const baseUrl = this.credentials.endpoint.endsWith('/') 
      ? this.credentials.endpoint.slice(0, -1) 
      : this.credentials.endpoint;
    const url = `${baseUrl}/detect?api-version=3.0`;
    
    const requestBody = texts.map(text => ({ Text: text }));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.credentials.key,
        'Ocp-Apim-Subscription-Region': this.credentials.region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Translator API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data as AzureDetectBatchResponse;
  }

  /**
   * Map Azure API response to our result format
   */
  private mapAzureResponseToResult(
    azureResponse: AzureDetectResponse,
    originalText: string
  ): LanguageDetectionResult {
    const confidence = azureResponse.score;
    const language = azureResponse.language;
    
    // Check if confidence meets threshold
    if (confidence < this.confidenceThreshold) {
      throw new Error(
        `Language detection confidence ${confidence} below threshold ${this.confidenceThreshold}`
      );
    }

    // Check if language is supported
    const isSupported = this.isLanguageSupported(language) && azureResponse.isTranslationSupported;

    return {
      language,
      confidence,
      isSupported
    };
  }

  /**
   * Simulate language detection for testing purposes
   */
  private simulateLanguageDetection(text: string): LanguageDetectionResult {
    // Simple heuristic-based language detection for simulation
    const romanianWords = ['și', 'cu', 'de', 'la', 'în', 'pe', 'pentru', 'este', 'sunt', 'avea', 'care', 'sau'];
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const frenchWords = ['le', 'la', 'les', 'et', 'ou', 'dans', 'sur', 'avec', 'pour', 'de', 'du', 'des'];
    const germanWords = ['der', 'die', 'das', 'und', 'oder', 'in', 'auf', 'mit', 'für', 'von', 'zu', 'bei'];
    
    const lowerText = text.toLowerCase();
    
    let romanianScore = 0;
    let englishScore = 0;
    let frenchScore = 0;
    let germanScore = 0;
    
    // Count matches for each language
    romanianWords.forEach(word => {
      if (lowerText.includes(word)) romanianScore++;
    });
    
    englishWords.forEach(word => {
      if (lowerText.includes(word)) englishScore++;
    });
    
    frenchWords.forEach(word => {
      if (lowerText.includes(word)) frenchScore++;
    });
    
    germanWords.forEach(word => {
      if (lowerText.includes(word)) germanScore++;
    });
    
    // Determine most likely language
    let detectedLanguage = 'en'; // Default to English
    let maxScore = englishScore;
    let confidence = 0.85; // Default confidence
    
    if (romanianScore > maxScore) {
      detectedLanguage = 'ro';
      maxScore = romanianScore;
      confidence = 0.9;
    }
    
    if (frenchScore > maxScore) {
      detectedLanguage = 'fr';
      maxScore = frenchScore;
      confidence = 0.87;
    }
    
    if (germanScore > maxScore) {
      detectedLanguage = 'de';
      maxScore = germanScore;
      confidence = 0.88;
    }
    
    // If no clear matches, lower confidence
    if (maxScore === 0) {
      confidence = 0.6;
    }
    
    return {
      language: detectedLanguage,
      confidence,
      isSupported: this.isLanguageSupported(detectedLanguage)
    };
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Network errors are retryable
      if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
        return true;
      }
      
      // Rate limiting errors are retryable
      if (message.includes('rate limit') || message.includes('429')) {
        return true;
      }
      
      // Server errors are retryable
      if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
        return true;
      }
    }
    
    // Client errors (4xx except 429) are generally not retryable
    return false;
  }

  /**
   * Get statistics about language detection results
   */
  static getDetectionStats(results: LanguageDetectionResult[]): {
    totalDetections: number;
    languageDistribution: Record<string, number>;
    averageConfidence: number;
    supportedLanguages: number;
    unsupportedLanguages: number;
  } {
    if (results.length === 0) {
      return {
        totalDetections: 0,
        languageDistribution: {},
        averageConfidence: 0,
        supportedLanguages: 0,
        unsupportedLanguages: 0
      };
    }

    const languageDistribution: Record<string, number> = {};
    let totalConfidence = 0;
    let supportedCount = 0;
    let unsupportedCount = 0;

    results.forEach(result => {
      // Count language distribution
      languageDistribution[result.language] = (languageDistribution[result.language] || 0) + 1;
      
      // Sum confidence scores
      totalConfidence += result.confidence;
      
      // Count supported vs unsupported
      if (result.isSupported) {
        supportedCount++;
      } else {
        unsupportedCount++;
      }
    });

    return {
      totalDetections: results.length,
      languageDistribution,
      averageConfidence: totalConfidence / results.length,
      supportedLanguages: supportedCount,
      unsupportedLanguages: unsupportedCount
    };
  }
}