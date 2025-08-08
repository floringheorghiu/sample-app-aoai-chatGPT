# Multilingual API Integration

This document describes the enhanced `/api/admin/ingest-docs` route with multilingual RAG pipeline integration.

## Overview

The API route has been enhanced to support both traditional document processing and the new multilingual RAG pipeline. The multilingual pipeline provides:

- Automatic language detection
- Translation of non-English documents to English
- Enhanced progress tracking with multilingual-specific stages
- Comprehensive error handling for multilingual processing failures
- Real-time job status tracking with detailed multilingual progress information

## API Endpoints

### POST /api/admin/ingest-docs

Starts document ingestion using either the traditional pipeline or the multilingual pipeline.

#### Request Body

```json
{
  "files": ["document1.pdf", "document2.docx"],
  "useMultilingualPipeline": true,
  "config": {
    "index_name": "documents",
    "chunk_size": 1000,
    "token_overlap": 100,
    "language": "en",
    "njobs": 1,
    "use_form_recognizer": true,
    "form_recognizer_layout": false
  }
}
```

#### Parameters

- `files` (optional): Array of file paths to process
- `useMultilingualPipeline` (optional): Boolean flag to use multilingual pipeline (defaults to `true`)
- `config` (optional): Processing configuration object

#### Response

```json
{
  "success": true,
  "jobId": "ingest_1234567890_abc123",
  "status": "started",
  "message": "Document ingestion started successfully"
}
```

### GET /api/admin/ingest-docs

Retrieves job status or pipeline information.

#### Query Parameters

- `jobId` (optional): Specific job ID to check status
- `pipelineStatus` (optional): Set to `"true"` to check multilingual pipeline readiness

#### Examples

**Check specific job status:**
```
GET /api/admin/ingest-docs?jobId=ingest_1234567890_abc123
```

**Check pipeline status:**
```
GET /api/admin/ingest-docs?pipelineStatus=true
```

**List all jobs:**
```
GET /api/admin/ingest-docs
```

#### Response for Job Status

```json
{
  "success": true,
  "job": {
    "id": "ingest_1234567890_abc123",
    "status": "running",
    "progress": [
      {
        "stage": "language_detection",
        "progress": 30,
        "message": "Translating non-English documents...",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "languageStats": {
          "detected": { "ro": 2, "en": 1 },
          "translated": { "ro": 2 }
        },
        "processingStats": {
          "documentsProcessed": 0,
          "chunksCreated": 0,
          "embeddingsGenerated": 0,
          "documentsIndexed": 0
        }
      }
    ],
    "startTime": "2024-01-01T12:00:00.000Z",
    "isMultilingual": true
  }
}
```

#### Response for Pipeline Status

```json
{
  "success": true,
  "pipelineStatus": {
    "isReady": true,
    "errors": [],
    "warnings": ["Running in simulation mode - Azure services will not be called"],
    "configuration": {
      "credentials": { ... },
      "pipeline": { ... }
    }
  }
}
```

### DELETE /api/admin/ingest-docs

Cancels a running job.

#### Query Parameters

- `jobId` (required): Job ID to cancel

#### Example

```
DELETE /api/admin/ingest-docs?jobId=ingest_1234567890_abc123
```

#### Response

```json
{
  "success": true,
  "message": "Job cancelled successfully"
}
```

## Multilingual Progress Stages

The multilingual pipeline reports progress through the following stages:

1. **language_detection**: Detecting languages in uploaded documents
2. **translation**: Translating non-English documents to English
3. **chunking**: Processing and chunking documents
4. **embedding**: Generating embeddings for document chunks
5. **indexing**: Indexing processed documents in Azure Cognitive Search
6. **completed**: Pipeline execution completed successfully
7. **error**: Pipeline execution failed

## Configuration

The multilingual pipeline requires the following environment variables:

### Required Azure Service Credentials

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-azure-openai-api-key
AZURE_OPENAI_EMBEDDING_NAME=text-embedding-ada-002

# Azure Translator
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com/
AZURE_TRANSLATOR_KEY=your-azure-translator-key
AZURE_TRANSLATOR_REGION=your-azure-translator-region

# Azure Form Recognizer
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-form-recognizer.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=your-azure-form-recognizer-key

# Azure Cognitive Search
AZURE_SEARCH_SERVICE=your-search-service-name
AZURE_SEARCH_INDEX=your-search-index-name
AZURE_SEARCH_KEY=your-azure-search-admin-key

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=your-container-name
```

### Optional Configuration

```bash
# Multilingual settings
MULTILINGUAL_TARGET_LANGUAGE=en
MULTILINGUAL_ENABLE_TRANSLATION=true
MULTILINGUAL_LANGUAGE_DETECTION_THRESHOLD=0.8
MULTILINGUAL_CHUNK_SIZE=5000
MULTILINGUAL_TOKEN_OVERLAP=100
MULTILINGUAL_SUPPORTED_LANGUAGES=ro,en,fr,de,es,it,pt,nl,pl,ru

# Development settings
MULTILINGUAL_SIMULATION_MODE=false
DEBUG=false
```

## Error Handling

The API provides comprehensive error handling for:

- **Configuration Errors**: Missing or invalid Azure service credentials
- **Language Detection Errors**: Unable to detect document language
- **Translation Errors**: Azure Translator service failures or unsupported languages
- **Processing Errors**: Document parsing, chunking, or embedding generation failures
- **Indexing Errors**: Azure Cognitive Search indexing failures

Errors are reported in the job status with detailed information:

```json
{
  "success": false,
  "job": {
    "status": "failed",
    "error": "Configuration validation failed: Missing Azure Translator credentials",
    "result": {
      "multilingualStats": {
        "errors": [
          {
            "type": "configuration",
            "message": "Missing Azure Translator credentials",
            "stage": "initialization",
            "recoverable": false
          }
        ]
      }
    }
  }
}
```

## Backward Compatibility

The enhanced API maintains full backward compatibility with existing implementations:

- Setting `useMultilingualPipeline: false` uses the traditional pipeline
- All existing request/response formats are preserved
- Existing UI components continue to work without changes

## Development Mode

For development and testing, set `MULTILINGUAL_SIMULATION_MODE=true` to simulate multilingual processing without making actual Azure service calls. This is useful for:

- Testing the API integration
- Developing UI components
- Avoiding Azure service costs during development