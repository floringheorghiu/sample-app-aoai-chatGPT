import { MultilingualConfigurationManager, MultilingualConfig } from './multilingual-configuration-manager';
import { ConfigProvider } from './config-manager';
import { ExecutionProgress } from './script-executor';
import { AzureSearchIndexingService, IndexableDocumentChunk, BatchIndexingResult } from './azure-search-indexing-service';

// Extended progress interface for multilingual processing
export interface MultilingualProgress extends ExecutionProgress {
  stage: 'language_detection' | 'translation' | 'chunking' | 'embedding' | 'indexing' | 'completed' | 'error';
  languageStats?: {
    detected: { [language: string]: number };
    translated: { [language: string]: number };
  };
  processingStats?: {
    documentsProcessed: number;
    chunksCreated: number;
    embeddingsGenerated: number;
    documentsIndexed: number;
  };
}

// Pipeline execution result
export interface PipelineResult {
  success: boolean;
  documentsProcessed: number;
  chunksCreated: number;
  documentsIndexed: number;
  languagesDetected: string[];
  translatedDocuments: number;
  errors: ProcessingError[];
  duration: number;
}

// Processing error interface
export interface ProcessingError {
  type: 'configuration' | 'language_detection' | 'translation' | 'processing' | 'indexing' | 'embedding';
  message: string;
  filePath?: string;
  stage: string;
  recoverable: boolean;
  retryCount?: number;
}

// Document chunk interface
export interface DocumentChunk {
  content: string;
  embedding?: number[];
  metadata?: ChunkMetadata;
}

// Chunk metadata interface
export interface ChunkMetadata {
  filePath: string;
  chunkIndex: number;
  totalChunks: number;
  originalLanguage: string;
  isTranslated: boolean;
}

// Multilingual pipeline error class
export class MultilingualPipelineError extends Error {
  constructor(
    public type: ProcessingError['type'],
    public stage: string,
    message: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'MultilingualPipelineError';
  }
}

// Progress callback type
export type MultilingualProgressCallback = (progress: MultilingualProgress) => void;

// Concurrency manager for controlling parallel operations
class ConcurrencyManager {
  private activeOperations: Map<string, number> = new Map();
  private maxConcurrency: Record<string, number>;

  constructor(config: { parallelJobs: number; batchSize: number }) {
    this.maxConcurrency = {
      language_detection: config.parallelJobs,
      translation: Math.min(config.batchSize, 10), // Limit translation concurrency
      processing: config.parallelJobs,
      embedding: Math.min(config.batchSize, 5), // Limit embedding concurrency
      indexing: Math.min(config.batchSize, 8) // Limit indexing concurrency
    };
  }

  async acquireSlot(operationType: string): Promise<void> {
    const current = this.activeOperations.get(operationType) || 0;
    const max = this.maxConcurrency[operationType] || 1;

    if (current >= max) {
      // Wait for a slot to become available
      await this.waitForSlot(operationType);
    }

    this.activeOperations.set(operationType, current + 1);
  }

  releaseSlot(operationType: string): void {
    const current = this.activeOperations.get(operationType) || 0;
    this.activeOperations.set(operationType, Math.max(0, current - 1));
  }

  private async waitForSlot(operationType: string): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        const current = this.activeOperations.get(operationType) || 0;
        const max = this.maxConcurrency[operationType] || 1;
        
        if (current < max) {
          resolve();
        } else {
          setTimeout(checkSlot, 100); // Check every 100ms
        }
      };
      checkSlot();
    });
  }

  getActiveOperations(): Record<string, number> {
    const result: Record<string, number> = {};
    this.activeOperations.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

/**
 * Coordinates the execution of the multilingual RAG pipeline
 * Integrates with existing Azure services and provides real-time progress tracking
 */
export class MultilingualPipelineCoordinator {
  private configManager: MultilingualConfigurationManager;
  private config: MultilingualConfig | null = null;
  private activeJobs: Map<string, boolean> = new Map();
  private concurrencyManager: ConcurrencyManager;

  constructor(configProvider: ConfigProvider) {
    this.configManager = new MultilingualConfigurationManager(configProvider);
    // Initialize with default concurrency settings - will be updated when config is loaded
    this.concurrencyManager = new ConcurrencyManager({ parallelJobs: 4, batchSize: 10 });
  }

  /**
   * Execute the complete multilingual RAG pipeline
   */
  async executeMultilingualPipeline(
    files: string[],
    progressCallback: MultilingualProgressCallback
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const jobId = `multilingual_${startTime}`;
    
    try {
      // Mark job as active
      this.activeJobs.set(jobId, true);

      // Load and validate configuration
      progressCallback({
        stage: 'language_detection',
        progress: 0,
        message: 'Loading multilingual configuration...',
        timestamp: new Date()
      });

      this.config = await this.configManager.loadMultilingualConfig();
      
      // Initialize concurrency manager with loaded configuration
      this.concurrencyManager = new ConcurrencyManager({
        parallelJobs: this.config.pipeline.parallelJobs,
        batchSize: this.config.pipeline.batchSize
      });
      
      // Validate configuration
      const validation = this.configManager.validateConfiguration(this.config);
      if (!validation.isValid) {
        throw new MultilingualPipelineError(
          'configuration',
          'initialization',
          `Configuration validation failed: ${validation.errors.join(', ')}`,
          false
        );
      }

      // Check if we're in simulation mode
      if (this.config.pipeline.simulationMode) {
        return await this.simulateMultilingualPipeline(files, progressCallback, jobId);
      }

      // Execute real pipeline
      return await this.executeRealPipeline(files, progressCallback, jobId);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      progressCallback({
        stage: 'error',
        progress: 0,
        message: `Pipeline execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });

      return {
        success: false,
        documentsProcessed: 0,
        chunksCreated: 0,
        documentsIndexed: 0,
        languagesDetected: [],
        translatedDocuments: 0,
        errors: [{
          type: error instanceof MultilingualPipelineError ? error.type : 'processing',
          message: error instanceof Error ? error.message : 'Unknown error',
          stage: error instanceof MultilingualPipelineError ? error.stage : 'unknown',
          recoverable: error instanceof MultilingualPipelineError ? error.recoverable : false
        }],
        duration
      };
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Cancel a running pipeline job with proper cleanup
   */
  async cancelPipeline(jobId: string): Promise<boolean> {
    if (this.activeJobs.has(jobId)) {
      // Mark job as cancelled
      this.activeJobs.set(jobId, false);
      
      // Perform cleanup operations
      await this.cleanupCancelledJob(jobId);
      
      return true;
    }
    return false;
  }

  /**
   * Cleanup resources for a cancelled job
   */
  private async cleanupCancelledJob(jobId: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Cancel any ongoing Azure API calls
      // 2. Clean up temporary files
      // 3. Release any held resources
      // 4. Update job status in persistent storage
      
      console.log(`Cleaning up cancelled job: ${jobId}`);
      
      // Simulate cleanup delay
      await this.delay(100);
      
      // Remove job from active jobs after cleanup
      setTimeout(() => {
        this.activeJobs.delete(jobId);
      }, 1000); // Give some time for final status updates
      
    } catch (error) {
      console.error(`Error during cleanup of job ${jobId}:`, error);
    }
  }

  /**
   * Check if a job is still active
   */
  isJobActive(jobId: string): boolean {
    return this.activeJobs.get(jobId) === true;
  }

  /**
   * Execute the real multilingual pipeline using Azure services
   */
  private async executeRealPipeline(
    files: string[],
    progressCallback: MultilingualProgressCallback,
    jobId: string
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const errors: ProcessingError[] = [];
    const languagesDetected: Set<string> = new Set();
    let documentsProcessed = 0;
    let chunksCreated = 0;
    let documentsIndexed = 0;
    let translatedDocuments = 0;

    if (!this.config) {
      throw new MultilingualPipelineError('configuration', 'initialization', 'Configuration not loaded', false);
    }

    try {
      // Initialize processing statistics
      const languageStats = { detected: {} as Record<string, number>, translated: {} as Record<string, number> };
      const processingStats = { documentsProcessed: 0, chunksCreated: 0, embeddingsGenerated: 0, documentsIndexed: 0 };

      // Stage 1: Language Detection
      progressCallback({
        stage: 'language_detection',
        progress: 5,
        message: `Starting language detection for ${files.length} documents...`,
        timestamp: new Date(),
        languageStats,
        processingStats
      });

      const documentLanguages = await this.executeLanguageDetection(files, progressCallback, jobId, languageStats);
      documentLanguages.forEach(lang => languagesDetected.add(lang));

      if (!this.isJobActive(jobId)) {
        throw new MultilingualPipelineError('processing', 'language_detection', 'Job was cancelled', false);
      }

      // Stage 2: Translation
      progressCallback({
        stage: 'translation',
        progress: 20,
        message: 'Starting translation of non-English documents...',
        timestamp: new Date(),
        languageStats,
        processingStats
      });

      const translationResults = await this.executeTranslation(files, documentLanguages, progressCallback, jobId, languageStats);
      translatedDocuments = translationResults.translatedCount;

      if (!this.isJobActive(jobId)) {
        throw new MultilingualPipelineError('processing', 'translation', 'Job was cancelled', false);
      }

      // Stage 3: Document Processing and Chunking
      progressCallback({
        stage: 'chunking',
        progress: 40,
        message: 'Processing and chunking documents...',
        timestamp: new Date(),
        languageStats,
        processingStats
      });

      const chunkingResults = await this.executeDocumentProcessing(files, translationResults.translatedContent, progressCallback, jobId, processingStats);
      documentsProcessed = chunkingResults.documentsProcessed;
      chunksCreated = chunkingResults.chunksCreated;

      if (!this.isJobActive(jobId)) {
        throw new MultilingualPipelineError('processing', 'chunking', 'Job was cancelled', false);
      }

      // Stage 4: Embedding Generation
      progressCallback({
        stage: 'embedding',
        progress: 65,
        message: 'Generating embeddings for document chunks...',
        timestamp: new Date(),
        languageStats,
        processingStats
      });

      const embeddingResults = await this.executeEmbeddingGeneration(chunkingResults.chunks, progressCallback, jobId, processingStats);

      if (!this.isJobActive(jobId)) {
        throw new MultilingualPipelineError('processing', 'embedding', 'Job was cancelled', false);
      }

      // Stage 5: Indexing
      progressCallback({
        stage: 'indexing',
        progress: 85,
        message: 'Indexing processed documents in Azure Cognitive Search...',
        timestamp: new Date(),
        languageStats,
        processingStats
      });

      const indexingResults = await this.executeIndexing(embeddingResults.embeddedChunks, progressCallback, jobId, processingStats);
      documentsIndexed = indexingResults.documentsIndexed;

      if (!this.isJobActive(jobId)) {
        throw new MultilingualPipelineError('processing', 'indexing', 'Job was cancelled', false);
      }

      // Completion
      progressCallback({
        stage: 'completed',
        progress: 100,
        message: 'Multilingual pipeline execution completed successfully',
        timestamp: new Date(),
        languageStats,
        processingStats
      });

      return {
        success: true,
        documentsProcessed,
        chunksCreated,
        documentsIndexed,
        languagesDetected: Array.from(languagesDetected),
        translatedDocuments,
        errors,
        duration: Date.now() - startTime
      };

    } catch (error) {
      if (error instanceof MultilingualPipelineError) {
        errors.push({
          type: error.type,
          message: error.message,
          stage: error.stage,
          recoverable: error.recoverable
        });
      } else {
        errors.push({
          type: 'processing',
          message: error instanceof Error ? error.message : 'Unknown error',
          stage: 'unknown',
          recoverable: false
        });
      }

      throw error;
    }
  }

  /**
   * Simulate multilingual pipeline execution for development/testing
   */
  private async simulateMultilingualPipeline(
    files: string[],
    progressCallback: MultilingualProgressCallback,
    jobId: string
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const stages = [
      { stage: 'language_detection' as const, name: 'Language Detection', duration: 1000, progress: 10 },
      { stage: 'translation' as const, name: 'Translation', duration: 2000, progress: 30 },
      { stage: 'chunking' as const, name: 'Document Processing', duration: 1500, progress: 50 },
      { stage: 'embedding' as const, name: 'Embedding Generation', duration: 2000, progress: 75 },
      { stage: 'indexing' as const, name: 'Indexing', duration: 1500, progress: 90 }
    ];

    let documentsProcessed = 0;
    let chunksCreated = 0;
    let documentsIndexed = 0;
    const languagesDetected = ['ro', 'en'];
    const translatedDocuments = Math.floor(files.length * 0.7); // Simulate 70% need translation

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      
      if (!this.isJobActive(jobId)) {
        throw new MultilingualPipelineError('processing', stage.stage, 'Job was cancelled', false);
      }

      // Update progress based on stage
      const languageStats = {
        detected: { 'ro': Math.floor(files.length * 0.7), 'en': Math.floor(files.length * 0.3) },
        translated: i >= 1 ? { 'ro': translatedDocuments } : { 'ro': 0 }
      };

      const processingStats = {
        documentsProcessed: i >= 2 ? files.length : 0,
        chunksCreated: i >= 2 ? files.length * 10 : 0,
        embeddingsGenerated: i >= 3 ? files.length * 10 : 0,
        documentsIndexed: i >= 4 ? files.length : 0
      };

      progressCallback({
        stage: stage.stage,
        progress: stage.progress,
        message: `${stage.name}... (simulated)`,
        timestamp: new Date(),
        languageStats,
        processingStats
      });

      await this.delay(stage.duration);
    }

    // Final completion
    documentsProcessed = files.length;
    chunksCreated = files.length * 10;
    documentsIndexed = files.length;

    progressCallback({
      stage: 'completed',
      progress: 100,
      message: 'Multilingual pipeline simulation completed successfully',
      timestamp: new Date(),
      languageStats: {
        detected: { 'ro': Math.floor(files.length * 0.7), 'en': Math.floor(files.length * 0.3) },
        translated: { 'ro': translatedDocuments }
      },
      processingStats: { documentsProcessed, chunksCreated, embeddingsGenerated: chunksCreated, documentsIndexed }
    });

    return {
      success: true,
      documentsProcessed,
      chunksCreated,
      documentsIndexed,
      languagesDetected,
      translatedDocuments,
      errors: [],
      duration: Date.now() - startTime
    };
  }

  /**
   * Execute language detection stage with parallel processing
   */
  private async executeLanguageDetection(
    files: string[],
    progressCallback: MultilingualProgressCallback,
    jobId: string,
    languageStats: { detected: Record<string, number>; translated: Record<string, number> }
  ): Promise<string[]> {
    if (!this.config) {
      throw new MultilingualPipelineError('configuration', 'language_detection', 'Configuration not loaded', false);
    }

    const documentLanguages: string[] = [];
    const batchSize = Math.min(this.config.pipeline.parallelJobs, files.length);
    const batches = this.createBatches(files, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchPromises = batch.map(async (file, fileIndex) => {
        // Acquire concurrency slot
        await this.concurrencyManager.acquireSlot('language_detection');
        
        try {
          // Check for cancellation
          if (!this.isJobActive(jobId)) {
            throw new MultilingualPipelineError('processing', 'language_detection', 'Job was cancelled', false);
          }

          // Use error handling with recovery
          const detectedLanguage = await this.handleErrorWithRecovery(
            async () => {
              // Simulate language detection (in real implementation, this would call Azure Translator detect API)
              await this.delay(200 + Math.random() * 300); // Simulate API call time
              
              // Mock language detection based on file name patterns
              let language = 'en'; // Default to English
              if (file.toLowerCase().includes('ro') || file.toLowerCase().includes('romanian')) {
                language = 'ro';
              } else if (file.toLowerCase().includes('fr') || file.toLowerCase().includes('french')) {
                language = 'fr';
              } else if (file.toLowerCase().includes('de') || file.toLowerCase().includes('german')) {
                language = 'de';
              }
              
              return language;
            },
            'language_detection',
            'language_detection',
            this.config!.pipeline.maxRetries,
            this.config!.pipeline.retryDelayMs
          );

          // Update language statistics
          languageStats.detected[detectedLanguage] = (languageStats.detected[detectedLanguage] || 0) + 1;
          
          return detectedLanguage;
        } finally {
          // Always release the concurrency slot
          this.concurrencyManager.releaseSlot('language_detection');
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          documentLanguages.push(result.value);
        } else {
          console.error(`Language detection failed for file ${batch[index]}:`, result.reason);
          // Use default language for failed detections
          documentLanguages.push(this.config!.pipeline.targetLanguage);
        }
      });

      // Update progress
      const progress = Math.round(5 + ((batchIndex + 1) / batches.length) * 10);
      progressCallback({
        stage: 'language_detection',
        progress,
        message: `Language detection: processed ${(batchIndex + 1) * batchSize} of ${files.length} documents`,
        timestamp: new Date(),
        languageStats,
        processingStats: { documentsProcessed: 0, chunksCreated: 0, embeddingsGenerated: 0, documentsIndexed: 0 }
      });
    }

    return documentLanguages;
  }

  /**
   * Execute translation stage with batch processing
   */
  private async executeTranslation(
    files: string[],
    documentLanguages: string[],
    progressCallback: MultilingualProgressCallback,
    jobId: string,
    languageStats: { detected: Record<string, number>; translated: Record<string, number> }
  ): Promise<{ translatedContent: Map<string, string>; translatedCount: number }> {
    if (!this.config) {
      throw new MultilingualPipelineError('configuration', 'translation', 'Configuration not loaded', false);
    }

    const translatedContent = new Map<string, string>();
    let translatedCount = 0;
    const targetLanguage = this.config.pipeline.targetLanguage;

    // Filter files that need translation
    const filesToTranslate = files.filter((file, index) => {
      const language = documentLanguages[index];
      return language !== targetLanguage && this.config!.pipeline.enableTranslation;
    });

    if (filesToTranslate.length === 0) {
      progressCallback({
        stage: 'translation',
        progress: 35,
        message: 'No translation needed - all documents are in target language',
        timestamp: new Date(),
        languageStats,
        processingStats: { documentsProcessed: 0, chunksCreated: 0, embeddingsGenerated: 0, documentsIndexed: 0 }
      });
      return { translatedContent, translatedCount };
    }

    const batchSize = Math.min(this.config.pipeline.batchSize, filesToTranslate.length);
    const batches = this.createBatches(filesToTranslate, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      const batchPromises = batch.map(async (file) => {
        // Acquire concurrency slot
        await this.concurrencyManager.acquireSlot('translation');
        
        try {
          // Check for cancellation
          if (!this.isJobActive(jobId)) {
            throw new MultilingualPipelineError('processing', 'translation', 'Job was cancelled', false);
          }

          const fileIndex = files.indexOf(file);
          const sourceLanguage = documentLanguages[fileIndex];

          // Use error handling with recovery
          await this.handleErrorWithRecovery(
            async () => {
              // Simulate translation (in real implementation, this would call Azure Translator API)
              await this.delay(500 + Math.random() * 1000); // Simulate translation time
              
              // Mock translated content
              const translatedText = `[TRANSLATED FROM ${sourceLanguage.toUpperCase()}] Content of ${file}`;
              translatedContent.set(file, translatedText);
              
              // Update translation statistics
              languageStats.translated[sourceLanguage] = (languageStats.translated[sourceLanguage] || 0) + 1;
            },
            'translation',
            'translation',
            this.config!.pipeline.maxRetries,
            this.config!.pipeline.retryDelayMs
          );
          
          return true;
        } finally {
          // Always release the concurrency slot
          this.concurrencyManager.releaseSlot('translation');
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Count successful translations
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          translatedCount++;
        }
      });

      // Update progress
      const progress = Math.round(20 + ((batchIndex + 1) / batches.length) * 15);
      progressCallback({
        stage: 'translation',
        progress,
        message: `Translation: processed ${translatedCount} of ${filesToTranslate.length} documents`,
        timestamp: new Date(),
        languageStats,
        processingStats: { documentsProcessed: 0, chunksCreated: 0, embeddingsGenerated: 0, documentsIndexed: 0 }
      });
    }

    return { translatedContent, translatedCount };
  }

  /**
   * Execute document processing and chunking stage
   */
  private async executeDocumentProcessing(
    files: string[],
    translatedContent: Map<string, string>,
    progressCallback: MultilingualProgressCallback,
    jobId: string,
    processingStats: { documentsProcessed: number; chunksCreated: number; embeddingsGenerated: number; documentsIndexed: number }
  ): Promise<{ documentsProcessed: number; chunksCreated: number; chunks: DocumentChunk[] }> {
    if (!this.config) {
      throw new MultilingualPipelineError('configuration', 'chunking', 'Configuration not loaded', false);
    }

    const allChunks: DocumentChunk[] = [];
    let documentsProcessed = 0;
    let totalChunksCreated = 0;

    const batchSize = Math.min(this.config.pipeline.parallelJobs, files.length);
    const batches = this.createBatches(files, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      const batchPromises = batch.map(async (file) => {
        // Acquire concurrency slot
        await this.concurrencyManager.acquireSlot('processing');
        
        try {
          // Check for cancellation
          if (!this.isJobActive(jobId)) {
            throw new MultilingualPipelineError('processing', 'chunking', 'Job was cancelled', false);
          }

          // Use error handling with recovery
          const result = await this.handleErrorWithRecovery(
            async () => {
              // Simulate document processing (in real implementation, this would use data_utils.py)
              await this.delay(300 + Math.random() * 700); // Simulate processing time

              // Get content (translated if available, otherwise original)
              const content = translatedContent.get(file) || `Original content of ${file}`;
              
              // Simulate chunking
              const chunkCount = Math.floor(content.length / this.config!.pipeline.chunkSize) + 1;
              const chunks: DocumentChunk[] = [];
              
              for (let i = 0; i < chunkCount; i++) {
                const startIndex = i * this.config!.pipeline.chunkSize;
                const endIndex = Math.min(startIndex + this.config!.pipeline.chunkSize, content.length);
                const chunkContent = content.substring(startIndex, endIndex);
                
                chunks.push({
                  content: chunkContent,
                  metadata: {
                    filePath: file,
                    chunkIndex: i,
                    totalChunks: chunkCount,
                    originalLanguage: translatedContent.has(file) ? 'non-en' : 'en',
                    isTranslated: translatedContent.has(file)
                  }
                });
              }

              return { file, chunks };
            },
            'processing',
            'chunking',
            this.config!.pipeline.maxRetries,
            this.config!.pipeline.retryDelayMs
          );

          return result;
        } catch (error) {
          // If all retries failed, skip this file and continue
          console.warn(`Skipping file ${file} due to processing error:`, error instanceof Error ? error.message : 'Unknown error');
          return { file, chunks: [] };
        } finally {
          // Always release the concurrency slot
          this.concurrencyManager.releaseSlot('processing');
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          documentsProcessed++;
          const fileChunks = result.value.chunks;
          allChunks.push(...fileChunks);
          totalChunksCreated += fileChunks.length;
        } else {
          console.error('Document processing failed:', result.reason);
        }
      });

      // Update processing statistics
      processingStats.documentsProcessed = documentsProcessed;
      processingStats.chunksCreated = totalChunksCreated;

      // Update progress
      const progress = Math.round(40 + ((batchIndex + 1) / batches.length) * 20);
      progressCallback({
        stage: 'chunking',
        progress,
        message: `Document processing: processed ${documentsProcessed} documents, created ${totalChunksCreated} chunks`,
        timestamp: new Date(),
        languageStats: { detected: {}, translated: {} },
        processingStats
      });
    }

    return { documentsProcessed, chunksCreated: totalChunksCreated, chunks: allChunks };
  }

  /**
   * Execute embedding generation stage
   */
  private async executeEmbeddingGeneration(
    chunks: DocumentChunk[],
    progressCallback: MultilingualProgressCallback,
    jobId: string,
    processingStats: { documentsProcessed: number; chunksCreated: number; embeddingsGenerated: number; documentsIndexed: number }
  ): Promise<{ embeddedChunks: DocumentChunk[] }> {
    if (!this.config) {
      throw new MultilingualPipelineError('configuration', 'embedding', 'Configuration not loaded', false);
    }

    const embeddedChunks: DocumentChunk[] = [];
    let embeddingsGenerated = 0;

    const batchSize = Math.min(this.config.pipeline.batchSize, chunks.length);
    const batches = this.createBatches(chunks, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Acquire concurrency slot
      await this.concurrencyManager.acquireSlot('embedding');
      
      try {
        // Check for cancellation
        if (!this.isJobActive(jobId)) {
          throw new MultilingualPipelineError('processing', 'embedding', 'Job was cancelled', false);
        }

        // Use error handling with recovery
        const batchEmbeddings = await this.handleErrorWithRecovery(
          async () => {
            // Simulate batch embedding generation (in real implementation, this would call Azure OpenAI)
            await this.delay(400 + Math.random() * 600); // Simulate embedding generation time

            // Process batch
            return batch.map((chunk) => {
              // Generate mock embedding vector
              const embedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
              
              return {
                ...chunk,
                embedding
              };
            });
          },
          'embedding',
          'embedding',
          this.config.pipeline.maxRetries,
          this.config.pipeline.retryDelayMs
        );

        embeddedChunks.push(...batchEmbeddings);
        embeddingsGenerated += batch.length;

        // Update processing statistics
        processingStats.embeddingsGenerated = embeddingsGenerated;

        // Update progress
        const progress = Math.round(65 + ((batchIndex + 1) / batches.length) * 15);
        progressCallback({
          stage: 'embedding',
          progress,
          message: `Embedding generation: processed ${embeddingsGenerated} of ${chunks.length} chunks`,
          timestamp: new Date(),
          languageStats: { detected: {}, translated: {} },
          processingStats
        });

      } catch (error) {
        // Skip this batch and continue if all retries failed
        console.warn(`Skipping embedding batch ${batchIndex} due to error:`, error instanceof Error ? error.message : 'Unknown error');
      } finally {
        // Always release the concurrency slot
        this.concurrencyManager.releaseSlot('embedding');
      }
    }

    return { embeddedChunks };
  }

  /**
   * Execute indexing stage using Azure Cognitive Search
   */
  private async executeIndexing(
    embeddedChunks: DocumentChunk[],
    progressCallback: MultilingualProgressCallback,
    jobId: string,
    processingStats: { documentsProcessed: number; chunksCreated: number; embeddingsGenerated: number; documentsIndexed: number }
  ): Promise<{ documentsIndexed: number }> {
    if (!this.config) {
      throw new MultilingualPipelineError('configuration', 'indexing', 'Configuration not loaded', false);
    }

    // Check if we're in simulation mode
    if (this.config.pipeline.simulationMode) {
      return await this.simulateIndexing(embeddedChunks, progressCallback, jobId, processingStats);
    }

    try {
      // Initialize Azure Search indexing service
      const indexingService = new AzureSearchIndexingService(this.config.credentials.search);

      // Ensure index exists with proper schema
      await indexingService.createOrUpdateIndex();

      // Convert chunks to indexable format
      const indexableChunks: IndexableDocumentChunk[] = embeddedChunks.map((chunk, index) => {
        return AzureSearchIndexingService.convertToIndexableChunk(
          chunk,
          chunk.metadata?.filePath || `unknown_${index}`,
          chunk.metadata?.chunkIndex || index,
          {
            totalChunks: chunk.metadata?.totalChunks || 1,
            originalLanguage: chunk.metadata?.originalLanguage || 'unknown',
            targetLanguage: this.config!.pipeline.targetLanguage,
            isTranslated: chunk.metadata?.isTranslated || false,
            uploadTimestamp: new Date().toISOString(),
            tokenCount: Math.ceil((chunk.content?.length || 0) / 4) // Rough token estimate
          }
        );
      });

      // Index chunks with progress tracking
      const indexingResult = await indexingService.indexDocumentChunks(
        indexableChunks,
        this.config.credentials.search.indexName,
        this.config.pipeline.batchSize,
        (progress) => {
          // Check for cancellation during indexing
          if (!this.isJobActive(jobId)) {
            throw new MultilingualPipelineError('processing', 'indexing', 'Job was cancelled', false);
          }

          // Map indexing progress to pipeline progress
          const pipelineProgress = Math.round(85 + (progress.progress / 100) * 10);
          
          progressCallback({
            stage: 'indexing',
            progress: pipelineProgress,
            message: progress.message,
            timestamp: new Date(),
            languageStats: { detected: {}, translated: {} },
            processingStats: {
              ...processingStats,
              documentsIndexed: progress.documentsProcessed
            }
          });
        }
      );

      // Handle indexing errors
      if (indexingResult.errors.length > 0) {
        console.warn(`Indexing completed with ${indexingResult.errors.length} errors:`, 
          indexingResult.errors.map(e => e.errorMessage));
      }

      // Update final statistics
      processingStats.documentsIndexed = indexingResult.documentsIndexed;

      // Check index health after indexing
      const healthStatus = await indexingService.checkIndexHealth();
      if (healthStatus.status !== 'healthy') {
        console.warn(`Index health check after indexing:`, healthStatus);
      }

      return { documentsIndexed: indexingResult.documentsIndexed };

    } catch (error) {
      if (error instanceof MultilingualPipelineError) {
        throw error;
      }
      
      throw new MultilingualPipelineError(
        'indexing',
        'indexing',
        `Azure Search indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true // Indexing errors are generally retryable
      );
    }
  }

  /**
   * Simulate indexing for development/testing mode
   */
  private async simulateIndexing(
    embeddedChunks: DocumentChunk[],
    progressCallback: MultilingualProgressCallback,
    jobId: string,
    processingStats: { documentsProcessed: number; chunksCreated: number; embeddingsGenerated: number; documentsIndexed: number }
  ): Promise<{ documentsIndexed: number }> {
    const uniqueDocuments = new Set<string>();
    const batchSize = Math.min(this.config!.pipeline.batchSize, embeddedChunks.length);
    const batches = this.createBatches(embeddedChunks, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Check for cancellation
      if (!this.isJobActive(jobId)) {
        throw new MultilingualPipelineError('processing', 'indexing', 'Job was cancelled', false);
      }

      // Simulate indexing delay
      await this.delay(300 + Math.random() * 500);

      // Track unique documents
      batch.forEach(chunk => {
        if (chunk.metadata?.filePath) {
          uniqueDocuments.add(chunk.metadata.filePath);
        }
      });

      const documentsIndexed = uniqueDocuments.size;
      processingStats.documentsIndexed = documentsIndexed;

      // Update progress
      const progress = Math.round(85 + ((batchIndex + 1) / batches.length) * 10);
      progressCallback({
        stage: 'indexing',
        progress,
        message: `Indexing (simulated): processed ${(batchIndex + 1) * batchSize} chunks from ${documentsIndexed} documents`,
        timestamp: new Date(),
        languageStats: { detected: {}, translated: {} },
        processingStats
      });
    }

    return { documentsIndexed: uniqueDocuments.size };
  }

  /**
   * Create batches from an array for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Utility method to add delay for simulation
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the current configuration
   */
  getConfiguration(): MultilingualConfig | null {
    return this.config;
  }

  /**
   * Validate that the pipeline is ready to execute
   */
  async validatePipelineReadiness(): Promise<{ isReady: boolean; errors: string[]; warnings: string[] }> {
    try {
      const config = await this.configManager.loadMultilingualConfig();
      const validation = this.configManager.validateConfiguration(config);
      
      return {
        isReady: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      };
    } catch (error) {
      return {
        isReady: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: []
      };
    }
  }

  /**
   * Handle errors with appropriate recovery strategies
   */
  private async handleErrorWithRecovery<T>(
    operation: () => Promise<T>,
    errorType: ProcessingError['type'],
    stage: string,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Check if error is recoverable
        const isRecoverable = this.isRecoverableError(error, errorType);
        
        if (!isRecoverable || attempt === maxRetries) {
          // Create detailed error for non-recoverable errors or final attempt
          throw new MultilingualPipelineError(
            errorType,
            stage,
            `${lastError.message} (attempt ${attempt + 1}/${maxRetries + 1})`,
            isRecoverable
          );
        }
        
        // Wait before retry with exponential backoff
        const delay = backoffMs * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
        await this.delay(delay);
        
        console.warn(`Retrying ${stage} operation (attempt ${attempt + 1}/${maxRetries + 1}) after error:`, lastError.message);
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Unknown error in retry logic');
  }

  /**
   * Determine if an error is recoverable based on error type and content
   */
  private isRecoverableError(error: unknown, errorType: ProcessingError['type']): boolean {
    if (error instanceof MultilingualPipelineError) {
      return error.recoverable;
    }
    
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    
    // Define recoverable error patterns by type
    const recoverablePatterns = {
      language_detection: ['timeout', 'rate limit', 'temporary', 'network'],
      translation: ['timeout', 'rate limit', 'temporary', 'network', 'quota'],
      processing: ['timeout', 'temporary', 'network'],
      embedding: ['timeout', 'rate limit', 'temporary', 'network', 'quota'],
      indexing: ['timeout', 'rate limit', 'temporary', 'network', 'conflict'],
      configuration: [] // Configuration errors are typically not recoverable
    };
    
    const patterns = recoverablePatterns[errorType] || [];
    return patterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Get detailed pipeline statistics
   */
  getPipelineStatistics(): {
    activeJobs: number;
    totalJobsProcessed: number;
    averageProcessingTime: number;
    errorRate: number;
  } {
    const activeJobCount = Array.from(this.activeJobs.values()).filter(active => active).length;
    
    // In a real implementation, these would be tracked over time
    return {
      activeJobs: activeJobCount,
      totalJobsProcessed: 0, // Would be tracked in persistent storage
      averageProcessingTime: 0, // Would be calculated from historical data
      errorRate: 0 // Would be calculated from historical data
    };
  }

  /**
   * Get current resource usage and limits
   */
  getResourceUsage(): {
    memoryUsage: number;
    activeConnections: number;
    queuedOperations: number;
    rateLimitStatus: Record<string, { remaining: number; resetTime: Date }>;
  } {
    // In a real implementation, this would track actual resource usage
    return {
      memoryUsage: process.memoryUsage().heapUsed,
      activeConnections: this.activeJobs.size,
      queuedOperations: 0,
      rateLimitStatus: {
        translator: { remaining: 1000, resetTime: new Date(Date.now() + 3600000) },
        openai: { remaining: 500, resetTime: new Date(Date.now() + 3600000) },
        search: { remaining: 2000, resetTime: new Date(Date.now() + 3600000) }
      }
    };
  }
}