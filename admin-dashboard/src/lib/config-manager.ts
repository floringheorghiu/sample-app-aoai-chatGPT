import { promises as fs } from 'fs';
import path from 'path';

export interface SystemPromptConfig {
  prompt: string;
  lastModified: string;
}

export interface OnboardingTopic {
  label: string;
  warmup_prompt: string;
  quick_questions: string[];
}

export interface OnboardingConfig {
  [persona: string]: {
    topics: OnboardingTopic[];
  };
}

export interface AppConfig {
  pythonPath: string;
  scriptsPath: string;
  uploadsPath: string;
  configPath: string;
  logsPath: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  mockMode: boolean;
}

export interface ProcessingConfig {
  // Core configuration matching data_preparation.py parameters
  data_path: string | string[];
  location: string;
  subscription_id?: string;
  resource_group?: string;
  search_service_name?: string;
  index_name: string;
  chunk_size: number;
  token_overlap: number;
  semantic_config_name: string;
  language: string;
  vector_config_name?: string;
  url_prefix?: string;
  
  // Form Recognizer configuration
  use_form_recognizer: boolean;
  form_recognizer_layout: boolean;
  formRecognizerResource?: string;
  formRecognizerKey?: string;
  
  // Azure OpenAI configuration
  embeddingEndpoint?: string;
  embeddingKey?: string;
  azureOpenAIEndpoint?: string;
  azureOpenAIKey?: string;
  
  // Processing configuration
  njobs: number;
  searchAdminKey?: string;
  
  // Storage configuration
  storageType: 'local' | 'blob';
  blobConnectionString?: string;
  containerName?: string;
}

export interface ConfigProvider {
  loadConfig<T>(configName: string): Promise<T>;
  saveConfig<T>(configName: string, data: T): Promise<boolean>;
  configExists(configName: string): Promise<boolean>;
}

export class LocalConfigProvider implements ConfigProvider {
  private basePath: string;

  constructor(basePath: string = './admin-dashboard/src/data/config') {
    this.basePath = basePath;
  }

  private getConfigPath(configName: string): string {
    return path.join(this.basePath, `${configName}.json`);
  }

  async configExists(configName: string): Promise<boolean> {
    try {
      const configPath = this.getConfigPath(configName);
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  async loadConfig<T>(configName: string): Promise<T> {
    try {
      const configPath = this.getConfigPath(configName);
      const configData = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configData) as T;
    } catch (error) {
      throw new Error(`Failed to load config ${configName}: ${error}`);
    }
  }

  async saveConfig<T>(configName: string, data: T): Promise<boolean> {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.basePath, { recursive: true });
      
      const configPath = this.getConfigPath(configName);
      const configData = JSON.stringify(data, null, 2);
      await fs.writeFile(configPath, configData, 'utf-8');
      return true;
    } catch (error) {
      console.error(`Failed to save config ${configName}:`, error);
      return false;
    }
  }
}

export class AzureKeyVaultConfigProvider implements ConfigProvider {
  private keyVaultUrl: string;

  constructor(keyVaultUrl: string) {
    this.keyVaultUrl = keyVaultUrl;
  }

  async configExists(configName: string): Promise<boolean> {
    // Placeholder implementation for future Azure integration
    throw new Error('Azure KeyVault not yet implemented. Use LocalConfigProvider for development.');
  }

  async loadConfig<T>(configName: string): Promise<T> {
    // Placeholder implementation for future Azure integration
    throw new Error('Azure KeyVault not yet implemented. Use LocalConfigProvider for development.');
  }

  async saveConfig<T>(configName: string, data: T): Promise<boolean> {
    // Placeholder implementation for future Azure integration
    throw new Error('Azure KeyVault not yet implemented. Use LocalConfigProvider for development.');
  }
}

export class ConfigManager {
  private configProvider: ConfigProvider;

  constructor(configProvider: ConfigProvider) {
    this.configProvider = configProvider;
  }

  // System Prompt Configuration
  async getSystemPromptConfig(): Promise<SystemPromptConfig> {
    try {
      return await this.configProvider.loadConfig<SystemPromptConfig>('system-prompt');
    } catch {
      // Return default if config doesn't exist
      return this.getDefaultSystemPromptConfig();
    }
  }

  async saveSystemPromptConfig(config: SystemPromptConfig): Promise<boolean> {
    config.lastModified = new Date().toISOString();
    return await this.configProvider.saveConfig('system-prompt', config);
  }

  private getDefaultSystemPromptConfig(): SystemPromptConfig {
    return {
      prompt: "You are a helpful AI assistant. Please provide accurate and helpful responses to user questions.",
      lastModified: new Date().toISOString()
    };
  }

  // Onboarding Configuration
  async getOnboardingConfig(): Promise<OnboardingConfig> {
    try {
      return await this.configProvider.loadConfig<OnboardingConfig>('onboarding-config');
    } catch {
      // Return default if config doesn't exist
      return this.getDefaultOnboardingConfig();
    }
  }

  async saveOnboardingConfig(config: OnboardingConfig): Promise<boolean> {
    // Validate configuration before saving
    if (!this.validateOnboardingConfig(config)) {
      throw new Error('Invalid onboarding configuration');
    }
    return await this.configProvider.saveConfig('onboarding-config', config);
  }

  private getDefaultOnboardingConfig(): OnboardingConfig {
    return {
      parent: {
        topics: [
          {
            label: "Child Safety Online",
            warmup_prompt: "Let's discuss keeping children safe online.",
            quick_questions: [
              "What are the main online safety risks for children?",
              "How can I set up parental controls?",
              "What should I do if my child encounters inappropriate content?"
            ]
          }
        ]
      },
      teacher: {
        topics: [
          {
            label: "Educational Technology",
            warmup_prompt: "Let's explore educational technology tools.",
            quick_questions: [
              "What are the best educational apps for my classroom?",
              "How can I integrate technology into my lessons?",
              "What are effective online assessment tools?"
            ]
          }
        ]
      },
      child: {
        topics: [
          {
            label: "Learning and Fun",
            warmup_prompt: "Let's learn something fun together!",
            quick_questions: [
              "Can you help me with my homework?",
              "What are some fun educational games?",
              "How can I learn new skills online safely?"
            ]
          }
        ]
      }
    };
  }

  private validateOnboardingConfig(config: OnboardingConfig): boolean {
    try {
      for (const [persona, personaConfig] of Object.entries(config)) {
        if (!personaConfig.topics || !Array.isArray(personaConfig.topics)) {
          return false;
        }
        
        for (const topic of personaConfig.topics) {
          if (!topic.label || !topic.warmup_prompt || !Array.isArray(topic.quick_questions)) {
            return false;
          }
          
          if (topic.quick_questions.length === 0) {
            return false;
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  // App Configuration
  async getAppConfig(): Promise<AppConfig> {
    try {
      return await this.configProvider.loadConfig<AppConfig>('app-config');
    } catch {
      // Return default if config doesn't exist
      return this.getDefaultAppConfig();
    }
  }

  async saveAppConfig(config: AppConfig): Promise<boolean> {
    return await this.configProvider.saveConfig('app-config', config);
  }

  private getDefaultAppConfig(): AppConfig {
    return {
      pythonPath: 'python',
      scriptsPath: '../scripts',
      uploadsPath: 'uploads',
      configPath: 'config',
      logsPath: 'logs',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedFileTypes: ['.pdf', '.docx', '.doc', '.txt'],
      mockMode: true
    };
  }

  // Script Configuration Generation
  async generateScriptConfig(processingConfig: ProcessingConfig): Promise<any> {
    // Convert admin UI config to script-compatible format
    const scriptConfig = {
      data_path: processingConfig.data_path,
      location: processingConfig.location,
      subscription_id: processingConfig.subscription_id,
      resource_group: processingConfig.resource_group,
      search_service_name: processingConfig.search_service_name,
      index_name: processingConfig.index_name,
      chunk_size: processingConfig.chunk_size,
      token_overlap: processingConfig.token_overlap,
      semantic_config_name: processingConfig.semantic_config_name,
      language: processingConfig.language,
      vector_config_name: processingConfig.vector_config_name,
      url_prefix: processingConfig.url_prefix,
      use_form_recognizer: processingConfig.use_form_recognizer,
      form_recognizer_layout: processingConfig.form_recognizer_layout,
      njobs: processingConfig.njobs
    };

    // Save script config for compatibility
    await this.configProvider.saveConfig('script-config', scriptConfig);
    return scriptConfig;
  }

  // Initialize default configurations
  async initializeDefaultConfigs(): Promise<void> {
    const configs = [
      { name: 'system-prompt', data: this.getDefaultSystemPromptConfig() },
      { name: 'onboarding-config', data: this.getDefaultOnboardingConfig() },
      { name: 'app-config', data: this.getDefaultAppConfig() }
    ];

    for (const config of configs) {
      const exists = await this.configProvider.configExists(config.name);
      if (!exists) {
        await this.configProvider.saveConfig(config.name, config.data);
      }
    }
  }
}