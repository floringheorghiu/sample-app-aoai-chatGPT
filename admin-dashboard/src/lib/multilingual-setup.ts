import { LocalConfigProvider } from './config-manager';
import { MultilingualConfigurationManager } from './multilingual-configuration-manager';
import { MultilingualPipelineBridge } from './multilingual-pipeline-bridge';

/**
 * Setup and initialization utilities for the multilingual pipeline
 */
export class MultilingualSetup {
  private configProvider: LocalConfigProvider;
  private configManager: MultilingualConfigurationManager;
  private pipelineBridge: MultilingualPipelineBridge;

  constructor() {
    this.configProvider = new LocalConfigProvider();
    this.configManager = new MultilingualConfigurationManager(this.configProvider);
    this.pipelineBridge = new MultilingualPipelineBridge(this.configProvider);
  }

  /**
   * Initialize the complete multilingual pipeline setup
   */
  async initialize(): Promise<{
    success: boolean;
    message: string;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('🔧 Initializing multilingual pipeline setup...');

      // Step 1: Initialize default configurations
      console.log('📝 Setting up default configurations...');
      await this.configManager.initializeDefaultMultilingualConfig();

      // Step 2: Load and validate configuration
      console.log('🔍 Loading and validating configuration...');
      const config = await this.configManager.loadMultilingualConfig();
      const validation = this.configManager.validateConfiguration(config);
      
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      if (!validation.isValid) {
        return {
          success: false,
          message: 'Configuration validation failed',
          errors,
          warnings
        };
      }

      // Step 3: Initialize pipeline bridge
      console.log('🌉 Initializing pipeline bridge...');
      await this.pipelineBridge.initializePipeline();

      // Step 4: Validate pipeline setup
      console.log('✅ Validating pipeline setup...');
      const pipelineValidation = await this.pipelineBridge.validatePipelineSetup();
      
      errors.push(...pipelineValidation.errors);
      warnings.push(...pipelineValidation.warnings);

      if (!pipelineValidation.isValid) {
        return {
          success: false,
          message: 'Pipeline setup validation failed',
          errors,
          warnings
        };
      }

      // Step 5: Test connections (if not in simulation mode)
      if (!config.pipeline.simulationMode) {
        console.log('🔗 Testing Azure service connections...');
        const connectionTest = await this.configManager.testConnections(config);
        warnings.push(...connectionTest.warnings);
        
        if (!connectionTest.isValid) {
          errors.push(...connectionTest.errors);
          warnings.push('Connection tests failed - pipeline may not work correctly');
        }
      }

      const success = errors.length === 0;
      const message = success 
        ? '✅ Multilingual pipeline setup completed successfully!'
        : '❌ Multilingual pipeline setup completed with errors';

      console.log(message);
      if (warnings.length > 0) {
        console.log('⚠️  Warnings:', warnings);
      }
      if (errors.length > 0) {
        console.log('❌ Errors:', errors);
      }

      return {
        success,
        message,
        errors,
        warnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      return {
        success: false,
        message: '❌ Failed to initialize multilingual pipeline',
        errors,
        warnings
      };
    }
  }

  /**
   * Get current setup status
   */
  async getStatus(): Promise<{
    configured: boolean;
    pipelineReady: boolean;
    lastCheck: string;
    services: Record<string, boolean>;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const pipelineStatus = await this.pipelineBridge.getPipelineStatus();
      const validation = await this.pipelineBridge.validatePipelineSetup();

      return {
        configured: pipelineStatus.configured,
        pipelineReady: validation.isValid,
        lastCheck: new Date().toISOString(),
        services: pipelineStatus.services,
        errors: validation.errors,
        warnings: validation.warnings
      };
    } catch (error) {
      return {
        configured: false,
        pipelineReady: false,
        lastCheck: new Date().toISOString(),
        services: {
          translator: false,
          storage: false,
          search: false,
          openai: false,
          formRecognizer: false
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Quick health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.configured && status.pipelineReady && status.errors.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration manager for advanced operations
   */
  getConfigurationManager(): MultilingualConfigurationManager {
    return this.configManager;
  }

  /**
   * Get pipeline bridge for pipeline operations
   */
  getPipelineBridge(): MultilingualPipelineBridge {
    return this.pipelineBridge;
  }
}

// Export a singleton instance for easy use
export const multilingualSetup = new MultilingualSetup();