/**
 * Example usage of the LanguageDetectionService
 * 
 * This file demonstrates how to use the language detection service
 * for both single text and batch processing scenarios.
 */

import { LanguageDetectionService, LanguageDetectionError } from './language-detection-service';
import { MultilingualConfigurationManager } from './multilingual-configuration-manager';
import { ConfigProvider } from './config-manager';

async function exampleUsage() {
  try {
    // Initialize configuration manager
    const configProvider = new ConfigProvider();
    const configManager = new MultilingualConfigurationManager(configProvider);
    
    // Load multilingual configuration
    const config = await configManager.loadMultilingualConfig();
    
    // Create language detection service
    const languageDetectionService = new LanguageDetectionService(
      config.credentials.translator,
      config.pipeline.supportedLanguages,
      config.pipeline.languageDetectionThreshold,
      config.pipeline.simulationMode
    );

    console.log('=== Language Detection Service Examples ===\n');

    // Example 1: Single text detection
    console.log('1. Single Text Detection:');
    try {
      const romanianText = 'Acesta este un text în limba română. Conține mai multe propoziții pentru a testa detectarea limbii.';
      const result = await languageDetectionService.detectLanguage(romanianText);
      
      console.log(`Text: "${romanianText.substring(0, 50)}..."`);
      console.log(`Detected Language: ${result.language}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Supported: ${result.isSupported ? 'Yes' : 'No'}`);
      console.log();
    } catch (error) {
      if (error instanceof LanguageDetectionError) {
        console.error(`Language detection failed: ${error.message}`);
        console.error(`Retryable: ${error.retryable}`);
      }
    }

    // Example 2: Batch text detection
    console.log('2. Batch Text Detection:');
    const texts = [
      'This is an English text that should be detected as English.',
      'Acesta este un text în română care ar trebui detectat ca română.',
      'C\'est un texte français qui devrait être détecté comme français.',
      'Dies ist ein deutscher Text, der als Deutsch erkannt werden sollte.',
      'Este es un texto en español que debería ser detectado como español.',
      '', // Empty text to test error handling
      'Mixed text with English and română words together.'
    ];

    const batchResult = await languageDetectionService.detectLanguageBatch(texts);
    
    console.log(`Successfully processed: ${batchResult.results.length} texts`);
    console.log(`Errors encountered: ${batchResult.errors.length} texts`);
    console.log();

    // Display successful detections
    batchResult.results.forEach((result, index) => {
      const originalText = texts.find(text => text.length > 0) || '';
      console.log(`Text ${index + 1}:`);
      console.log(`  Language: ${result.language}`);
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`  Supported: ${result.isSupported ? 'Yes' : 'No'}`);
    });

    // Display errors
    if (batchResult.errors.length > 0) {
      console.log('\nErrors:');
      batchResult.errors.forEach((error, index) => {
        console.log(`Error ${index + 1}:`);
        console.log(`  Text: "${error.text}"`);
        console.log(`  Message: ${error.message}`);
        console.log(`  Retryable: ${error.retryable ? 'Yes' : 'No'}`);
      });
    }

    // Example 3: Statistics
    console.log('\n3. Detection Statistics:');
    const stats = LanguageDetectionService.getDetectionStats(batchResult.results);
    console.log(`Total detections: ${stats.totalDetections}`);
    console.log(`Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
    console.log(`Supported languages: ${stats.supportedLanguages}`);
    console.log(`Unsupported languages: ${stats.unsupportedLanguages}`);
    console.log('Language distribution:');
    Object.entries(stats.languageDistribution).forEach(([lang, count]) => {
      console.log(`  ${lang}: ${count} texts`);
    });

    // Example 4: Configuration updates
    console.log('\n4. Dynamic Configuration:');
    
    // Update supported languages
    const originalSupported = languageDetectionService.isLanguageSupported('zh');
    console.log(`Chinese supported initially: ${originalSupported}`);
    
    languageDetectionService.updateSupportedLanguages(['en', 'ro', 'fr', 'de', 'es', 'zh']);
    const newSupported = languageDetectionService.isLanguageSupported('zh');
    console.log(`Chinese supported after update: ${newSupported}`);
    
    // Update confidence threshold
    try {
      languageDetectionService.updateConfidenceThreshold(0.9);
      console.log('Confidence threshold updated to 90%');
    } catch (error) {
      console.error(`Failed to update threshold: ${error}`);
    }

    // Example 5: Error handling scenarios
    console.log('\n5. Error Handling Examples:');
    
    // Test with empty text
    try {
      await languageDetectionService.detectLanguage('');
    } catch (error) {
      if (error instanceof LanguageDetectionError) {
        console.log(`Empty text error: ${error.message}`);
        console.log(`Retryable: ${error.retryable}`);
      }
    }

    // Test with very short text (might have low confidence)
    try {
      const shortResult = await languageDetectionService.detectLanguage('Hi');
      console.log(`Short text detected as: ${shortResult.language} (${(shortResult.confidence * 100).toFixed(1)}%)`);
    } catch (error) {
      if (error instanceof LanguageDetectionError) {
        console.log(`Short text detection failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Example for simulation mode
async function simulationModeExample() {
  console.log('\n=== Simulation Mode Example ===\n');
  
  // Create service in simulation mode (no Azure API calls)
  const mockCredentials = {
    endpoint: 'https://api.cognitive.microsofttranslator.com/',
    key: 'mock-key',
    region: 'mock-region'
  };
  
  const simulationService = new LanguageDetectionService(
    mockCredentials,
    ['en', 'ro', 'fr', 'de', 'es'],
    0.8,
    true // Enable simulation mode
  );

  const testTexts = [
    'This is clearly English text with common English words.',
    'Acesta este un text în română cu multe cuvinte românești și expresii.',
    'Bonjour, c\'est un texte français avec des mots français typiques.',
    'Guten Tag, das ist ein deutscher Text mit deutschen Wörtern.',
    'Hola, este es un texto en español con palabras españolas.'
  ];

  console.log('Testing simulation mode (no API calls):');
  for (const text of testTexts) {
    try {
      const result = await simulationService.detectLanguage(text);
      console.log(`"${text.substring(0, 40)}..." -> ${result.language} (${(result.confidence * 100).toFixed(1)}%)`);
    } catch (error) {
      console.error(`Detection failed: ${error}`);
    }
  }
}

// Example for integration with document processing
async function documentProcessingIntegration() {
  console.log('\n=== Document Processing Integration Example ===\n');
  
  // Simulate document chunks that need language detection
  const documentChunks = [
    {
      filename: 'document1.pdf',
      content: 'This document contains important information about our company policies and procedures.'
    },
    {
      filename: 'document2.pdf', 
      content: 'Acest document conține informații importante despre politicile și procedurile companiei noastre.'
    },
    {
      filename: 'document3.pdf',
      content: 'Ce document contient des informations importantes sur les politiques et procédures de notre entreprise.'
    }
  ];

  try {
    // Initialize service (in simulation mode for this example)
    const service = new LanguageDetectionService(
      {
        endpoint: 'https://api.cognitive.microsofttranslator.com/',
        key: 'mock-key',
        region: 'mock-region'
      },
      ['en', 'ro', 'fr', 'de', 'es'],
      0.8,
      true // Simulation mode
    );

    // Process all document chunks
    const texts = documentChunks.map(chunk => chunk.content);
    const batchResult = await service.detectLanguageBatch(texts);

    console.log('Document language detection results:');
    batchResult.results.forEach((result, index) => {
      const chunk = documentChunks[index];
      console.log(`${chunk.filename}:`);
      console.log(`  Language: ${result.language}`);
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`  Needs Translation: ${result.language !== 'en' ? 'Yes' : 'No'}`);
      console.log(`  Supported: ${result.isSupported ? 'Yes' : 'No'}`);
      console.log();
    });

    // Show statistics
    const stats = LanguageDetectionService.getDetectionStats(batchResult.results);
    console.log('Processing Summary:');
    console.log(`Documents requiring translation: ${stats.totalDetections - (stats.languageDistribution['en'] || 0)}`);
    console.log(`Languages detected: ${Object.keys(stats.languageDistribution).join(', ')}`);
    
  } catch (error) {
    console.error('Document processing integration failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    await exampleUsage();
    await simulationModeExample();
    await documentProcessingIntegration();
  })().catch(console.error);
}

export {
  exampleUsage,
  simulationModeExample,
  documentProcessingIntegration
};