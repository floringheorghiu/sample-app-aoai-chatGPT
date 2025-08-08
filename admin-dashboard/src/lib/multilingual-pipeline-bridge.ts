import { MultilingualConfigurationManager, MultilingualConfig } from './multilingual-configuration-manager';
import { ConfigProvider } from './config-manager';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Bridge service that connects the admin dashboard with the existing Python multilingual pipeline
 */
export class MultilingualPipelineBridge {
  private configManager: MultilingualConfigurationManager;
  private pipelineScriptPath: string;

  constructor(configProvider: ConfigProvider) {
    this.configManager = new MultilingualConfigurationManager(configProvider);
    this.pipelineScriptPath = path.resolve('../multilingual_rag_pipeline/multilingual_ingestion_pipeline.py');
  }

  /**
   * Initialize the multilingual pipeline with current configuration
   */
  async initializePipeline(): Promise<void> {
    // Load and validate configuration
    const config = await this.configManager.loadMultilingualConfig();
    
    // Generate pipeline-compatible configuration
    const pipelineConfig = await this.configManager.generatePipelineConfig();
    
    // Write configuration file for Python pipeline
    const configPath = path.resolve('../multilingual_rag_pipeline/multilingual_config.json');
    await fs.writeFile(configPath, JSON.stringify(pipelineConfig, null, 2), 'utf-8');
    
    console.log('Multilingual pipeline configuration initialized');
  }

  /**
   * Validate that the pipeline is properly configured and ready to use
   */
  async validatePipelineSetup(): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if configuration is valid
      const config = await this.configManager.loadMultilingualConfig();
      const validation = this.configManager.validateConfiguration(config);
      
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      // Check if Python pipeline script exists
      try {
        await fs.access(this.pipelineScriptPath);
      } catch {
        errors.push(`Python pipeline script not found at: ${this.pipelineScriptPath}`);
      }

      // Check if multilingual_rag_pipeline directory exists
      const pipelineDir = path.resolve('../multilingual_rag_pipeline');
      try {
        await fs.access(pipelineDir);
      } catch {
        errors.push(`Multilingual pipeline directory not found at: ${pipelineDir}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`Configuration validation failed: ${error}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Get the current pipeline configuration status
   */
  async getPipelineStatus(): Promise<{
    configured: boolean;
    configPath: string;
    lastUpdated?: string;
    services: {
      translator: boolean;
      storage: boolean;
      search: boolean;
      openai: boolean;
      formRecognizer: boolean;
    };
  }> {
    const configPath = path.resolve('../multilingual_rag_pipeline/multilingual_config.json');
    
    try {
      const stats = await fs.stat(configPath);
      const config = await this.configManager.loadMultilingualConfig();
      
      return {
        configured: true,
        configPath,
        lastUpdated: stats.mtime.toISOString(),
        services: {
          translator: !!config.credentials.translator.key,
          storage: !!config.credentials.storage.connectionString,
          search: !!config.credentials.search.key,
          openai: !!config.credentials.openAI.key,
          formRecognizer: !!config.credentials.formRecognizer.key
        }
      };
    } catch {
      return {
        configured: false,
        configPath,
        services: {
          translator: false,
          storage: false,
          search: false,
          openai: false,
          formRecognizer: false
        }
      };
    }
  }

  /**
   * Execute the multilingual pipeline with given file paths
   * This would typically be called from the admin dashboard API
   */
  async executePipeline(filePaths: string[]): Promise<{
    success: boolean;
    processedFiles: number;
    totalChunks: number;
    error?: string;
  }> {
    try {
      // Ensure pipeline is initialized
      await this.initializePipeline();

      // In a real implementation, this would execute the Python pipeline
      // For now, we'll return a mock result
      console.log(`Would execute multilingual pipeline with files: ${filePaths.join(', ')}`);
      
      return {
        success: true,
        processedFiles: filePaths.length,
        totalChunks: filePaths.length * 10, // Mock: assume 10 chunks per file
      };
    } catch (error) {
      return {
        success: false,
        processedFiles: 0,
        totalChunks: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get configuration manager instance for direct access
   */
  getConfigurationManager(): MultilingualConfigurationManager {
    return this.configManager;
  }

  /**
   * Update pipeline configuration and reinitialize
   */
  async updateConfiguration(updates: Partial<MultilingualConfig>): Promise<void> {
    // This would update the configuration and reinitialize the pipeline
    // Implementation depends on specific requirements
    throw new Error('Configuration updates not yet implemented');
  }
}