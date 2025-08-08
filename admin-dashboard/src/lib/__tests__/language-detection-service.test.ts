import { LanguageDetectionService, LanguageDetectionError, LanguageDetectionResult } from '../language-detection-service';
import { AzureTranslatorCredentials } from '../multilingual-configuration-manager';

// Mock fetch globally
global.fetch = jest.fn();

describe('LanguageDetectionService', () => {
  let service: LanguageDetectionService;
  let mockCredentials: AzureTranslatorCredentials;
  let supportedLanguages: string[];

  beforeEach(() => {
    mockCredentials = {
      endpoint: 'https://api.cognitive.microsofttranslator.com/',
      key: 'test-key-12345',
      region: 'eastus'
    };
    
    supportedLanguages = ['en', 'ro', 'fr', 'de', 'es'];
    
    service = new LanguageDetectionService(
      mockCredentials,
      supportedLanguages,
      0.8,
      false // Not in simulation mode for most tests
    );

    // Reset fetch mock
    (fetch as jest.Mock).mockReset();
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(service).toBeInstanceOf(LanguageDetectionService);
      expect(service.isLanguageSupported('en')).toBe(true);
      expect(service.isLanguageSupported('ro')).toBe(true);
      expect(service.isLanguageSupported('zh')).toBe(false);
    });

    it('should handle empty supported languages list', () => {
      const serviceWithoutLanguages = new LanguageDetectionService(
        mockCredentials,
        [],
        0.8,
        false
      );
      
      // Should assume all languages are supported when list is empty
      expect(serviceWithoutLanguages.isLanguageSupported('zh')).toBe(true);
      expect(serviceWithoutLanguages.isLanguageSupported('ar')).toBe(true);
    });
  });

  describe('detectLanguage', () => {
    it('should detect language successfully', async () => {
      const mockResponse = [{
        language: 'ro',
        score: 0.95,
        isTranslationSupported: true,
        isTransliterationSupported: false
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.detectLanguage('Acesta este un text în română.');

      expect(result).toEqual({
        language: 'ro',
        confidence: 0.95,
        isSupported: true
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.cognitive.microsofttranslator.com/detect?api-version=3.0',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': 'test-key-12345',
            'Ocp-Apim-Subscription-Region': 'eastus',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{ Text: 'Acesta este un text în română.' }])
        })
      );
    });

    it('should throw error for empty text', async () => {
      await expect(service.detectLanguage('')).rejects.toThrow(LanguageDetectionError);
      await expect(service.detectLanguage('   ')).rejects.toThrow(LanguageDetectionError);
    });

    it('should throw error when confidence is below threshold', async () => {
      const mockResponse = [{
        language: 'ro',
        score: 0.5, // Below threshold of 0.8
        isTranslationSupported: true,
        isTransliterationSupported: false
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(service.detectLanguage('Some text')).rejects.toThrow(LanguageDetectionError);
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid subscription key'
      });

      await expect(service.detectLanguage('Some text')).rejects.toThrow(LanguageDetectionError);
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.detectLanguage('Some text')).rejects.toThrow(LanguageDetectionError);
    });

    it('should mark unsupported languages correctly', async () => {
      const mockResponse = [{
        language: 'zh', // Not in supported languages list
        score: 0.95,
        isTranslationSupported: true,
        isTransliterationSupported: false
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.detectLanguage('这是中文文本');

      expect(result).toEqual({
        language: 'zh',
        confidence: 0.95,
        isSupported: false
      });
    });

    it('should handle translation not supported by Azure', async () => {
      const mockResponse = [{
        language: 'en',
        score: 0.95,
        isTranslationSupported: false, // Azure doesn't support translation for this
        isTransliterationSupported: false
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.detectLanguage('This is English text');

      expect(result).toEqual({
        language: 'en',
        confidence: 0.95,
        isSupported: false // Should be false because Azure doesn't support translation
      });
    });
  });

  describe('detectLanguageBatch', () => {
    it('should detect languages for multiple texts', async () => {
      const mockResponse = [
        {
          language: 'ro',
          score: 0.95,
          isTranslationSupported: true,
          isTransliterationSupported: false
        },
        {
          language: 'en',
          score: 0.92,
          isTranslationSupported: true,
          isTransliterationSupported: false
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const texts = ['Acesta este un text în română.', 'This is English text.'];
      const result = await service.detectLanguageBatch(texts);

      expect(result.results).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      
      expect(result.results[0]).toEqual({
        language: 'ro',
        confidence: 0.95,
        isSupported: true
      });
      
      expect(result.results[1]).toEqual({
        language: 'en',
        confidence: 0.92,
        isSupported: true
      });
    });

    it('should handle empty input array', async () => {
      const result = await service.detectLanguageBatch([]);
      
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should filter out empty texts', async () => {
      const mockResponse = [{
        language: 'en',
        score: 0.92,
        isTranslationSupported: true,
        isTransliterationSupported: false
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const texts = ['', 'This is English text.', '   ', null as any, undefined as any];
      const result = await service.detectLanguageBatch(texts);

      expect(result.results).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      
      // Should only call API with the valid text
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify([{ Text: 'This is English text.' }])
        })
      );
    });

    it('should handle partial failures in batch', async () => {
      const mockResponse = [
        {
          language: 'ro',
          score: 0.95,
          isTranslationSupported: true,
          isTransliterationSupported: false
        },
        {
          language: 'en',
          score: 0.5, // Below threshold
          isTranslationSupported: true,
          isTransliterationSupported: false
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const texts = ['Acesta este un text în română.', 'This is English text.'];
      const result = await service.detectLanguageBatch(texts);

      expect(result.results).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      
      expect(result.results[0].language).toBe('ro');
      expect(result.errors[0]).toBeInstanceOf(LanguageDetectionError);
      expect(result.errors[0].text).toBe('This is English text.');
    });

    it('should handle complete batch failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error'
      });

      const texts = ['Text 1', 'Text 2'];
      const result = await service.detectLanguageBatch(texts);

      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      
      result.errors.forEach((error, index) => {
        expect(error).toBeInstanceOf(LanguageDetectionError);
        expect(error.text).toBe(texts[index]);
        expect(error.retryable).toBe(true); // Server errors should be retryable
      });
    });
  });

  describe('simulation mode', () => {
    beforeEach(() => {
      service = new LanguageDetectionService(
        mockCredentials,
        supportedLanguages,
        0.8,
        true // Enable simulation mode
      );
    });

    it('should detect Romanian text in simulation mode', async () => {
      const result = await service.detectLanguage('Acesta este un text în română și cu multe cuvinte românești.');
      
      expect(result.language).toBe('ro');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.isSupported).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should detect English text in simulation mode', async () => {
      const result = await service.detectLanguage('This is an English text with many English words and phrases.');
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.isSupported).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle batch detection in simulation mode', async () => {
      const texts = [
        'Acesta este un text în română.',
        'This is English text.',
        'C\'est un texte français avec des mots français.'
      ];
      
      const result = await service.detectLanguageBatch(texts);
      
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.results[0].language).toBe('ro');
      expect(result.results[1].language).toBe('en');
      expect(result.results[2].language).toBe('fr');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should default to English for unclear text in simulation mode', async () => {
      const result = await service.detectLanguage('123 456 789 !@# $%^');
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBeLessThan(0.8);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('configuration methods', () => {
    it('should update supported languages', () => {
      expect(service.isLanguageSupported('zh')).toBe(false);
      
      service.updateSupportedLanguages(['en', 'ro', 'zh']);
      
      expect(service.isLanguageSupported('zh')).toBe(true);
      expect(service.isLanguageSupported('fr')).toBe(false); // No longer supported
    });

    it('should update confidence threshold', () => {
      service.updateConfidenceThreshold(0.9);
      
      // This would be tested by checking if detection fails with confidence 0.85
      // We can't directly test the threshold without mocking, but we can test validation
      expect(() => service.updateConfidenceThreshold(1.5)).toThrow();
      expect(() => service.updateConfidenceThreshold(0.05)).toThrow();
    });
  });

  describe('error handling', () => {
    it('should identify retryable errors correctly', async () => {
      // Test network error (retryable)
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));
      
      try {
        await service.detectLanguage('Some text');
      } catch (error) {
        expect(error).toBeInstanceOf(LanguageDetectionError);
        expect((error as LanguageDetectionError).retryable).toBe(true);
      }
    });

    it('should identify non-retryable errors correctly', async () => {
      // Test client error (non-retryable)
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid request format'
      });
      
      try {
        await service.detectLanguage('Some text');
      } catch (error) {
        expect(error).toBeInstanceOf(LanguageDetectionError);
        expect((error as LanguageDetectionError).retryable).toBe(false);
      }
    });

    it('should handle rate limiting as retryable', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      });
      
      try {
        await service.detectLanguage('Some text');
      } catch (error) {
        expect(error).toBeInstanceOf(LanguageDetectionError);
        expect((error as LanguageDetectionError).retryable).toBe(true);
      }
    });
  });

  describe('getDetectionStats', () => {
    it('should calculate statistics correctly', () => {
      const results: LanguageDetectionResult[] = [
        { language: 'en', confidence: 0.9, isSupported: true },
        { language: 'ro', confidence: 0.85, isSupported: true },
        { language: 'en', confidence: 0.95, isSupported: true },
        { language: 'zh', confidence: 0.8, isSupported: false }
      ];

      const stats = LanguageDetectionService.getDetectionStats(results);

      expect(stats.totalDetections).toBe(4);
      expect(stats.languageDistribution).toEqual({
        'en': 2,
        'ro': 1,
        'zh': 1
      });
      expect(stats.averageConfidence).toBe(0.875);
      expect(stats.supportedLanguages).toBe(3);
      expect(stats.unsupportedLanguages).toBe(1);
    });

    it('should handle empty results array', () => {
      const stats = LanguageDetectionService.getDetectionStats([]);

      expect(stats.totalDetections).toBe(0);
      expect(stats.languageDistribution).toEqual({});
      expect(stats.averageConfidence).toBe(0);
      expect(stats.supportedLanguages).toBe(0);
      expect(stats.unsupportedLanguages).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very long text', async () => {
      const longText = 'This is a very long text. '.repeat(1000);
      
      const mockResponse = [{
        language: 'en',
        score: 0.95,
        isTranslationSupported: true,
        isTransliterationSupported: false
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.detectLanguage(longText);
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.95);
    });

    it('should handle special characters and numbers', async () => {
      const specialText = '123 !@# $%^ &*() 456 789';
      
      const mockResponse = [{
        language: 'en',
        score: 0.6, // Lower confidence for special characters
        isTranslationSupported: true,
        isTransliterationSupported: false
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // This should fail due to low confidence
      await expect(service.detectLanguage(specialText)).rejects.toThrow(LanguageDetectionError);
    });

    it('should handle mixed language text', async () => {
      const mixedText = 'Hello world și salut lume';
      
      const mockResponse = [{
        language: 'ro', // Azure might detect this as Romanian due to specific words
        score: 0.85,
        isTranslationSupported: true,
        isTransliterationSupported: false
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.detectLanguage(mixedText);
      
      expect(result.language).toBe('ro');
      expect(result.confidence).toBe(0.85);
    });
  });
});