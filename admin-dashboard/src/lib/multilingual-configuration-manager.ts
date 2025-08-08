import { ConfigProvider } from './config-manager';

// Azure service credential interfaces
export interface AzureOpenAICredentials {
  endpoint: string;
  key: string;
  embeddingModel: string;
  apiVersion?: string;
}

export interface AzureTranslatorCredentials {
  endpoint: string;
  key: string;
  region: string;
}

export interface AzureSearchCredentials {
  endpoint: string;
  key: string;
  indexName: string;
}

export interface AzureFormRecognizerCredentials {
  endpoint: string;
  key: string;
}

export interface AzureStorageCredentials {
  connectionString: string;
  containerName: string;
  accountKey?: string;
}

export interface AzureCosmosDBCredentials {
  account: string;
  database: string;
  container: string;
  accountKey: string;
}

// Complete Azure credentials collection
export interface AzureCredentials {
  openAI: AzureOpenAICredentials;
  translator: AzureTranslatorCredentials;
  search: AzureSearchCredentials;
  formRecognizer: AzureFormRecognizerCredentials;
  storage: AzureStorageCredentials;
  cosmosDB?: AzureCosmosDBCredentials;
}

// Multilingual pipeline configuration
export interface MultilingualPipelineConfig {
  // Processing parameters
  targetLanguage: string;
  enableTranslation: boolean;
  languageDetectionThreshold: number;
  chunkSize: number;
  tokenOverlap: number;
  parallelJobs: number;
  
  // Azure service settings
  useFormRecognizer: boolean;
  formRecognizerLayout: boolean;
  
  // Supported languages
  supportedLanguages: string[];
  
  // Performance settings
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  
  // Development settings
  simulationMode: boolean;
  enableDetailedLogging: boolean;
}

// Complete multilingual configuration
export interface MultilingualConfig {
  credentials: AzureCredentials;
  pipeline: MultilingualPipelineConfig;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration validation error
export class ConfigurationValidationError extends Error {
  constructor(
    public errors: string[],
    public warnings: string[] = []
  ) {
    super(`Configuration validation failed: ${errors.join(', ')}`);
    this.name = 'ConfigurationValidationError';
  }
}

// Missing credential error
export class MissingCredentialError extends Error {
  constructor(
    public credentialName: string,
    public environmentVariable?: string
  ) {
    super(
      `Missing required credential: ${credentialName}${
        environmentVariable ? ` (${environmentVariable})` : ''
      }`
    );
    this.name = 'MissingCredentialError';
  }
}

export class MultilingualConfigurationManager {
  private configProvider: ConfigProvider;
  private environmentVariables: Record<string, string | undefined>;

  constructor(configProvider: ConfigProvider) {
    this.configProvider = configProvider;
    this.environmentVariables = process.env;
  }

  /**
   * Generate pipeline-compatible JSON configuration from environment variables
   * This creates the multilingual_config.json format expected by the existing pipeline
   */
  async generatePipelineConfig(): Promise<any> {
    const credentials = await this.loadAzureCredentials();
    const pipeline = await this.loadPipelineConfig();

    // Convert to the format expected by multilingual_ingestion_pipeline.py
    const pipelineConfig = {
      azure_translator: {
        endpoint: credentials.translator.endpoint,
        subscription_key: credentials.translator.key,
        region: credentials.translator.region,
        api_version: "3.0"
      },
      azure_storage: {
        account_name: this.extractStorageAccountName(credentials.storage.connectionString),
        account_key: credentials.storage.accountKey || this.extractStorageKey(credentials.storage.connectionString),
        container_name: credentials.storage.containerName
      },
      azure_document_intelligence: {
        endpoint: credentials.formRecognizer.endpoint,
        key: credentials.formRecognizer.key
      },
      azure_search: {
        service_name: this.extractSearchServiceName(credentials.search.endpoint),
        admin_key: credentials.search.key,
        index_name: credentials.search.indexName
      },
      azure_openai: {
        endpoint: credentials.openAI.endpoint,
        key: credentials.openAI.key,
        embedding_deployment: credentials.openAI.embeddingModel
      },
      processing_settings: {
        chunk_size: pipeline.chunkSize,
        rate_limit_delay: pipeline.retryDelayMs / 1000, // Convert ms to seconds
        timeout: pipeline.timeoutMs / 1000, // Convert ms to seconds
        max_retries: pipeline.maxRetries,
        chunk_overlap: pipeline.tokenOverlap,
        min_chunk_size: 50, // Fixed minimum
        max_concurrent_files: pipeline.parallelJobs,
        translation_enabled: pipeline.enableTranslation,
        force_translation: false, // Default to false
        supported_formats: ["pdf", "docx", "txt", "md", "html"]
      }
    };

    // Save the pipeline config for the Python pipeline to use
    await this.configProvider.saveConfig('multilingual-pipeline-json', pipelineConfig);
    
    return pipelineConfig;
  }

  /**
   * Load complete multilingual configuration from environment variables and config files
   */
  async loadMultilingualConfig(): Promise<MultilingualConfig> {
    try {
      // Load credentials from environment variables
      const credentials = await this.loadAzureCredentials();
      
      // Load pipeline configuration from config file or use defaults
      const pipeline = await this.loadPipelineConfig();
      
      const config: MultilingualConfig = {
        credentials,
        pipeline
      };

      // Validate the complete configuration
      const validation = this.validateConfiguration(config);
      if (!validation.isValid) {
        throw new ConfigurationValidationError(validation.errors, validation.warnings);
      }

      return config;
    } catch (error) {
      if (error instanceof ConfigurationValidationError || error instanceof MissingCredentialError) {
        throw error;
      }
      throw new Error(`Failed to load multilingual configuration: ${error}`);
    }
  }

  /**
   * Load Azure service credentials from environment variables
   */
  async getAzureCredentials(): Promise<AzureCredentials> {
    return this.loadAzureCredentials();
  }

  /**
   * Validate the complete multilingual configuration
   */
  validateConfiguration(config: MultilingualConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate credentials
    const credentialValidation = this.validateCredentials(config.credentials);
    errors.push(...credentialValidation.errors);
    warnings.push(...credentialValidation.warnings);

    // Validate pipeline configuration
    const pipelineValidation = this.validatePipelineConfig(config.pipeline);
    errors.push(...pipelineValidation.errors);
    warnings.push(...pipelineValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Save pipeline configuration to config file
   */
  async savePipelineConfig(config: MultilingualPipelineConfig): Promise<boolean> {
    const validation = this.validatePipelineConfig(config);
    if (!validation.isValid) {
      throw new ConfigurationValidationError(validation.errors, validation.warnings);
    }

    return await this.configProvider.saveConfig('multilingual-pipeline', config);
  }

  /**
   * Initialize default multilingual configuration
   */
  async initializeDefaultMultilingualConfig(): Promise<void> {
    const exists = await this.configProvider.configExists('multilingual-pipeline');
    if (!exists) {
      const defaultConfig = this.getDefaultPipelineConfig();
      await this.configProvider.saveConfig('multilingual-pipeline', defaultConfig);
    }
  }

  /**
   * Load Azure credentials from environment variables
   */
  private async loadAzureCredentials(): Promise<AzureCredentials> {
    const credentials: AzureCredentials = {
      openAI: {
        endpoint: this.getRequiredEnvVar('AZURE_OPENAI_ENDPOINT', 'Azure OpenAI endpoint'),
        key: this.getRequiredEnvVar('AZURE_OPENAI_KEY', 'Azure OpenAI key'),
        embeddingModel: this.getEnvVar('AZURE_OPENAI_EMBEDDING_NAME', 'text-embedding-ada-002'),
        apiVersion: this.getEnvVar('AZURE_OPENAI_PREVIEW_API_VERSION', '2024-05-01-preview')
      },
      translator: {
        endpoint: this.getEnvVar('AZURE_TRANSLATOR_ENDPOINT', 'https://api.cognitive.microsofttranslator.com/'),
        key: this.getRequiredEnvVar('AZURE_TRANSLATOR_KEY', 'Azure Translator key'),
        region: this.getRequiredEnvVar('AZURE_TRANSLATOR_REGION', 'Azure Translator region')
      },
      search: {
        endpoint: this.buildSearchEndpoint(),
        key: this.getRequiredEnvVar('AZURE_SEARCH_KEY', 'Azure Search key'),
        indexName: this.getRequiredEnvVar('AZURE_SEARCH_INDEX', 'Azure Search index name')
      },
      formRecognizer: {
        endpoint: this.getRequiredEnvVar('AZURE_FORM_RECOGNIZER_ENDPOINT', 'Azure Form Recognizer endpoint'),
        key: this.getRequiredEnvVar('AZURE_FORM_RECOGNIZER_KEY', 'Azure Form Recognizer key')
      },
      storage: {
        connectionString: this.getRequiredEnvVar('AZURE_STORAGE_CONNECTION_STRING', 'Azure Storage connection string'),
        containerName: this.getRequiredEnvVar('AZURE_STORAGE_CONTAINER_NAME', 'Azure Storage container name'),
        accountKey: this.getEnvVar('AZURE_STORAGE_ACCOUNT_KEY')
      }
    };

    // Optional Cosmos DB credentials
    const cosmosAccount = this.getEnvVar('AZURE_COSMOSDB_ACCOUNT');
    if (cosmosAccount) {
      credentials.cosmosDB = {
        account: cosmosAccount,
        database: this.getRequiredEnvVar('AZURE_COSMOSDB_DATABASE', 'Azure Cosmos DB database'),
        container: this.getRequiredEnvVar('AZURE_COSMOSDB_CONVERSATIONS_CONTAINER', 'Azure Cosmos DB container'),
        accountKey: this.getRequiredEnvVar('AZURE_COSMOSDB_ACCOUNT_KEY', 'Azure Cosmos DB account key')
      };
    }

    return credentials;
  }

  /**
   * Load pipeline configuration from config file or return defaults
   */
  private async loadPipelineConfig(): Promise<MultilingualPipelineConfig> {
    try {
      return await this.configProvider.loadConfig<MultilingualPipelineConfig>('multilingual-pipeline');
    } catch {
      // Return default configuration if file doesn't exist
      return this.getDefaultPipelineConfig();
    }
  }

  /**
   * Get default pipeline configuration
   */
  private getDefaultPipelineConfig(): MultilingualPipelineConfig {
    return {
      targetLanguage: 'en',
      enableTranslation: true,
      languageDetectionThreshold: 0.8,
      chunkSize: 1024,
      tokenOverlap: 128,
      parallelJobs: 4,
      useFormRecognizer: true,
      formRecognizerLayout: true,
      supportedLanguages: [
        'ro', 'en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'ru', 'hu', 'bg', 'cs', 'sk'
      ],
      batchSize: 10,
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      simulationMode: this.getEnvVar('MULTILINGUAL_SIMULATION_MODE', 'false').toLowerCase() === 'true',
      enableDetailedLogging: this.getEnvVar('DEBUG', 'false').toLowerCase() === 'true'
    };
  }

  /**
   * Validate Azure credentials
   */
  private validateCredentials(credentials: AzureCredentials): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate OpenAI credentials
    if (!credentials.openAI.endpoint || !credentials.openAI.endpoint.startsWith('https://')) {
      errors.push('Invalid Azure OpenAI endpoint URL');
    }
    if (!credentials.openAI.key || credentials.openAI.key.length < 10) {
      errors.push('Invalid Azure OpenAI key');
    }
    if (!credentials.openAI.embeddingModel) {
      warnings.push('No embedding model specified, using default');
    }

    // Validate Translator credentials
    if (!credentials.translator.endpoint || !credentials.translator.endpoint.startsWith('https://')) {
      errors.push('Invalid Azure Translator endpoint URL');
    }
    if (!credentials.translator.key || credentials.translator.key.length < 10) {
      errors.push('Invalid Azure Translator key');
    }
    if (!credentials.translator.region) {
      errors.push('Azure Translator region is required');
    }

    // Validate Search credentials
    if (!credentials.search.endpoint || !credentials.search.endpoint.startsWith('https://')) {
      errors.push('Invalid Azure Search endpoint URL');
    }
    if (!credentials.search.key || credentials.search.key.length < 10) {
      errors.push('Invalid Azure Search key');
    }
    if (!credentials.search.indexName) {
      errors.push('Azure Search index name is required');
    }

    // Validate Form Recognizer credentials
    if (!credentials.formRecognizer.endpoint || !credentials.formRecognizer.endpoint.startsWith('https://')) {
      errors.push('Invalid Azure Form Recognizer endpoint URL');
    }
    if (!credentials.formRecognizer.key || credentials.formRecognizer.key.length < 10) {
      errors.push('Invalid Azure Form Recognizer key');
    }

    // Validate Storage credentials
    if (!credentials.storage.connectionString || !credentials.storage.connectionString.includes('DefaultEndpointsProtocol')) {
      errors.push('Invalid Azure Storage connection string');
    }
    if (!credentials.storage.containerName) {
      errors.push('Azure Storage container name is required');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate pipeline configuration
   */
  private validatePipelineConfig(config: MultilingualPipelineConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate target language
    if (!config.targetLanguage || config.targetLanguage.length !== 2) {
      errors.push('Target language must be a valid 2-letter language code');
    }

    // Validate chunk size
    if (config.chunkSize < 100 || config.chunkSize > 8000) {
      errors.push('Chunk size must be between 100 and 8000 characters');
    }

    // Validate token overlap
    if (config.tokenOverlap < 0 || config.tokenOverlap >= config.chunkSize) {
      errors.push('Token overlap must be between 0 and chunk size');
    }

    // Validate parallel jobs
    if (config.parallelJobs < 1 || config.parallelJobs > 20) {
      errors.push('Parallel jobs must be between 1 and 20');
    }

    // Validate language detection threshold
    if (config.languageDetectionThreshold < 0.1 || config.languageDetectionThreshold > 1.0) {
      errors.push('Language detection threshold must be between 0.1 and 1.0');
    }

    // Validate supported languages
    if (!config.supportedLanguages || config.supportedLanguages.length === 0) {
      errors.push('At least one supported language must be specified');
    }

    // Validate batch size
    if (config.batchSize < 1 || config.batchSize > 100) {
      errors.push('Batch size must be between 1 and 100');
    }

    // Validate retry settings
    if (config.maxRetries < 0 || config.maxRetries > 10) {
      errors.push('Max retries must be between 0 and 10');
    }

    if (config.retryDelayMs < 100 || config.retryDelayMs > 10000) {
      errors.push('Retry delay must be between 100ms and 10000ms');
    }

    // Validate timeout
    if (config.timeoutMs < 5000 || config.timeoutMs > 300000) {
      errors.push('Timeout must be between 5 seconds and 5 minutes');
    }

    // Warnings for performance
    if (config.parallelJobs > 10) {
      warnings.push('High parallel job count may impact performance');
    }

    if (config.chunkSize > 4000) {
      warnings.push('Large chunk size may impact embedding quality');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Get required environment variable or throw error
   */
  private getRequiredEnvVar(name: string, description: string): string {
    const value = this.environmentVariables[name];
    if (!value) {
      throw new MissingCredentialError(description, name);
    }
    return value;
  }

  /**
   * Get optional environment variable with default value
   */
  private getEnvVar(name: string, defaultValue: string = ''): string {
    return this.environmentVariables[name] || defaultValue;
  }

  /**
   * Build Azure Search endpoint URL from service name
   */
  private buildSearchEndpoint(): string {
    const serviceName = this.getRequiredEnvVar('AZURE_SEARCH_SERVICE', 'Azure Search service name');
    return `https://${serviceName}.search.windows.net`;
  }

  /**
   * Test connection to all Azure services
   */
  async testConnections(config: MultilingualConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // In a real implementation, we would test actual connections here
    // For now, we'll just validate that the configuration looks correct
    
    if (config.pipeline.simulationMode) {
      warnings.push('Running in simulation mode - Azure services will not be called');
    }

    // TODO: Implement actual connection tests
    // - Test Azure OpenAI endpoint
    // - Test Azure Translator endpoint  
    // - Test Azure Search endpoint
    // - Test Azure Form Recognizer endpoint
    // - Test Azure Storage connection

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Extract storage account name from connection string
   */
  private extractStorageAccountName(connectionString: string): string {
    const match = connectionString.match(/AccountName=([^;]+)/);
    if (!match) {
      throw new Error('Could not extract storage account name from connection string');
    }
    return match[1];
  }

  /**
   * Extract storage account key from connection string
   */
  private extractStorageKey(connectionString: string): string {
    const match = connectionString.match(/AccountKey=([^;]+)/);
    if (!match) {
      throw new Error('Could not extract storage account key from connection string');
    }
    return match[1];
  }

  /**
   * Extract search service name from endpoint URL
   */
  private extractSearchServiceName(endpoint: string): string {
    const match = endpoint.match(/https:\/\/([^.]+)\.search\.windows\.net/);
    if (!match) {
      throw new Error('Could not extract search service name from endpoint URL');
    }
    return match[1];
  }

  /**
   * Write pipeline configuration to file system for Python pipeline
   */
  async writePipelineConfigFile(outputPath: string = '../multilingual_rag_pipeline/multilingual_config.json'): Promise<void> {
    const pipelineConfig = await this.generatePipelineConfig();
    
    // Write to file system (this would need to be done via the backend API in a real implementation)
    // For now, we'll save it to the config provider
    await this.configProvider.saveConfig('pipeline-config-export', {
      path: outputPath,
      config: pipelineConfig,
      timestamp: new Date().toISOString()
    });
  }
}