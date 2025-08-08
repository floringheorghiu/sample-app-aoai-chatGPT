# Environment Setup Guide

This guide explains how to set up the environment configuration for the Narada AI Assistant with multilingual RAG pipeline support.

## Quick Start

1. **Copy the template**: `cp .env.example .env`
2. **Fill in your Azure credentials** (see sections below)
3. **For development**: Use `.env.development` with simulation mode enabled
4. **For production**: Use `.env` with all real credentials

## Environment Files Overview

| File | Purpose | When to Use |
|------|---------|-------------|
| `.env.example` | Template with all variables documented | Reference and initial setup |
| `.env` | Production configuration | Production deployment |
| `.env.development` | Development configuration with simulation mode | Local development |
| `.env.local` | Local overrides (optional) | Personal development settings |

## Required Azure Services

You need the following Azure services configured:

### 1. Azure OpenAI Service

- **Purpose**: Chat completions and text embeddings
- **Required Variables**: `AZURE_OPENAI_*`
- **Setup**: Create an Azure OpenAI resource and deploy `gpt-4o` and `text-embedding-ada-002` models

### 2. Azure Translator Service

- **Purpose**: Multilingual document translation
- **Required Variables**: `AZURE_TRANSLATOR_*`
- **Setup**: Create a Translator resource in Azure Cognitive Services

### 3. Azure Form Recognizer (Document Intelligence)

- **Purpose**: Text extraction from PDF and other documents
- **Required Variables**: `AZURE_FORM_RECOGNIZER_*`
- **Setup**: Create a Form Recognizer resource in Azure Cognitive Services

### 4. Azure AI Search (Cognitive Search)

- **Purpose**: Document indexing and semantic search
- **Required Variables**: `AZURE_SEARCH_*`
- **Setup**: Create an Azure AI Search service with semantic search enabled

### 5. Azure Blob Storage

- **Purpose**: Document storage and processing
- **Required Variables**: `AZURE_STORAGE_*`
- **Setup**: Create a storage account with a container for document uploads

## Development Setup

### Option 1: Simulation Mode (Recommended for Development)

1. Copy the development template:

   ```bash
   cp .env.development .env.local
   ```

2. Ensure simulation mode is enabled:

   ```bash
   MULTILINGUAL_SIMULATION_MODE=true
   ```

3. No Azure credentials needed - the system will simulate all operations

### Option 2: Development with Real Azure Services

1. Copy the main template:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in your development Azure credentials
3. Set reduced performance settings for faster testing
4. Enable debug mode:

   ```bash
   DEBUG=true
   ```

## Production Setup

1. Copy the template:

   ```bash
   cp .env.example .env
   ```

2. Fill in all production Azure credentials
3. Set appropriate performance settings
4. Disable simulation mode:

   ```bash
   MULTILINGUAL_SIMULATION_MODE=false
   ```

5. Configure authentication if needed:

   ```bash
   AUTH_ENABLED=true
   WEBSITE_AUTH_AAD_ALLOWED_TENANTS=your-tenant-id
   ```

## Configuration Validation

The system validates configuration on startup. Common issues:

### Missing Credentials

```
Error: Missing required environment variable: AZURE_OPENAI_KEY
```

**Solution**: Add the missing variable to your `.env` file

### Invalid Endpoints

```
Error: Invalid Azure OpenAI endpoint format
```

**Solution**: Ensure endpoints include `https://` and end with `/`

### Region Mismatches

```
Error: Azure Translator region mismatch
```

**Solution**: Ensure all services are in compatible Azure regions

## Security Best Practices

1. **Never commit credential files**:
   - `.env`, `.env.local`, `.env.production` are in `.gitignore`
   - Double-check before committing any configuration files

2. **Use different credentials for different environments**:
   - Development: Use separate Azure resources with limited access
   - Production: Use production resources with appropriate security

3. **Rotate credentials regularly**:
   - Update Azure service keys periodically
   - Use Azure Key Vault for production deployments

4. **Limit access**:
   - Use least-privilege access for Azure service keys
   - Consider using managed identities in Azure deployments

## Troubleshooting

### Common Environment Issues

1. **File not found errors**:
   - Ensure `.env` file exists in the project root
   - Check file permissions

2. **Credential validation failures**:
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure no extra spaces around values

3. **Azure service connection errors**:
   - Verify endpoints are correct and accessible
   - Check that API keys are valid and not expired
   - Ensure services are in the correct Azure region

### Testing Your Configuration

1. **Simulation Mode Test**:

   ```bash
   # Set simulation mode
   MULTILINGUAL_SIMULATION_MODE=true
   # Run the application - should work without real Azure credentials
   ```

2. **Credential Validation Test**:

   ```bash
   # Disable simulation mode
   MULTILINGUAL_SIMULATION_MODE=false
   # Run the application - will validate all Azure credentials
   ```

3. **End-to-End Test**:
   - Upload a test document through the admin interface
   - Monitor the processing progress
   - Verify successful indexing in Azure AI Search

## Environment Variable Reference

For a complete list of all environment variables and their purposes, see [MULTILINGUAL_ENVIRONMENT_VARIABLES.md](./MULTILINGUAL_ENVIRONMENT_VARIABLES.md).

## Support

If you encounter issues with environment setup:

1. Check the application logs for specific error messages
2. Verify your Azure service configurations in the Azure portal
3. Test individual services using their respective Azure SDKs
4. Consult the detailed environment variables documentation
