# Multilingual RAG Pipeline Configuration

This document describes how to set up and configure the multilingual RAG pipeline integration with the admin dashboard.

## Overview

The multilingual configuration system bridges the admin dashboard (TypeScript/Node.js) with the existing Python multilingual pipeline. It provides:

- **Secure credential management** from environment variables
- **Configuration validation** for all Azure services
- **Pipeline integration** with the existing `multilingual_rag_pipeline`
- **Error handling** and logging for troubleshooting

## Architecture

```
Admin Dashboard (TypeScript)
├── MultilingualConfigurationManager
├── MultilingualPipelineBridge  
└── MultilingualSetup
    │
    ▼
Environment Variables (.env)
    │
    ▼
Pipeline Configuration (JSON)
    │
    ▼
Python Multilingual Pipeline
```

## Required Environment Variables

The following environment variables must be set in your `.env` file:

### Azure OpenAI

```bash
AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-openai-key
AZURE_OPENAI_EMBEDDING_NAME=text-embedding-ada-002
```

### Azure Translator

```bash
AZURE_TRANSLATOR_ENDPOINT=https://your-translator.cognitiveservices.azure.com/
AZURE_TRANSLATOR_KEY=your-translator-key
AZURE_TRANSLATOR_REGION=your-region
```

### Azure Search

```bash
AZURE_SEARCH_SERVICE=your-search-service-name
AZURE_SEARCH_INDEX=your-index-name
AZURE_SEARCH_KEY=your-search-key
```

### Azure Form Recognizer

```bash
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-form-recognizer.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=your-form-recognizer-key
```

### Azure Storage

```bash
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=your-container-name
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd admin-dashboard
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your Azure credentials:

```bash
cp .env.example .env
# Edit .env with your actual Azure service credentials
```

### 3. Test Configuration

Run the configuration test to verify everything is set up correctly:

```bash
node test-multilingual-config.js
```

### 4. Initialize Pipeline

```typescript
import { multilingualSetup } from './src/lib/multilingual-setup';

// Initialize the pipeline
const result = await multilingualSetup.initialize();

if (result.success) {
  console.log('✅ Pipeline ready!');
} else {
  console.log('❌ Setup failed:', result.errors);
}
```

## Usage Examples

### Basic Configuration Loading

```typescript
import { LocalConfigProvider } from './src/lib/config-manager';
import { MultilingualConfigurationManager } from './src/lib/multilingual-configuration-manager';

const configProvider = new LocalConfigProvider();
const configManager = new MultilingualConfigurationManager(configProvider);

// Load complete configuration
const config = await configManager.loadMultilingualConfig();

// Generate pipeline-compatible JSON
const pipelineConfig = await configManager.generatePipelineConfig();
```

### Pipeline Integration

```typescript
import { MultilingualPipelineBridge } from './src/lib/multilingual-pipeline-bridge';

const bridge = new MultilingualPipelineBridge(configProvider);

// Initialize pipeline
await bridge.initializePipeline();

// Execute pipeline with documents
const result = await bridge.executePipeline([
  '/path/to/document1.pdf',
  '/path/to/document2.docx'
]);
```

### Health Monitoring

```typescript
import { multilingualSetup } from './src/lib/multilingual-setup';

// Quick health check
const isHealthy = await multilingualSetup.healthCheck();

// Detailed status
const status = await multilingualSetup.getStatus();
console.log('Services:', status.services);
console.log('Errors:', status.errors);
```

## Configuration Files

### Pipeline Configuration Schema

The system generates a `multilingual_config.json` file compatible with the Python pipeline:

```json
{
  "azure_translator": {
    "endpoint": "https://...",
    "subscription_key": "...",
    "region": "...",
    "api_version": "3.0"
  },
  "azure_storage": {
    "account_name": "...",
    "account_key": "...",
    "container_name": "..."
  },
  "processing_settings": {
    "chunk_size": 1024,
    "chunk_overlap": 128,
    "translation_enabled": true,
    "max_concurrent_files": 5
  }
}
```

### Admin Dashboard Configuration

The admin dashboard stores its configuration in JSON files under `src/data/config/`:

- `multilingual-pipeline.json` - Pipeline settings
- `multilingual-pipeline-json.json` - Generated pipeline config
- `pipeline-config-export.json` - Export metadata

## Error Handling

The configuration system provides comprehensive error handling:

### Configuration Validation Errors

- Missing required credentials
- Invalid service endpoints
- Malformed configuration values

### Pipeline Integration Errors

- Python pipeline not found
- Configuration file write failures
- Service connection failures

### Example Error Handling

```typescript
try {
  const config = await configManager.loadMultilingualConfig();
} catch (error) {
  if (error instanceof ConfigurationValidationError) {
    console.log('Validation errors:', error.errors);
    console.log('Warnings:', error.warnings);
  } else if (error instanceof MissingCredentialError) {
    console.log('Missing credential:', error.credentialName);
    console.log('Environment variable:', error.environmentVariable);
  }
}
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Check that all required variables are set in `.env`
   - Verify variable names match exactly

2. **Invalid Azure Credentials**
   - Test credentials in Azure Portal
   - Check service endpoints are correct
   - Verify keys haven't expired

3. **Pipeline Not Found**
   - Ensure `multilingual_rag_pipeline` directory exists
   - Check Python pipeline script is present
   - Verify file permissions

4. **Configuration Validation Failures**
   - Run test script to identify specific issues
   - Check Azure service quotas and limits
   - Verify network connectivity to Azure services

### Debug Mode

Enable detailed logging by setting:

```bash
DEBUG=true
MULTILINGUAL_SIMULATION_MODE=true  # For testing without Azure calls
```

## Development

### Running Tests

```bash
# Test configuration
node test-multilingual-config.js

# Test with simulation mode
MULTILINGUAL_SIMULATION_MODE=true node test-multilingual-config.js
```

### Adding New Configuration Options

1. Update the `MultilingualPipelineConfig` interface
2. Add validation in `validatePipelineConfig()`
3. Update the default configuration
4. Add environment variable mapping if needed

## Security Notes

- Never commit `.env` files to version control
- Use Azure Key Vault for production deployments
- Rotate credentials regularly
- Monitor Azure service usage and costs

## Support

For issues with the multilingual configuration:

1. Check the troubleshooting section above
2. Run the test script to identify specific problems
3. Review Azure service logs and quotas
4. Verify all environment variables are correctly set
