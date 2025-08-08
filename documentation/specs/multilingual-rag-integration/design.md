# Design Document

## Overview

This design document outlines the integration of a multilingual RAG pipeline into the existing admin dashboard document upload feature. The solution will replace the current mocked document processing with a real multilingual pipeline that processes documents in any language, translates them to English when needed, and indexes them in Azure Cognitive Search.

The design leverages the existing admin dashboard UI, backend API structure, and Azure services while introducing new components for multilingual processing, secure credential management, and real-time progress tracking.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Admin Dashboard Frontend"
        UI[Document Upload UI]
        Progress[Progress Dialog]
    end
    
    subgraph "Next.js API Layer"
        API[/api/admin/ingest-docs]
        JobTracker[Job Status Tracker]
    end
    
    subgraph "Multilingual RAG Pipeline"
        Coordinator[Pipeline Coordinator]
        LangDetect[Language Detection]
        Translator[Azure Translator]
        Chunker[Document Chunker]
        Embedder[Embedding Generator]
        Indexer[Azure Search Indexer]
    end
    
    subgraph "Azure Services"
        Blob[Azure Blob Storage]
        Search[Azure Cognitive Search]
        OpenAI[Azure OpenAI]
        FormRec[Azure Form Recognizer]
        TranslatorSvc[Azure Translator Service]
    end
    
    subgraph "Configuration"
        EnvConfig[Environment Variables]
        PipelineConfig[Pipeline Configuration]
    end
    
    UI --> API
    API --> JobTracker
    API --> Coordinator
    Coordinator --> LangDetect
    Coordinator --> Translator
    Coordinator --> Chunker
    Coordinator --> Embedder
    Coordinator --> Indexer
    
    Translator --> TranslatorSvc
    Chunker --> FormRec
    Embedder --> OpenAI
    Indexer --> Search
    
    Coordinator --> Blob
    EnvConfig --> Coordinator
    PipelineConfig --> Coordinator
    
    Progress --> JobTracker
```

### Component Architecture

The system consists of several key components:

1. **Frontend Layer**: Existing React components with no changes required
2. **API Layer**: Enhanced Next.js API routes with real pipeline integration
3. **Pipeline Coordinator**: New orchestration layer managing the multilingual workflow
4. **Processing Components**: Language detection, translation, chunking, embedding, and indexing
5. **Configuration Management**: Secure credential storage and pipeline configuration
6. **Job Management**: Real-time progress tracking and status updates

## Components and Interfaces

### 1. Pipeline Coordinator

**Purpose**: Orchestrates the entire multilingual RAG pipeline execution

**Interface**:
```typescript
interface PipelineCoordinator {
  executeMultilingualPipeline(
    files: string[],
    config: MultilingualConfig,
    progressCallback: (progress: ExecutionProgress) => void
  ): Promise<PipelineResult>
  
  cancelPipeline(jobId: string): Promise<boolean>
}

interface MultilingualConfig {
  // Azure service configurations
  azureOpenAI: AzureOpenAIConfig
  azureTranslator: AzureTranslatorConfig
  azureSearch: AzureSearchConfig
  azureFormRecognizer: AzureFormRecognizerConfig
  azureStorage: AzureStorageConfig
  
  // Processing parameters
  chunkSize: number
  tokenOverlap: number
  targetLanguage: string
  indexName: string
  
  // Pipeline options
  enableTranslation: boolean
  useFormRecognizer: boolean
  parallelProcessing: number
}

interface PipelineResult {
  success: boolean
  documentsProcessed: number
  chunksCreated: number
  documentsIndexed: number
  languagesDetected: string[]
  translatedDocuments: number
  errors: ProcessingError[]
  duration: number
}
```

**Implementation Location**: `admin-dashboard/src/lib/multilingual-pipeline-coordinator.ts`

### 2. Language Detection Service

**Purpose**: Detects the language of uploaded documents

**Interface**:
```typescript
interface LanguageDetectionService {
  detectLanguage(text: string): Promise<LanguageDetectionResult>
  detectLanguageBatch(texts: string[]): Promise<LanguageDetectionResult[]>
}

interface LanguageDetectionResult {
  language: string
  confidence: number
  isSupported: boolean
}
```

**Implementation Location**: `admin-dashboard/src/lib/language-detection-service.ts`

### 3. Translation Service

**Purpose**: Translates non-English documents to English using Azure Translator

**Interface**:
```typescript
interface TranslationService {
  translateText(
    text: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<TranslationResult>
  
  translateBatch(
    texts: string[],
    fromLanguage: string,
    toLanguage: string
  ): Promise<TranslationResult[]>
}

interface TranslationResult {
  translatedText: string
  originalLanguage: string
  targetLanguage: string
  confidence: number
}
```

**Implementation Location**: `admin-dashboard/src/lib/translation-service.ts`

### 4. Document Processing Service

**Purpose**: Handles document chunking and text extraction using existing data_utils.py functionality

**Interface**:
```typescript
interface DocumentProcessingService {
  processDocuments(
    filePaths: string[],
    config: ProcessingConfig
  ): Promise<ProcessedDocument[]>
}

interface ProcessedDocument {
  filePath: string
  originalLanguage: string
  translatedContent?: string
  chunks: DocumentChunk[]
  metadata: DocumentMetadata
}

interface DocumentChunk {
  content: string
  embedding?: number[]
  metadata: ChunkMetadata
}
```

**Implementation Location**: `admin-dashboard/src/lib/document-processing-service.ts`

### 5. Configuration Manager

**Purpose**: Manages secure loading and validation of Azure service credentials

**Interface**:
```typescript
interface ConfigurationManager {
  loadMultilingualConfig(): Promise<MultilingualConfig>
  validateConfiguration(config: MultilingualConfig): ValidationResult
  getAzureCredentials(): Promise<AzureCredentials>
}

interface AzureCredentials {
  openAI: {
    endpoint: string
    key: string
    embeddingModel: string
  }
  translator: {
    endpoint: string
    key: string
    region: string
  }
  search: {
    endpoint: string
    key: string
  }
  formRecognizer: {
    endpoint: string
    key: string
  }
  storage: {
    connectionString: string
    containerName: string
  }
}
```

**Implementation Location**: `admin-dashboard/src/lib/configuration-manager.ts`

### 6. Enhanced API Route

**Purpose**: Integrates the multilingual pipeline with the existing API structure

**Modifications to**: `admin-dashboard/src/app/api/admin/ingest-docs/route.ts`

**Key Changes**:
- Replace `processIngestion()` function with multilingual pipeline execution
- Add configuration loading for multilingual services
- Enhance progress tracking with language detection and translation stages
- Add error handling for multilingual-specific failures

## Data Models

### Configuration Schema

```json
{
  "multilingual": {
    "azure_translator": {
      "endpoint": "https://api.cognitive.microsofttranslator.com/",
      "key": "${AZURE_TRANSLATOR_KEY}",
      "region": "${AZURE_TRANSLATOR_REGION}"
    },
    "processing": {
      "target_language": "en",
      "enable_translation": true,
      "language_detection_threshold": 0.8,
      "chunk_size": 1024,
      "token_overlap": 128,
      "parallel_jobs": 4
    },
    "supported_languages": [
      "ro", "en", "fr", "de", "es", "it", "pt", "nl", "pl", "ru"
    ]
  }
}
```

### Progress Tracking Schema

```typescript
interface MultilingualProgress extends ExecutionProgress {
  stage: 'language_detection' | 'translation' | 'chunking' | 'embedding' | 'indexing'
  languageStats?: {
    detected: { [language: string]: number }
    translated: { [language: string]: number }
  }
  processingStats?: {
    documentsProcessed: number
    chunksCreated: number
    embeddingsGenerated: number
    documentsIndexed: number
  }
}
```

## Error Handling

### Error Categories

1. **Configuration Errors**: Missing or invalid Azure service credentials
2. **Language Detection Errors**: Unable to detect document language
3. **Translation Errors**: Azure Translator service failures or unsupported languages
4. **Processing Errors**: Document parsing, chunking, or embedding generation failures
5. **Indexing Errors**: Azure Cognitive Search indexing failures

### Error Handling Strategy

```typescript
interface ProcessingError {
  type: 'configuration' | 'language_detection' | 'translation' | 'processing' | 'indexing'
  message: string
  filePath?: string
  stage: string
  recoverable: boolean
  retryCount?: number
}

class MultilingualPipelineError extends Error {
  constructor(
    public type: ProcessingError['type'],
    public stage: string,
    message: string,
    public recoverable: boolean = false
  ) {
    super(message)
  }
}
```

### Retry Logic

- **Translation failures**: Exponential backoff with 3 retry attempts
- **Azure service rate limits**: Automatic retry with jitter
- **Temporary network issues**: Linear backoff with 5 retry attempts
- **Document processing errors**: Skip individual files, continue with batch

## Testing Strategy

### Unit Tests

1. **Configuration Manager Tests**
   - Credential loading and validation
   - Environment variable handling
   - Configuration schema validation

2. **Language Detection Tests**
   - Language detection accuracy
   - Confidence threshold handling
   - Batch processing functionality

3. **Translation Service Tests**
   - Text translation accuracy
   - Batch translation performance
   - Error handling for unsupported languages

4. **Document Processing Tests**
   - Chunking algorithm validation
   - Embedding generation
   - Metadata preservation

### Integration Tests

1. **End-to-End Pipeline Tests**
   - Complete multilingual document processing
   - Progress tracking accuracy
   - Error recovery scenarios

2. **Azure Service Integration Tests**
   - Azure Translator API integration
   - Azure Cognitive Search indexing
   - Azure OpenAI embedding generation

### Performance Tests

1. **Scalability Tests**
   - Large document batch processing
   - Concurrent job execution
   - Memory usage optimization

2. **Azure Service Limits Tests**
   - Rate limit handling
   - Service quota management
   - Cost optimization

## Security Considerations

### Credential Management

1. **Environment Variables**: Store all Azure service keys in environment variables
2. **Configuration Files**: Use `.env.local` for development, exclude from version control
3. **Production Deployment**: Use Azure Key Vault or similar secure storage
4. **Credential Rotation**: Support for updating credentials without service restart

### Data Security

1. **Document Content**: Ensure translated content maintains original security classification
2. **Temporary Storage**: Clean up temporary files after processing
3. **Logging**: Avoid logging sensitive document content or credentials
4. **Network Security**: Use HTTPS for all Azure service communications

### Access Control

1. **Admin Authentication**: Maintain existing admin authentication requirements
2. **API Security**: Validate all input parameters and file paths
3. **Resource Access**: Limit Azure service permissions to minimum required scope

## Performance Optimization

### Processing Optimization

1. **Parallel Processing**: Process multiple documents concurrently
2. **Batch Operations**: Use batch APIs for translation and embedding generation
3. **Caching**: Cache language detection results for similar documents
4. **Streaming**: Stream large document processing to reduce memory usage

### Azure Service Optimization

1. **Connection Pooling**: Reuse HTTP connections for Azure service calls
2. **Request Batching**: Combine multiple API calls where possible
3. **Regional Deployment**: Use Azure services in the same region to reduce latency
4. **Cost Management**: Monitor and optimize Azure service usage costs

### Memory Management

1. **Document Streaming**: Process large documents in chunks to avoid memory issues
2. **Garbage Collection**: Explicitly clean up large objects after processing
3. **Resource Limits**: Set maximum memory limits for processing jobs
4. **Progress Checkpoints**: Save progress periodically for long-running jobs

## Deployment Considerations

### Environment Configuration

1. **Development Environment**
   - Use simulation mode for testing without Azure service costs
   - Local configuration file for development credentials
   - Mock services for offline development

2. **Production Environment**
   - Secure credential storage using Azure Key Vault
   - Production-grade error handling and monitoring
   - Automated deployment with credential injection

### Monitoring and Logging

1. **Application Insights**: Track pipeline performance and errors
2. **Custom Metrics**: Monitor translation accuracy and processing times
3. **Alert Configuration**: Set up alerts for pipeline failures and service limits
4. **Cost Monitoring**: Track Azure service usage and costs

### Scalability Planning

1. **Horizontal Scaling**: Support for multiple pipeline instances
2. **Queue Management**: Use Azure Service Bus for job queuing in high-load scenarios
3. **Load Balancing**: Distribute processing across multiple instances
4. **Auto-scaling**: Automatic scaling based on processing queue length