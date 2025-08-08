import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import { MultilingualConfig } from './multilingual-configuration-manager';

// Document processing interfaces
export interface DocumentChunk {
  content: string;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  chunkId: string;
  filePath: string;
  originalLanguage: string;
  translatedLanguage?: string;
  chunkIndex: number;
  totalChunks: number;
  tokenCount: number;
  title?: string;
  url?: string;
}

export interface DocumentMetadata {
  filePath: string;
  fileName: string;
  fileSize: number;
  originalLanguage: string;
  translatedLanguage?: string;
  processingTimestamp: string;
  chunkCount: number;
  totalTokens: number;
  title?: string;
  url?: string;
  imageMapping?: Record<string, string>;
}

export interface ProcessedDocument {
  filePath: string;
  originalLanguage: string;
  translatedContent?: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
}

export interface ProcessingConfig {
  chunkSize: number;
  tokenOverlap: number;
  minChunkSize: number;
  useFormRecognizer: boolean;
  formRecognizerLayout: boolean;
  addEmbeddings: boolean;
  parallelJobs: number;
  supportedExtensions: string[];
  urlPrefix?: string;
}

export interface ProcessingResult {
  success: boolean;
  documentsProcessed: ProcessedDocument[];
  totalFiles: number;
  unsupportedFiles: number;
  errorFiles: number;
  skippedChunks: number;
  errors: ProcessingError[];
}

export interface ProcessingError {
  type: 'unsupported_format' | 'processing_error' | 'language_detection' | 'translation' | 'chunking';
  filePath: string;
  message: string;
  stage: string;
  recoverable: boolean;
}

// Language detection result interface
export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  isSupported: boolean;
}

// Translation result interface
export interface TranslationResult {
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export class DocumentProcessingService {
  private config: MultilingualConfig;
  private processingConfig: ProcessingConfig;
  private pythonPath: string;
  private scriptsPath: string;

  constructor(
    config: MultilingualConfig,
    processingConfig: ProcessingConfig,
    pythonPath: string = 'python',
    scriptsPath: string = '../scripts'
  ) {
    this.config = config;
    this.processingConfig = processingConfig;
    this.pythonPath = pythonPath;
    this.scriptsPath = scriptsPath;
  }

  /**
   * Process multiple documents with multilingual support
   */
  async processDocuments(
    filePaths: string[],
    progressCallback?: (progress: { stage: string; progress: number; message: string }) => void
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const processedDocuments: ProcessedDocument[] = [];
    const errors: ProcessingError[] = [];
    let totalFiles = 0;
    let unsupportedFiles = 0;
    let errorFiles = 0;
    let skippedChunks = 0;

    try {
      progressCallback?.({
        stage: 'initialization',
        progress: 0,
        message: 'Initializing document processing...'
      });

      // Validate file paths and filter supported files
      const validFiles = await this.validateAndFilterFiles(filePaths);
      totalFiles = filePaths.length;
      unsupportedFiles = totalFiles - validFiles.length;

      if (validFiles.length === 0) {
        return {
          success: false,
          documentsProcessed: [],
          totalFiles,
          unsupportedFiles,
          errorFiles: 0,
          skippedChunks: 0,
          errors: [{ 
            type: 'unsupported_format', 
            filePath: '', 
            message: 'No supported files found for processing', 
            stage: 'validation',
            recoverable: false 
          }]
        };
      }

      // Process files in batches to manage memory and API limits
      const batchSize = Math.min(this.processingConfig.parallelJobs, 5);
      const batches = this.createBatches(validFiles, batchSize);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchProgress = (batchIndex / batches.length) * 100;

        progressCallback?.({
          stage: 'processing',
          progress: batchProgress,
          message: `Processing batch ${batchIndex + 1} of ${batches.length} (${batch.length} files)...`
        });

        // Process batch in parallel
        const batchPromises = batch.map(async (filePath) => {
          try {
            return await this.processDocument(filePath);
          } catch (error) {
            errorFiles++;
            errors.push({
              type: 'processing_error',
              filePath,
              message: error instanceof Error ? error.message : 'Unknown processing error',
              stage: 'document_processing',
              recoverable: false
            });
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            processedDocuments.push(result.value);
            skippedChunks += result.value.chunks.filter(chunk => chunk.metadata.tokenCount < this.processingConfig.minChunkSize).length;
          }
        }
      }

      const duration = Date.now() - startTime;
      progressCallback?.({
        stage: 'completed',
        progress: 100,
        message: `Processing completed in ${Math.round(duration / 1000)}s. Processed ${processedDocuments.length} documents.`
      });

      return {
        success: errors.length === 0 || processedDocuments.length > 0,
        documentsProcessed: processedDocuments,
        totalFiles,
        unsupportedFiles,
        errorFiles,
        skippedChunks,
        errors
      };

    } catch (error) {
      errors.push({
        type: 'processing_error',
        filePath: '',
        message: error instanceof Error ? error.message : 'Unknown error during document processing',
        stage: 'batch_processing',
        recoverable: false
      });

      return {
        success: false,
        documentsProcessed: processedDocuments,
        totalFiles,
        unsupportedFiles,
        errorFiles,
        skippedChunks,
        errors
      };
    }
  }

  /**
   * Process a single document with multilingual support
   */
  async processDocument(filePath: string): Promise<ProcessedDocument> {
    try {
      // Step 1: Extract content using existing data_utils.py functionality
      const extractedContent = await this.extractDocumentContent(filePath);
      
      // Step 2: Detect language
      const languageResult = await this.detectLanguage(extractedContent.content);
      
      // Step 3: Translate if needed
      let translatedContent: string | undefined;
      if (this.config.pipeline.enableTranslation && 
          languageResult.language !== this.config.pipeline.targetLanguage &&
          languageResult.confidence >= this.config.pipeline.languageDetectionThreshold) {
        const translationResult = await this.translateContent(
          extractedContent.content,
          languageResult.language,
          this.config.pipeline.targetLanguage
        );
        translatedContent = translationResult.translatedText;
      }

      // Step 4: Chunk the content (use translated content if available)
      const contentToChunk = translatedContent || extractedContent.content;
      const chunks = await this.chunkContent(
        contentToChunk,
        filePath,
        languageResult.language,
        translatedContent ? this.config.pipeline.targetLanguage : undefined
      );

      // Step 5: Create document metadata
      const metadata: DocumentMetadata = {
        filePath,
        fileName: path.basename(filePath),
        fileSize: extractedContent.fileSize,
        originalLanguage: languageResult.language,
        translatedLanguage: translatedContent ? this.config.pipeline.targetLanguage : undefined,
        processingTimestamp: new Date().toISOString(),
        chunkCount: chunks.length,
        totalTokens: chunks.reduce((sum, chunk) => sum + chunk.metadata.tokenCount, 0),
        title: extractedContent.title,
        url: this.processingConfig.urlPrefix ? `${this.processingConfig.urlPrefix}${path.basename(filePath)}` : undefined,
        imageMapping: extractedContent.imageMapping
      };

      return {
        filePath,
        originalLanguage: languageResult.language,
        translatedContent,
        chunks,
        metadata
      };

    } catch (error) {
      throw new Error(`Failed to process document ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content from document using existing data_utils.py functionality
   */
  private async extractDocumentContent(filePath: string): Promise<{
    content: string;
    title?: string;
    fileSize: number;
    imageMapping?: Record<string, string>;
  }> {
    try {
      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Create a temporary Python script to extract content using data_utils.py
      const extractScript = this.createContentExtractionScript(filePath);
      const tempScriptPath = path.join(process.cwd(), 'temp_extract.py');
      
      await fs.writeFile(tempScriptPath, extractScript);

      // Execute the Python script
      const result = await this.executePythonScript(tempScriptPath);
      
      // Clean up temporary script
      await fs.unlink(tempScriptPath).catch(() => {}); // Ignore cleanup errors

      // Parse the result
      const extractedData = JSON.parse(result);
      
      return {
        content: extractedData.content,
        title: extractedData.title,
        fileSize: stats.size,
        imageMapping: extractedData.imageMapping
      };

    } catch (error) {
      throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect the language of the content
   */
  private async detectLanguage(content: string): Promise<LanguageDetectionResult> {
    // If simulation mode is enabled, return mock result
    if (this.config.pipeline.simulationMode) {
      return {
        language: 'ro', // Mock Romanian detection
        confidence: 0.95,
        isSupported: true
      };
    }

    try {
      // Use Azure Translator's detect endpoint
      const detectUrl = `${this.config.credentials.translator.endpoint}/detect?api-version=3.0`;
      
      const response = await fetch(detectUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.credentials.translator.key,
          'Ocp-Apim-Subscription-Region': this.config.credentials.translator.region,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ text: content.substring(0, 1000) }]) // Use first 1000 chars for detection
      });

      if (!response.ok) {
        throw new Error(`Language detection failed: ${response.status} ${response.statusText}`);
      }

      const results = await response.json();
      const detection = results[0];

      return {
        language: detection.language,
        confidence: detection.score,
        isSupported: this.config.pipeline.supportedLanguages.includes(detection.language)
      };

    } catch (error) {
      // Fallback to English if detection fails
      console.warn('Language detection failed, defaulting to English:', error);
      return {
        language: 'en',
        confidence: 0.5,
        isSupported: true
      };
    }
  }

  /**
   * Translate content using Azure Translator
   */
  private async translateContent(
    content: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<TranslationResult> {
    // If simulation mode is enabled, return mock result
    if (this.config.pipeline.simulationMode) {
      return {
        translatedText: `[SIMULATED TRANSLATION] ${content}`,
        originalLanguage: fromLanguage,
        targetLanguage: toLanguage,
        confidence: 0.95
      };
    }

    try {
      const translateUrl = `${this.config.credentials.translator.endpoint}/translate?api-version=3.0&from=${fromLanguage}&to=${toLanguage}`;
      
      // Split content into chunks if it's too large (Azure Translator has limits)
      const maxChunkSize = 5000; // Conservative limit
      const contentChunks = this.splitTextIntoChunks(content, maxChunkSize);
      const translatedChunks: string[] = [];

      for (const chunk of contentChunks) {
        const response = await fetch(translateUrl, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.config.credentials.translator.key,
            'Ocp-Apim-Subscription-Region': this.config.credentials.translator.region,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{ text: chunk }])
        });

        if (!response.ok) {
          throw new Error(`Translation failed: ${response.status} ${response.statusText}`);
        }

        const results = await response.json();
        translatedChunks.push(results[0].translations[0].text);
      }

      return {
        translatedText: translatedChunks.join(' '),
        originalLanguage: fromLanguage,
        targetLanguage: toLanguage,
        confidence: 0.95 // Azure Translator doesn't provide confidence scores
      };

    } catch (error) {
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chunk content into smaller pieces
   */
  private async chunkContent(
    content: string,
    filePath: string,
    originalLanguage: string,
    translatedLanguage?: string
  ): Promise<DocumentChunk[]> {
    try {
      // Create a temporary Python script to chunk content using data_utils.py
      const chunkScript = this.createChunkingScript(content, filePath);
      const tempScriptPath = path.join(process.cwd(), 'temp_chunk.py');
      
      await fs.writeFile(tempScriptPath, chunkScript);

      // Execute the Python script
      const result = await this.executePythonScript(tempScriptPath);
      
      // Clean up temporary script
      await fs.unlink(tempScriptPath).catch(() => {}); // Ignore cleanup errors

      // Parse the result
      const chunkData = JSON.parse(result);
      
      // Convert to DocumentChunk format
      const chunks: DocumentChunk[] = chunkData.chunks.map((chunk: any, index: number) => ({
        content: chunk.content,
        embedding: chunk.contentVector,
        metadata: {
          chunkId: `${path.basename(filePath)}_chunk_${index}`,
          filePath,
          originalLanguage,
          translatedLanguage,
          chunkIndex: index,
          totalChunks: chunkData.chunks.length,
          tokenCount: chunk.tokenCount || this.estimateTokenCount(chunk.content),
          title: chunk.title,
          url: chunk.url
        }
      }));

      return chunks;

    } catch (error) {
      throw new Error(`Content chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and filter supported files
   */
  private async validateAndFilterFiles(filePaths: string[]): Promise<string[]> {
    const validFiles: string[] = [];

    for (const filePath of filePaths) {
      try {
        // Check if file exists
        await fs.access(filePath);
        
        // Check if file extension is supported
        const extension = path.extname(filePath).toLowerCase().substring(1);
        if (this.processingConfig.supportedExtensions.includes(extension)) {
          validFiles.push(filePath);
        }
      } catch {
        // File doesn't exist or is not accessible, skip it
        continue;
      }
    }

    return validFiles;
  }

  /**
   * Create batches of files for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Split text into chunks for translation
   */
  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If single sentence is too long, split by words
        if (sentence.length > maxChunkSize) {
          const words = sentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length > maxChunkSize) {
              if (wordChunk) {
                chunks.push(wordChunk.trim());
                wordChunk = '';
              }
            }
            wordChunk += word + ' ';
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          }
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence + '.';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Estimate token count for a text
   */
  private estimateTokenCount(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Create Python script for content extraction
   */
  private createContentExtractionScript(filePath: string): string {
    return `
import sys
import os
import json
sys.path.append('${this.scriptsPath}')

from data_utils import chunk_file, SingletonFormRecognizerClient
import tempfile

try:
    # Initialize Form Recognizer client if needed
    form_recognizer_client = None
    if ${this.processingConfig.useFormRecognizer}:
        form_recognizer_client = SingletonFormRecognizerClient()
    
    # Extract content from file
    result = chunk_file(
        file_path='${filePath}',
        ignore_errors=True,
        num_tokens=1000000,  # Large number to get full content
        min_chunk_size=1,
        token_overlap=0,
        form_recognizer_client=form_recognizer_client,
        use_layout=${this.processingConfig.formRecognizerLayout},
        add_embeddings=False
    )
    
    if result.chunks:
        # Combine all chunks to get full content
        full_content = '\\n'.join([chunk.content for chunk in result.chunks])
        title = result.chunks[0].title if result.chunks else None
        image_mapping = json.loads(result.chunks[0].image_mapping) if result.chunks and result.chunks[0].image_mapping else {}
        
        output = {
            'content': full_content,
            'title': title,
            'imageMapping': image_mapping
        }
    else:
        output = {
            'content': '',
            'title': None,
            'imageMapping': {}
        }
    
    print(json.dumps(output))
    
except Exception as e:
    error_output = {
        'error': str(e),
        'content': '',
        'title': None,
        'imageMapping': {}
    }
    print(json.dumps(error_output))
    sys.exit(1)
`;
  }

  /**
   * Create Python script for content chunking
   */
  private createChunkingScript(content: string, filePath: string): string {
    // Escape content for Python string
    const escapedContent = content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    return `
import sys
import os
import json
sys.path.append('${this.scriptsPath}')

from data_utils import chunk_content

try:
    # Chunk the content
    result = chunk_content(
        content="""${escapedContent}""",
        file_name='${path.basename(filePath)}',
        ignore_errors=True,
        num_tokens=${this.processingConfig.chunkSize},
        min_chunk_size=${this.processingConfig.minChunkSize},
        token_overlap=${this.processingConfig.tokenOverlap},
        add_embeddings=${this.processingConfig.addEmbeddings}
    )
    
    # Convert chunks to JSON-serializable format
    chunks_data = []
    for chunk in result.chunks:
        chunk_data = {
            'content': chunk.content,
            'title': chunk.title,
            'url': chunk.url,
            'contentVector': chunk.contentVector,
            'tokenCount': len(chunk.content.split())  # Simple token estimation
        }
        chunks_data.append(chunk_data)
    
    output = {
        'chunks': chunks_data,
        'total_files': result.total_files,
        'num_unsupported_format_files': result.num_unsupported_format_files,
        'num_files_with_errors': result.num_files_with_errors,
        'skipped_chunks': result.skipped_chunks
    }
    
    print(json.dumps(output))
    
except Exception as e:
    error_output = {
        'error': str(e),
        'chunks': []
    }
    print(json.dumps(error_output))
    sys.exit(1)
`;
  }

  /**
   * Execute Python script and return output
   */
  private async executePythonScript(scriptPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to execute Python script: ${error.message}`));
      });
    });
  }

  /**
   * Process documents from Azure Blob Storage paths
   */
  async processDocumentsFromBlobStorage(
    blobPaths: string[],
    progressCallback?: (progress: { stage: string; progress: number; message: string }) => void
  ): Promise<ProcessingResult> {
    try {
      progressCallback?.({
        stage: 'blob_download',
        progress: 0,
        message: 'Downloading documents from Azure Blob Storage...'
      });

      // Create temporary directory for downloaded files
      const tempDir = path.join(process.cwd(), 'temp_blob_downloads');
      await fs.mkdir(tempDir, { recursive: true });

      const localFilePaths: string[] = [];

      // Download files from blob storage
      for (let i = 0; i < blobPaths.length; i++) {
        const blobPath = blobPaths[i];
        const fileName = path.basename(blobPath);
        const localPath = path.join(tempDir, fileName);

        progressCallback?.({
          stage: 'blob_download',
          progress: (i / blobPaths.length) * 50, // First 50% for downloads
          message: `Downloading ${fileName}...`
        });

        // Download file from blob storage
        await this.downloadFromBlobStorage(blobPath, localPath);
        localFilePaths.push(localPath);
      }

      // Process the downloaded files
      const result = await this.processDocuments(localFilePaths, (progress) => {
        progressCallback?.({
          stage: progress.stage,
          progress: 50 + (progress.progress * 0.5), // Second 50% for processing
          message: progress.message
        });
      });

      // Clean up temporary files
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

      return result;

    } catch (error) {
      throw new Error(`Blob storage processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download file from Azure Blob Storage
   */
  private async downloadFromBlobStorage(blobPath: string, localPath: string): Promise<void> {
    // This is a simplified implementation
    // In a real implementation, you would use Azure Storage SDK
    if (this.config.pipeline.simulationMode) {
      // Create a mock file for simulation
      await fs.writeFile(localPath, `Mock content for ${path.basename(blobPath)}`);
      return;
    }

    // TODO: Implement actual Azure Blob Storage download
    // For now, throw an error to indicate this needs implementation
    throw new Error('Azure Blob Storage download not yet implemented. Use local files or enable simulation mode.');
  }
}