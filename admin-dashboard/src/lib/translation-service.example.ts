/**
 * Example usage of the TranslationService
 * 
 * This file demonstrates how to use the Azure Translator integration service
 * for translating documents in the multilingual RAG pipeline.
 */

import { 
  TranslationService, 
  createTranslationService,
  type AzureTranslatorCredentials,
  type TranslationOptions 
} from './translation-service';

// Example: Basic translation service setup
async function basicTranslationExample() {
  const credentials: AzureTranslatorCredentials = {
    endpoint: 'https://api.cognitive.microsofttranslator.com/',
    key: process.env.AZURE_TRANSLATOR_KEY!,
    region: process.env.AZURE_TRANSLATOR_REGION!
  };

  // Create translation service with default options
  const translationService = new TranslationService(credentials);

  try {
    // Translate a single text
    const result = await translationService.translateText(
      'Bună ziua! Cum vă numiți?',
      'ro',
      'en'
    );

    console.log('Translation result:', {
      original: 'Bună ziua! Cum vă numiți?',
      translated: result.translatedText,
      confidence: result.confidence
    });

  } catch (error) {
    console.error('Translation failed:', error);
  }
}

// Example: Batch translation with custom options
async function batchTranslationExample() {
  const credentials: AzureTranslatorCredentials = {
    endpoint: 'https://api.cognitive.microsofttranslator.com/',
    key: process.env.AZURE_TRANSLATOR_KEY!,
    region: process.env.AZURE_TRANSLATOR_REGION!
  };

  const options: TranslationOptions = {
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
    batchSize: 10
  };

  const translationService = new TranslationService(credentials, options);

  const romanianTexts = [
    'Acesta este primul document.',
    'Al doilea document conține informații importante.',
    'Ultimul document are concluzii.',
    '', // Empty text - will be filtered out
    'Document cu erori de procesare.'
  ];

  try {
    const batchResult = await translationService.translateBatch(
      romanianTexts,
      'ro',
      'en'
    );

    console.log('Batch translation results:', {
      totalProcessed: batchResult.totalProcessed,
      totalFailed: batchResult.totalFailed,
      successfulTranslations: batchResult.results.length,
      errors: batchResult.errors.length
    });

    // Process successful translations
    batchResult.results.forEach((result, index) => {
      if (result) {
        console.log(`Translation ${index}:`, {
          original: romanianTexts[index],
          translated: result.translatedText,
          confidence: result.confidence
        });
      }
    });

    // Handle errors
    batchResult.errors.forEach(error => {
      console.error(`Error at index ${error.index}:`, {
        originalText: error.originalText,
        error: error.error,
        retryable: error.retryable
      });
    });

  } catch (error) {
    console.error('Batch translation failed:', error);
  }
}

// Example: Using the factory function with connection testing
async function factoryExample() {
  const credentials: AzureTranslatorCredentials = {
    endpoint: 'https://api.cognitive.microsofttranslator.com/',
    key: process.env.AZURE_TRANSLATOR_KEY!,
    region: process.env.AZURE_TRANSLATOR_REGION!
  };

  try {
    // This will test the connection during creation
    const translationService = await createTranslationService(credentials, {
      maxRetries: 2,
      batchSize: 15
    });

    console.log('Translation service created successfully');

    // Get service information
    const serviceInfo = await translationService.getServiceInfo();
    console.log('Service info:', serviceInfo);

    // Check language support
    const isRomanianSupported = translationService.isLanguageSupported('ro');
    const isEnglishSupported = translationService.isLanguageSupported('en');
    
    console.log('Language support:', {
      romanian: isRomanianSupported,
      english: isEnglishSupported
    });

  } catch (error) {
    console.error('Failed to create translation service:', error);
  }
}

// Example: Error handling and retry scenarios
async function errorHandlingExample() {
  const credentials: AzureTranslatorCredentials = {
    endpoint: 'https://api.cognitive.microsofttranslator.com/',
    key: 'invalid-key', // Intentionally invalid for demo
    region: 'eastus'
  };

  const translationService = new TranslationService(credentials, {
    maxRetries: 1,
    retryDelayMs: 500
  });

  try {
    await translationService.translateText('Hello', 'en', 'es');
  } catch (error) {
    if (error instanceof Error) {
      console.log('Error type:', error.constructor.name);
      console.log('Error message:', error.message);
      
      // Handle specific error types
      switch (error.constructor.name) {
        case 'TranslationServiceError':
          console.log('General translation service error');
          break;
        case 'TranslationRateLimitError':
          console.log('Rate limit exceeded - should retry');
          break;
        case 'TranslationQuotaExceededError':
          console.log('Quota exceeded - need to upgrade plan');
          break;
        case 'UnsupportedLanguageError':
          console.log('Language not supported');
          break;
        default:
          console.log('Unknown error type');
      }
    }
  }
}

// Example: Integration with multilingual pipeline
async function pipelineIntegrationExample() {
  const credentials: AzureTranslatorCredentials = {
    endpoint: 'https://api.cognitive.microsofttranslator.com/',
    key: process.env.AZURE_TRANSLATOR_KEY!,
    region: process.env.AZURE_TRANSLATOR_REGION!
  };

  const translationService = new TranslationService(credentials, {
    batchSize: 25, // Optimize for document chunks
    maxRetries: 3,
    retryDelayMs: 1000
  });

  // Simulate document chunks from different languages
  const documentChunks = [
    { text: 'Acesta este primul paragraf din document.', language: 'ro' },
    { text: 'Este ist der erste Absatz des Dokuments.', language: 'de' },
    { text: 'This is already in English.', language: 'en' },
    { text: 'Ceci est le premier paragraphe du document.', language: 'fr' }
  ];

  const translatedChunks = [];

  for (const chunk of documentChunks) {
    try {
      if (chunk.language !== 'en') {
        const result = await translationService.translateText(
          chunk.text,
          chunk.language,
          'en'
        );
        
        translatedChunks.push({
          originalText: chunk.text,
          originalLanguage: chunk.language,
          translatedText: result.translatedText,
          confidence: result.confidence
        });
      } else {
        // Skip translation for English text
        translatedChunks.push({
          originalText: chunk.text,
          originalLanguage: 'en',
          translatedText: chunk.text,
          confidence: 1.0
        });
      }
    } catch (error) {
      console.error(`Failed to translate chunk in ${chunk.language}:`, error);
      
      // In a real pipeline, you might want to continue with the original text
      translatedChunks.push({
        originalText: chunk.text,
        originalLanguage: chunk.language,
        translatedText: chunk.text, // Fallback to original
        confidence: 0.0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log('Pipeline translation results:', translatedChunks);
}

// Example: Performance monitoring and optimization
async function performanceExample() {
  const credentials: AzureTranslatorCredentials = {
    endpoint: 'https://api.cognitive.microsofttranslator.com/',
    key: process.env.AZURE_TRANSLATOR_KEY!,
    region: process.env.AZURE_TRANSLATOR_REGION!
  };

  const translationService = new TranslationService(credentials, {
    batchSize: 50, // Larger batch for better performance
    maxRetries: 2,
    retryDelayMs: 500,
    timeoutMs: 60000 // Longer timeout for large batches
  });

  // Generate test data
  const testTexts = Array.from({ length: 100 }, (_, i) => 
    `Acesta este textul de test numărul ${i + 1} pentru traducere.`
  );

  console.log(`Starting translation of ${testTexts.length} texts...`);
  const startTime = Date.now();

  try {
    const result = await translationService.translateBatch(
      testTexts,
      'ro',
      'en'
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('Performance metrics:', {
      totalTexts: testTexts.length,
      successfulTranslations: result.totalProcessed,
      failedTranslations: result.totalFailed,
      duration: `${duration}ms`,
      averageTimePerText: `${(duration / testTexts.length).toFixed(2)}ms`,
      throughput: `${(testTexts.length / (duration / 1000)).toFixed(2)} texts/second`
    });

  } catch (error) {
    console.error('Performance test failed:', error);
  }
}

// Export examples for use in other files
export {
  basicTranslationExample,
  batchTranslationExample,
  factoryExample,
  errorHandlingExample,
  pipelineIntegrationExample,
  performanceExample
};

// Example usage (uncomment to run):
// basicTranslationExample();
// batchTranslationExample();
// factoryExample();
// errorHandlingExample();
// pipelineIntegrationExample();
// performanceExample();