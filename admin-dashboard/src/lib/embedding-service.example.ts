/**
 * Example usage of the EmbeddingService for multilingual RAG pipeline
 * This demonstrates how to use the embedding service with translated content
 */

import { EmbeddingService } from './embedding-service';
import { MultilingualConfigurationManager } from './multilingual-configuration-manager';
import { LocalConfigProvider } from './config-manager';

async function exampleEmbeddingGeneration() {
  try {
    // Initialize configuration
    const configProvider = new LocalConfigProvider();
    const configManager = new MultilingualConfigurationManager(configProvider);
    
    // Load Azure OpenAI credentials
    const config = await configManager.loadMultilingualConfig();
    const embeddingService = new EmbeddingService(config.credentials.openAI);

    // Example 1: Generate embedding for a single translated text
    console.log('Example 1: Single text embedding');
    const singleResult = await embeddingService.generateEmbedding(
      'This is translated content from Romanian to English',
      'doc1_chunk1'
    );
    console.log(`Generated embedding with ${singleResult.embedding.length} dimensions`);
    console.log(`Token count: ${singleResult.tokenCount}`);

    // Example 2: Batch processing of translated document chunks
    console.log('\nExample 2: Batch embedding generation');
    const translatedChunks = [
      {
        content: 'First translated chunk from Romanian document',
        metadata: {
          originalLanguage: 'ro',
          targetLanguage: 'en',
          filePath: '/uploads/document1.pdf',
          chunkIndex: 0
        }
      },
      {
        content: 'Second translated chunk with technical content',
        metadata: {
          originalLanguage: 'ro',
          targetLanguage: 'en',
          filePath: '/uploads/document1.pdf',
          chunkIndex: 1
        }
      },
      {
        content: 'Third chunk already in English',
        metadata: {
          originalLanguage: 'en',
          targetLanguage: 'en',
          filePath: '/uploads/document2.pdf',
          chunkIndex: 0
        }
      }
    ];

    const batchResult = await embeddingService.generateEmbeddingsForChunks(
      translatedChunks,
      (progress) => {
        console.log(`Progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
        console.log(`Stage: ${progress.stage}, Tokens used: ${progress.tokensUsed}`);
      }
    );

    console.log(`\nBatch processing results:`);
    console.log(`- Success: ${batchResult.success}`);
    console.log(`- Embeddings generated: ${batchResult.results.length}`);
    console.log(`- Errors: ${batchResult.errors.length}`);
    console.log(`- Total tokens: ${batchResult.totalTokens}`);
    console.log(`- Processing time: ${batchResult.processingTime}ms`);

    // Example 3: Error handling
    console.log('\nExample 3: Error handling');
    try {
      await embeddingService.generateEmbedding(''); // Empty text should fail
    } catch (error) {
      console.log(`Expected error caught: ${error.message}`);
    }

    // Example 4: Token usage monitoring
    console.log('\nExample 4: Token usage stats');
    const stats = embeddingService.getTokenUsageStats();
    console.log(`Total tokens used: ${stats.totalTokens}`);
    console.log(`Requests made: ${stats.requestCount}`);
    console.log(`Remaining tokens: ${stats.remainingTokens}`);
    console.log(`Can process more: ${embeddingService.canProcessMoreRequests()}`);

    // Example 5: Model information
    console.log('\nExample 5: Model information');
    const modelInfo = embeddingService.getModelInfo();
    console.log(`Model: ${modelInfo.model}`);
    console.log(`Dimensions: ${modelInfo.dimensions}`);
    console.log(`Max tokens: ${modelInfo.maxTokens}`);

    return batchResult;

  } catch (error) {
    console.error('Example failed:', error);
    throw error;
  }
}

// Example of integrating with document processing pipeline
async function examplePipelineIntegration() {
  console.log('\n=== Pipeline Integration Example ===');
  
  try {
    const configProvider = new LocalConfigProvider();
    const configManager = new MultilingualConfigurationManager(configProvider);
    const config = await configManager.loadMultilingualConfig();
    
    // Initialize embedding service with custom rate limiting for production
    const embeddingService = new EmbeddingService(config.credentials.openAI, {
      requestsPerMinute: 60,
      tokensPerMinute: 120000,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000
    });

    // Simulate processed document chunks from multilingual pipeline
    const processedDocuments = [
      {
        filePath: '/uploads/romanian_document.pdf',
        originalLanguage: 'ro',
        translatedContent: 'This document discusses educational policies in Romania...',
        chunks: [
          'This document discusses educational policies in Romania and their impact on student performance.',
          'The research methodology involved surveying 1000 students across different regions.',
          'Results show significant improvements in literacy rates over the past decade.'
        ]
      },
      {
        filePath: '/uploads/english_document.pdf',
        originalLanguage: 'en',
        translatedContent: null, // No translation needed
        chunks: [
          'Machine learning applications in education are becoming increasingly important.',
          'Natural language processing can help analyze student feedback automatically.',
          'Embedding models enable semantic search across educational content.'
        ]
      }
    ];

    // Process all chunks with embeddings
    const allChunks = processedDocuments.flatMap(doc => 
      doc.chunks.map((chunk, index) => ({
        content: chunk,
        metadata: {
          filePath: doc.filePath,
          originalLanguage: doc.originalLanguage,
          targetLanguage: 'en',
          isTranslated: doc.originalLanguage !== 'en',
          chunkIndex: index,
          totalChunks: doc.chunks.length
        }
      }))
    );

    console.log(`Processing ${allChunks.length} chunks from ${processedDocuments.length} documents`);

    const embeddingResult = await embeddingService.generateEmbeddingsForChunks(
      allChunks,
      (progress) => {
        if (progress.stage === 'processing') {
          console.log(`Embedding progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
        }
      }
    );

    console.log('\nPipeline Integration Results:');
    console.log(`- Documents processed: ${processedDocuments.length}`);
    console.log(`- Chunks embedded: ${embeddingResult.results.length}`);
    console.log(`- Total tokens used: ${embeddingResult.totalTokens}`);
    console.log(`- Processing time: ${embeddingResult.processingTime}ms`);
    console.log(`- Average tokens per chunk: ${Math.round(embeddingResult.totalTokens / embeddingResult.results.length)}`);

    // Return embeddings ready for indexing
    return embeddingResult.results.map(result => ({
      id: `${result.metadata?.filePath}_chunk_${result.metadata?.chunkIndex}`,
      content: result.text,
      embedding: result.embedding,
      metadata: {
        ...result.metadata,
        embeddingModel: embeddingService.getModelInfo().model,
        processingTimestamp: new Date().toISOString()
      }
    }));

  } catch (error) {
    console.error('Pipeline integration failed:', error);
    throw error;
  }
}

// Export examples for testing and documentation
export {
  exampleEmbeddingGeneration,
  examplePipelineIntegration
};

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('Running EmbeddingService examples...\n');
  
  exampleEmbeddingGeneration()
    .then(() => examplePipelineIntegration())
    .then((indexableChunks) => {
      console.log(`\n✅ Examples completed successfully!`);
      console.log(`Generated ${indexableChunks.length} indexable chunks ready for Azure Search`);
    })
    .catch((error) => {
      console.error('❌ Examples failed:', error);
      process.exit(1);
    });
}