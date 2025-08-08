# Multilingual RAG Pipeline - Environment Variables Documentation

This document provides comprehensive documentation for all environment variables required for the Narada AI Assistant with multilingual RAG pipeline support.

## Table of Contents

1. [Core Azure OpenAI Configuration](#core-azure-openai-configuration)
2. [Azure Translator Configuration](#azure-translator-configuration)
3. [Azure Form Recognizer Configuration](#azure-form-recognizer-configuration)
4. [Azure AI Search Configuration](#azure-ai-search-configuration)
5. [Azure Blob Storage Configuration](#azure-blob-storage-configuration)
6. [Multilingual Pipeline Configuration](#multilingual-pipeline-configuration)
7. [Performance and Optimization Settings](#performance-and-optimization-settings)
8. [Development and Testing Settings](#development-and-testing-settings)
9. [Optional Configuration](#optional-configuration)
10. [Security Considerations](#security-considerations)

## Core Azure OpenAI Configuration

These variables configure the primary Azure OpenAI service for chat completions and embeddings.

| Variable | Required | Purpose | Example Value |
|----------|----------|---------|---------------|
| `AZURE_OPENAI_RESOURCE` | Yes | Name of your Azure OpenAI resource | `your-openai-resource` |
| `AZURE_OPENAI_ENDPOINT` | Yes | Full endpoint URL for Azure OpenAI service | `https://your-resource.openai.azure.com/` |
| `AZURE_OPENAI_KEY` | Yes | API key for Azure OpenAI service | `your-api-key-here` |
| `AZURE_OPENAI_MODEL` | Yes | Model name for chat completions | `gpt-4o` |
| `AZURE_OPENAI_MODEL_NAME` | Yes | Deployment name for the model | `gpt-4o` |
| `AZURE_OPENAI_PREVIEW_API_VERSION` | Yes | API version to use | `2024-05-01-preview` |
| `AZURE_OPENAI_EMBEDDING_NAME` | Yes | Embedding model deployment name | `text-embedding-ada-002` |
| `AZURE_OPENAI_EMBEDDING_ENDPOINT` | Yes | Endpoint for embedding service | `https://your-resource.openai.azure.com/` |
| `AZURE_OPENAI_EMBEDDING_KEY` | Yes | API key for embedding service | `your-embedding-key-here` |

### Model Behavior Settings

| Variable | Required | Purpose | Default | Range |
|----------|----------|---------|---------|-------|
| `AZURE_OPENAI_TEMPERATURE` | No | Controls randomness in responses | `1` | `0.0-2.0` |
| `AZURE_OPENAI_TOP_P` | No | Controls diversity via nucleus sampling | `1` | `0.0-1.0` |
| `AZURE_OPENAI_MAX_TOKENS` | No | Maximum tokens in response | `800` | `1-4096` |
| `AZURE_OPENAI_STREAM` | No | Enable streaming responses | `true` | `true/false` |

## Azure Translator Configuration

These variables configure Azure Translator service for multilingual document processing.

| Variable | Required | Purpose | Example Value |
|----------|----------|---------|---------------|
| `AZURE_TRANSLATOR_ENDPOINT` | Yes | Azure Translator service endpoint | `https://api.cognitive.microsofttranslator.com/` |
| `AZURE_TRANSLATOR_KEY` | Yes | Subscription key for Translator service | `your-translator-key` |
| `AZURE_TRANSLATOR_REGION` | Yes | Azure region for Translator service | `eastus` |
| `AZURE_TRANSLATOR_API_VERSION` | No | API version to use | `3.0` |

## Azure Form Recognizer Configuration

These variables configure Azure Form Recognizer for document text extraction.

| Variable | Required | Purpose | Example Value |
|----------|----------|---------|---------------|
| `AZURE_FORM_RECOGNIZER_ENDPOINT` | Yes | Form Recognizer service endpoint | `https://your-resource.cognitiveservices.azure.com/` |
| `AZURE_FORM_RECOGNIZER_KEY` | Yes | API key for Form Recognizer service | `your-form-recognizer-key` |

## Azure AI Search Configuration

These variables configure Azure Cognitive Search for document indexing and retrieval.

| Variable | Required | Purpose | Example Value |
|----------|----------|---------|---------------|
| `AZURE_SEARCH_SERVICE` | Yes | Name of Azure Search service | `your-search-service` |
| `AZURE_SEARCH_KEY` | Yes | Admin key for Azure Search service | `your-search-admin-key` |
| `AZURE_SEARCH_INDEX` | Yes | Default search index name | `azureblob-index` |
| `AZURE_SEARCH_MULTILINGUAL_INDEX` | No | Index name for multilingual documents | `multilingual-docs-index` |

### Search Behavior Settings

| Variable | Required | Purpose | Default |
|----------|----------|---------|---------|
| `AZURE_SEARCH_QUERY_TYPE` | No | Type of search query | `semantic` |
| `AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG` | No | Semantic search configuration | `default` |
| `AZURE_SEARCH_STRICTNESS` | No | Search result strictness | `3` |
| `AZURE_SEARCH_TOP_K` | No | Number of top results to return | `5` |
| `AZURE_SEARCH_USE_SEMANTIC_SEARCH` | No | Enable semantic search | `true` |

### Search Field Mappings

| Variable | Required | Purpose | Default |
|----------|----------|---------|---------|
| `AZURE_SEARCH_CONTENT_COLUMNS` | No | Content field name | `content` |
| `AZURE_SEARCH_FILENAME_COLUMN` | No | Filename field name | `filename` |
| `TITLE_COLUMN` | No | Title field name | `title` |
| `URL_COLUMN` | No | URL field name | `url` |
| `VECTOR_COLUMNS` | No | Vector field name | `content_vector` |

## Azure Blob Storage Configuration

These variables configure Azure Blob Storage for document storage.

| Variable | Required | Purpose | Example Value |
|----------|----------|---------|---------------|
| `AZURE_STORAGE_CONNECTION_STRING` | Yes | Full connection string for storage account | `DefaultEndpointsProtocol=https;AccountName=...` |
| `AZURE_STORAGE_CONTAINER_NAME` | Yes | Container name for document storage | `ingest-test` |
| `AZURE_STORAGE_ACCOUNT_KEY` | Yes | Storage account access key | `your-storage-key` |

## Multilingual Pipeline Configuration

These variables control the behavior of the multilingual RAG pipeline.

### Core Pipeline Settings

| Variable | Required | Purpose | Default | Options |
|----------|----------|---------|---------|---------|
| `MULTILINGUAL_TARGET_LANGUAGE` | No | Target language for translation | `en` | ISO 639-1 codes |
| `MULTILINGUAL_ENABLE_TRANSLATION` | No | Enable automatic translation | `true` | `true/false` |
| `MULTILINGUAL_FORCE_TRANSLATION` | No | Force translation even for English | `false` | `true/false` |
| `MULTILINGUAL_LANGUAGE_DETECTION_THRESHOLD` | No | Confidence threshold for language detection | `0.8` | `0.0-1.0` |

### Document Processing Settings

| Variable | Required | Purpose | Default |
|----------|----------|---------|---------|
| `MULTILINGUAL_CHUNK_SIZE` | No | Size of text chunks in characters | `5000` |
| `MULTILINGUAL_TOKEN_OVERLAP` | No | Overlap between chunks in tokens | `100` |
| `MULTILINGUAL_MIN_CHUNK_SIZE` | No | Minimum chunk size in characters | `50` |
| `MULTILINGUAL_SUPPORTED_LANGUAGES` | No | Comma-separated list of supported languages | `ro,en,fr,de,es,it,pt,nl,pl,ru` |
| `MULTILINGUAL_SUPPORTED_FORMATS` | No | Comma-separated list of supported file formats | `pdf,docx,txt,md,html` |

### Rate Limiting and Timing

| Variable | Required | Purpose | Default |
|----------|----------|---------|---------|
| `MULTILINGUAL_RATE_LIMIT_DELAY` | No | Delay between API calls in seconds | `0.1` |
| `MULTILINGUAL_MAX_RETRIES` | No | Maximum retry attempts for failed operations | `3` |
| `MULTILINGUAL_RETRY_DELAY_MS` | No | Delay between retries in milliseconds | `1000` |
| `MULTILINGUAL_TIMEOUT_MS` | No | Timeout for operations in milliseconds | `30000` |

## Performance and Optimization Settings

These variables control performance and resource usage.

| Variable | Required | Purpose | Default | Range |
|----------|----------|---------|---------|-------|
| `MULTILINGUAL_PARALLEL_JOBS` | No | Number of parallel processing jobs | `4` | `1-10` |
| `MULTILINGUAL_MAX_CONCURRENT_FILES` | No | Maximum files processed simultaneously | `5` | `1-20` |
| `MULTILINGUAL_BATCH_SIZE` | No | Batch size for API operations | `10` | `1-100` |

## Development and Testing Settings

These variables control development and testing behavior.

| Variable | Required | Purpose | Default |
|----------|----------|---------|---------|
| `DEBUG` | No | Enable debug mode | `false` |
| `MULTILINGUAL_SIMULATION_MODE` | No | Enable simulation mode (no Azure calls) | `false` |
| `SKIP_PYTHON_VALIDATION` | No | Skip Python environment validation | `false` |

### Simulation Mode Settings

When `MULTILINGUAL_SIMULATION_MODE=true`, these variables control simulated behavior:

| Variable | Purpose | Default |
|----------|---------|---------|
| `SIMULATION_LANGUAGE_DETECTION_DELAY` | Simulated language detection delay (ms) | `500` |
| `SIMULATION_TRANSLATION_DELAY` | Simulated translation delay (ms) | `1000` |
| `SIMULATION_CHUNKING_DELAY` | Simulated chunking delay (ms) | `800` |
| `SIMULATION_EMBEDDING_DELAY` | Simulated embedding delay (ms) | `1200` |
| `SIMULATION_INDEXING_DELAY` | Simulated indexing delay (ms) | `600` |
| `SIMULATION_DEFAULT_LANGUAGE` | Default detected language in simulation | `ro` |
| `SIMULATION_TRANSLATION_SUCCESS_RATE` | Success rate for simulated translations | `0.95` |
| `SIMULATION_PROCESSING_SUCCESS_RATE` | Success rate for simulated processing | `0.98` |
| `SIMULATION_CHUNKS_PER_DOCUMENT` | Number of chunks per document in simulation | `5` |
| `SIMULATION_ENABLE_RANDOM_ERRORS` | Enable random errors in simulation | `false` |

## Optional Configuration

### Chat History (Cosmos DB)

| Variable | Required | Purpose | Example Value |
|----------|----------|---------|---------------|
| `AZURE_COSMOSDB_ACCOUNT` | No | Cosmos DB account name | `your-cosmosdb-account` |
| `AZURE_COSMOSDB_DATABASE` | No | Database name | `conversation_history` |
| `AZURE_COSMOSDB_CONVERSATIONS_CONTAINER` | No | Container name for conversations | `conversations` |
| `AZURE_COSMOSDB_ACCOUNT_KEY` | No | Cosmos DB account key | `your-cosmosdb-key` |
| `AZURE_COSMOSDB_ENABLE_FEEDBACK` | No | Enable feedback collection | `false` |

### UI Customization

| Variable | Required | Purpose | Default |
|----------|----------|---------|---------|
| `UI_TITLE` | No | Application title | `Narada AI Assistant` |
| `UI_CHAT_TITLE` | No | Chat interface title | `Narada AI Assistant` |
| `UI_CHAT_DESCRIPTION` | No | Chat interface description | `Ask questions about our organization` |
| `UI_LOGO` | No | Logo URL or path | `` |
| `UI_CHAT_LOGO` | No | Chat logo URL or path | `` |

### Authentication

| Variable | Required | Purpose | Default |
|----------|----------|---------|---------|
| `AUTH_ENABLED` | No | Enable authentication | `false` |
| `WEBSITE_AUTH_AAD_ALLOWED_TENANTS` | No | Allowed Azure AD tenant IDs | `` |

## Security Considerations

### Credential Storage

1. **Never commit credentials to version control**: All credential-containing files are listed in `.gitignore`
2. **Use environment-specific files**: 
   - `.env` for production
   - `.env.development` for development
   - `.env.local` for local overrides
3. **Rotate credentials regularly**: Update all Azure service keys periodically
4. **Use Azure Key Vault in production**: For production deployments, consider using Azure Key Vault

### File Security

The following files contain credentials and should never be committed:
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `multilingual_rag_pipeline/multilingual_config.json`
- `admin-dashboard/multilingual_config.json`

### Network Security

- All Azure service communications use HTTPS
- API keys are transmitted securely
- Consider using managed identities in Azure deployments

## Environment Setup Instructions

### Development Setup

1. Copy `.env.example` to `.env.development`
2. Set `MULTILINGUAL_SIMULATION_MODE=true` for testing without Azure costs
3. Configure only the credentials you need for testing
4. Use reduced performance settings for faster development

### Production Setup

1. Copy `.env.example` to `.env`
2. Fill in all required Azure service credentials
3. Set `MULTILINGUAL_SIMULATION_MODE=false`
4. Configure appropriate performance settings for your load
5. Enable authentication if required
6. Set up monitoring and logging

### Testing Setup

1. Use `.env.development` with simulation mode enabled
2. Configure reduced timeouts and batch sizes
3. Enable detailed logging for debugging
4. Use test-specific Azure resources if available

## Troubleshooting

### Common Issues

1. **Missing credentials**: Check that all required variables are set
2. **Invalid endpoints**: Ensure URLs include protocol (https://) and trailing slash where needed
3. **Region mismatches**: Ensure all services are in compatible regions
4. **Rate limiting**: Adjust `MULTILINGUAL_RATE_LIMIT_DELAY` if hitting API limits
5. **Timeout errors**: Increase `MULTILINGUAL_TIMEOUT_MS` for large documents

### Validation

The system validates configuration on startup and will report specific missing or invalid settings. Check the application logs for detailed error messages.