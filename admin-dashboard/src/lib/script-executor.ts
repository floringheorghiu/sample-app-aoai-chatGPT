import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

export interface ExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  scriptUsed: string;
  azureResourcesCreated?: string[];
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

export interface AMLConfig {
  chunk_size: number;
  token_overlap: number;
  keyvault_url?: string;
  document_intelligence_secret_name?: string;
  document_intelligence_endpoint?: string;
  embedding_key_secret_name?: string;
  embedding_endpoint?: string;
  index_name: string;
  search_service_name: string;
  search_key_secret_name?: string;
  use_layout: boolean;
}

export interface BatchConfig {
  baseConfig: ProcessingConfig;
  indexConfigs: Array<{
    key: string;
    index: string;
    subfolder?: string;
    formRecUseLayout?: boolean;
  }>;
}

export interface ExecutionProgress {
  stage: string;
  progress: number;
  message: string;
  timestamp: Date;
}

export type ProgressCallback = (progress: ExecutionProgress) => void;

export class ScriptExecutor {
  private pythonPath: string;
  private scriptsPath: string;
  private logsPath: string;
  private runningProcesses: Map<string, ChildProcess> = new Map();

  constructor(pythonPath?: string, scriptsPath: string = '../scripts', logsPath: string = './admin-dashboard/src/data/logs') {
    // Auto-detect Python path if not provided
    this.pythonPath = pythonPath || this.detectPythonPath();
    this.scriptsPath = scriptsPath;
    this.logsPath = logsPath;
  }

  private detectPythonPath(): string {
    // Try common Python executable names in order of preference
    const pythonCommands = ['python3', 'python', 'py'];
    
    // For now, return python3 as it's most commonly available
    // In a real implementation, we could check which one exists
    return 'python3';
  }

  // Direct integration with existing scripts and their Azure capabilities
  async executeDataPreparation(config: ProcessingConfig, progressCallback?: ProgressCallback): Promise<ExecutionResult> {
    const args = this.buildDataPrepArgs(config);
    return this.executeScript('data_preparation.py', args, progressCallback);
  }

  async executeAMLPipeline(config: AMLConfig, progressCallback?: ProgressCallback): Promise<ExecutionResult> {
    // Uses existing AML pipeline components
    const args = this.buildAMLArgs(config);
    return this.executeScript('pipeline.yml', args, progressCallback);
  }

  async executeBatchIndexing(config: BatchConfig, progressCallback?: ProgressCallback): Promise<ExecutionResult> {
    // Uses run_batch_create_index.py for multiple indexes
    const args = this.buildBatchArgs(config);
    return this.executeScript('run_batch_create_index.py', args, progressCallback);
  }

  async executePrepdocs(config: ProcessingConfig, progressCallback?: ProgressCallback): Promise<ExecutionResult> {
    const args = this.buildPrepdocsArgs(config);
    return this.executeScript('prepdocs.py', args, progressCallback);
  }

  private buildDataPrepArgs(config: ProcessingConfig): string[] {
    const args: string[] = [];
    
    // Generate config file path
    const configPath = path.join(this.logsPath, 'temp_config.json');
    args.push('--config', configPath);
    
    // Core parameters
    args.push('--njobs', config.njobs.toString());
    
    if (config.formRecognizerResource) {
      args.push('--form-rec-resource', config.formRecognizerResource);
    }
    
    if (config.formRecognizerKey) {
      args.push('--form-rec-key', config.formRecognizerKey);
    }
    
    if (config.embeddingEndpoint) {
      args.push('--embedding-model-endpoint', config.embeddingEndpoint);
    }
    
    if (config.searchAdminKey) {
      args.push('--search-admin-key', config.searchAdminKey);
    }
    
    if (config.form_recognizer_layout) {
      args.push('--form-rec-use-layout');
    }
    
    return args;
  }

  private buildAMLArgs(config: AMLConfig): string[] {
    const args: string[] = [];
    
    args.push('--chunk-size', config.chunk_size.toString());
    args.push('--token-overlap', config.token_overlap.toString());
    args.push('--index-name', config.index_name);
    args.push('--search-service-name', config.search_service_name);
    
    if (config.keyvault_url) {
      args.push('--keyvault-url', config.keyvault_url);
    }
    
    if (config.use_layout) {
      args.push('--use-layout');
    }
    
    return args;
  }

  private buildBatchArgs(config: BatchConfig): string[] {
    const args: string[] = [];
    
    // Use base config for common parameters
    args.push('--base-config', JSON.stringify(config.baseConfig));
    args.push('--index-configs', JSON.stringify(config.indexConfigs));
    
    return args;
  }

  private buildPrepdocsArgs(config: ProcessingConfig): string[] {
    const args: string[] = [];
    
    // Data path - handle both single path and array
    if (Array.isArray(config.data_path)) {
      config.data_path.forEach(path => {
        args.push('--files', path);
      });
    } else {
      args.push('--files', config.data_path);
    }
    
    // Core parameters
    args.push('--storageaccount', config.search_service_name || 'local');
    args.push('--container', config.containerName || 'documents');
    args.push('--searchservice', config.search_service_name || 'local');
    args.push('--index', config.index_name);
    
    if (config.searchAdminKey) {
      args.push('--searchkey', config.searchAdminKey);
    }
    
    // Chunking parameters
    args.push('--chunksize', config.chunk_size.toString());
    args.push('--overlap', config.token_overlap.toString());
    
    // Form Recognizer
    if (config.use_form_recognizer && config.formRecognizerResource) {
      args.push('--formrecognizerservice', config.formRecognizerResource);
      if (config.formRecognizerKey) {
        args.push('--formrecognizerkey', config.formRecognizerKey);
      }
    }
    
    // Language
    args.push('--language', config.language);
    
    return args;
  }

  private async executeScript(scriptName: string, args: string[], progressCallback?: ProgressCallback): Promise<ExecutionResult> {
    const startTime = Date.now();
    const jobId = `${scriptName}_${startTime}`;
    
    return new Promise((resolve) => {
      try {
        const scriptPath = path.join(this.scriptsPath, scriptName);
        let stdout = '';
        let stderr = '';
        
        progressCallback?.({
          stage: 'Starting',
          progress: 0,
          message: `Starting execution of ${scriptName}`,
          timestamp: new Date()
        });

        const process = spawn(this.pythonPath, [scriptPath, ...args], {
          cwd: this.scriptsPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        this.runningProcesses.set(jobId, process);

        process.stdout?.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          
          // Parse progress from output
          this.parseProgressFromOutput(output, progressCallback);
          
          // Log to file
          this.logToFile(jobId, 'stdout', output);
        });

        process.stderr?.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          
          // Log to file
          this.logToFile(jobId, 'stderr', output);
        });

        process.on('close', (code) => {
          const duration = Date.now() - startTime;
          this.runningProcesses.delete(jobId);
          
          progressCallback?.({
            stage: 'Completed',
            progress: 100,
            message: code === 0 ? 'Execution completed successfully' : 'Execution failed',
            timestamp: new Date()
          });

          resolve({
            success: code === 0,
            exitCode: code || 0,
            stdout,
            stderr,
            duration,
            scriptUsed: scriptName,
            azureResourcesCreated: this.parseAzureResourcesFromOutput(stdout)
          });
        });

        process.on('error', (error) => {
          const duration = Date.now() - startTime;
          this.runningProcesses.delete(jobId);
          
          progressCallback?.({
            stage: 'Error',
            progress: 0,
            message: `Execution error: ${error.message}`,
            timestamp: new Date()
          });

          resolve({
            success: false,
            exitCode: -1,
            stdout,
            stderr: stderr + error.message,
            duration,
            scriptUsed: scriptName
          });
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        
        resolve({
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: `Failed to start script: ${error}`,
          duration,
          scriptUsed: scriptName
        });
      }
    });
  }

  private parseProgressFromOutput(output: string, progressCallback?: ProgressCallback): void {
    if (!progressCallback) return;

    const lines = output.split('\n');
    for (const line of lines) {
      // Look for common progress indicators in script output
      if (line.includes('Processing file')) {
        progressCallback({
          stage: 'Processing',
          progress: 50,
          message: line.trim(),
          timestamp: new Date()
        });
      } else if (line.includes('Creating index')) {
        progressCallback({
          stage: 'Indexing',
          progress: 75,
          message: line.trim(),
          timestamp: new Date()
        });
      } else if (line.includes('Upload complete') || line.includes('Finished')) {
        progressCallback({
          stage: 'Finalizing',
          progress: 90,
          message: line.trim(),
          timestamp: new Date()
        });
      }
    }
  }

  private parseAzureResourcesFromOutput(output: string): string[] {
    const resources: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for Azure resource creation messages
      if (line.includes('Created search service:')) {
        const match = line.match(/Created search service: (.+)/);
        if (match) resources.push(`Search Service: ${match[1]}`);
      } else if (line.includes('Created storage account:')) {
        const match = line.match(/Created storage account: (.+)/);
        if (match) resources.push(`Storage Account: ${match[1]}`);
      } else if (line.includes('Created index:')) {
        const match = line.match(/Created index: (.+)/);
        if (match) resources.push(`Search Index: ${match[1]}`);
      }
    }
    
    return resources;
  }

  private async logToFile(jobId: string, stream: string, data: string): Promise<void> {
    try {
      // Ensure logs directory exists
      await fs.mkdir(this.logsPath, { recursive: true });
      
      const logFile = path.join(this.logsPath, `${jobId}_${stream}.log`);
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${data}`;
      
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Utility methods
  async killProcess(jobId: string): Promise<boolean> {
    const process = this.runningProcesses.get(jobId);
    if (process) {
      process.kill('SIGTERM');
      this.runningProcesses.delete(jobId);
      return true;
    }
    return false;
  }

  getRunningProcesses(): string[] {
    return Array.from(this.runningProcesses.keys());
  }

  async validatePythonEnvironment(): Promise<{ valid: boolean; message: string; version?: string }> {
    return new Promise((resolve) => {
      const process = spawn(this.pythonPath, ['--version']);
      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          const version = output.trim();
          resolve({
            valid: true,
            message: 'Python environment is valid',
            version
          });
        } else {
          resolve({
            valid: false,
            message: `Python not found or invalid: ${output}`
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          valid: false,
          message: `Failed to check Python: ${error.message}`
        });
      });
    });
  }

  async generateConfigFile(config: ProcessingConfig): Promise<string> {
    try {
      // Ensure logs directory exists
      await fs.mkdir(this.logsPath, { recursive: true });
      
      const configPath = path.join(this.logsPath, 'temp_config.json');
      const configData = JSON.stringify(config, null, 2);
      
      await fs.writeFile(configPath, configData);
      return configPath;
    } catch (error) {
      throw new Error(`Failed to generate config file: ${error}`);
    }
  }
}