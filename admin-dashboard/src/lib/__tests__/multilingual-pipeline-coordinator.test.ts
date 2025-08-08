import { MultilingualPipelineCoordinator, MultilingualProgress, PipelineResult } from '../multilingual-pipeline-coordinator';
import { LocalConfigProvider } from '../config-manager';

// Mock the config provider
jest.mock('../config-manager');
jest.mock('../multilingual-configuration-manager');

describe('MultilingualPipelineCoordinator', () => {
  let coordinator: MultilingualPipelineCoordinator;
  let mockConfigProvider: jest.Mocked<LocalConfigProvider>;

  beforeEach(() => {
    mockConfigProvider = new LocalConfigProvider() as jest.Mocked<LocalConfigProvider>;
    coordinator = new MultilingualPipelineCoordinator(mockConfigProvider);
  });

  describe('executeMultilingualPipeline', () => {
    it('should execute pipeline in simulation mode', async () => {
      const files = ['test1.pdf', 'test2.docx'];
      const progressUpdates: MultilingualProgress[] = [];
      
      const progressCallback = (progress: MultilingualProgress) => {
        progressUpdates.push(progress);
      };

      // Mock configuration loading to return simulation mode
      const mockConfig = {
        credentials: {
          openAI: { endpoint: 'test', key: 'test', embeddingModel: 'test' },
          translator: { endpoint: 'test', key: 'test', region: 'test' },
          search: { endpoint: 'test', key: 'test', indexName: 'test' },
          formRecognizer: { endpoint: 'test', key: 'test' },
          storage: { connectionString: 'test', containerName: 'test' }
        },
        pipeline: {
          targetLanguage: 'en',
          enableTranslation: true,
          languageDetectionThreshold: 0.8,
          chunkSize: 1024,
          tokenOverlap: 128,
          parallelJobs: 4,
          useFormRecognizer: true,
          formRecognizerLayout: true,
          supportedLanguages: ['en', 'ro'],
          batchSize: 10,
          maxRetries: 3,
          retryDelayMs: 1000,
          timeoutMs: 30000,
          simulationMode: true,
          enableDetailedLogging: false
        }
      };

      // Mock the configuration manager methods
      (coordinator as any).configManager = {
        loadMultilingualConfig: jest.fn().mockResolvedValue(mockConfig),
        validateConfiguration: jest.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] })
      };

      const result: PipelineResult = await coordinator.executeMultilingualPipeline(files, progressCallback);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(files.length);
      expect(result.chunksCreated).toBeGreaterThan(0);
      expect(result.documentsIndexed).toBe(files.length);
      expect(result.languagesDetected).toContain('ro');
      expect(result.languagesDetected).toContain('en');
      expect(result.errors).toHaveLength(0);

      // Verify progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('language_detection');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('completed');
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });

    it('should handle job cancellation', async () => {
      const files = ['test1.pdf'];
      const progressUpdates: MultilingualProgress[] = [];
      
      const progressCallback = (progress: MultilingualProgress) => {
        progressUpdates.push(progress);
        // Cancel the job after first progress update
        if (progressUpdates.length === 1) {
          coordinator.cancelPipeline('test_job');
        }
      };

      // Mock configuration
      const mockConfig = {
        credentials: {
          openAI: { endpoint: 'test', key: 'test', embeddingModel: 'test' },
          translator: { endpoint: 'test', key: 'test', region: 'test' },
          search: { endpoint: 'test', key: 'test', indexName: 'test' },
          formRecognizer: { endpoint: 'test', key: 'test' },
          storage: { connectionString: 'test', containerName: 'test' }
        },
        pipeline: {
          targetLanguage: 'en',
          enableTranslation: true,
          languageDetectionThreshold: 0.8,
          chunkSize: 1024,
          tokenOverlap: 128,
          parallelJobs: 4,
          useFormRecognizer: true,
          formRecognizerLayout: true,
          supportedLanguages: ['en', 'ro'],
          batchSize: 10,
          maxRetries: 3,
          retryDelayMs: 1000,
          timeoutMs: 30000,
          simulationMode: false, // Use real pipeline to test cancellation
          enableDetailedLogging: false
        }
      };

      (coordinator as any).configManager = {
        loadMultilingualConfig: jest.fn().mockResolvedValue(mockConfig),
        validateConfiguration: jest.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] })
      };

      // Set up the job as active before starting
      (coordinator as any).activeJobs.set('test_job', true);

      try {
        await coordinator.executeMultilingualPipeline(files, progressCallback);
        fail('Expected pipeline to throw cancellation error');
      } catch (error) {
        expect(error.message).toContain('cancelled');
      }
    });
  });

  describe('validatePipelineReadiness', () => {
    it('should validate pipeline configuration', async () => {
      // Mock successful validation
      (coordinator as any).configManager = {
        loadMultilingualConfig: jest.fn().mockResolvedValue({}),
        validateConfiguration: jest.fn().mockReturnValue({
          isValid: true,
          errors: [],
          warnings: ['Test warning']
        })
      };

      const result = await coordinator.validatePipelineReadiness();

      expect(result.isReady).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain('Test warning');
    });

    it('should handle validation errors', async () => {
      // Mock validation failure
      (coordinator as any).configManager = {
        loadMultilingualConfig: jest.fn().mockResolvedValue({}),
        validateConfiguration: jest.fn().mockReturnValue({
          isValid: false,
          errors: ['Missing API key'],
          warnings: []
        })
      };

      const result = await coordinator.validatePipelineReadiness();

      expect(result.isReady).toBe(false);
      expect(result.errors).toContain('Missing API key');
    });
  });

  describe('concurrency management', () => {
    it('should manage parallel processing limits', async () => {
      const coordinator = new MultilingualPipelineCoordinator(mockConfigProvider);
      const concurrencyManager = (coordinator as any).concurrencyManager;

      // Test acquiring and releasing slots
      await concurrencyManager.acquireSlot('language_detection');
      expect(concurrencyManager.getActiveOperations()['language_detection']).toBe(1);

      concurrencyManager.releaseSlot('language_detection');
      expect(concurrencyManager.getActiveOperations()['language_detection']).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle recoverable errors with retry', async () => {
      const coordinator = new MultilingualPipelineCoordinator(mockConfigProvider);
      
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary network error');
        }
        return 'success';
      };

      const result = await (coordinator as any).handleErrorWithRecovery(
        operation,
        'translation',
        'test_stage',
        3,
        100
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should fail after max retries', async () => {
      const coordinator = new MultilingualPipelineCoordinator(mockConfigProvider);
      
      const operation = async () => {
        throw new Error('Persistent error');
      };

      try {
        await (coordinator as any).handleErrorWithRecovery(
          operation,
          'translation',
          'test_stage',
          2,
          100
        );
        fail('Expected operation to fail after retries');
      } catch (error) {
        expect(error.message).toContain('Persistent error');
      }
    });
  });
});