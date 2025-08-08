import { DocumentProcessingService, ProcessingConfig, ProcessedDocument } from '../document-processing-service';
import { MultilingualConfig } from '../multilingual-configuration-manager';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    access: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    rm: jest.fn()
  }
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock fetch for Azure services
global.fetch = jest.fn();

describe('DocumentProcessingService', () => {
  let service: DocumentProcessingService;
  let mockConfig: MultilingualConfig;
  let mockProcessingConfig: ProcessingConfig;

  beforeEach(() => {
    // Setup mock configuration
    mockConfig = {
      credentials: {
        openAI: {
          endpoint: 'https://test-openai.openai.azure.com/',
          key: 'test-openai-key',
          embeddingModel: 'text-embedding-ada-002'
        },
        translator: {
          endpoint: 'https://api.cognitive.microsofttranslator.com/',
          key: 'test-translator-key',
          region: 'eastus'
        },
        search: {
          endpoint: 'https://test-search.search.windows.net',
          key: 'test-search-key',
          indexName: 'test-index'
        },
        formRecognizer: {
          endpoint: 'https://test-form-recognizer.cognitiveservices.azure.com/',
          key: 'test-form-recognizer-key'
        },
        storage: {
          connectionString: 'DefaultEndpointsProtocol=https;AccountName=teststorage;AccountKey=testkey;EndpointSuffix=core.windows.net',
          containerName: 'test-container'
        }
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
        supportedLanguages: ['ro', 'en', 'fr', 'de', 'es'],
        batchSize: 10,
        maxRetries: 3,
        retryDelayMs: 1000,
        timeoutMs: 30000,
        simulationMode: true, // Enable simulation for tests
        enableDetailedLogging: false
      }
    };

    mockProcessingConfig = {
      chunkSize: 1024,
      tokenOverlap: 128,
      minChunkSize: 50,
      useFormRecognizer: true,
      formRecognizerLayout: true,
      addEmbeddings: false,
      parallelJobs: 4,
      supportedExtensions: ['pdf', 'docx', 'txt', 'md'],
      urlPrefix: 'https://example.com/docs/'
    };

    service = new DocumentProcessingService(
      mockConfig,
      mockProcessingConfig,
      'python',
      '../scripts'
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(service).toBeInstanceOf(DocumentProcessingService);
    });

    it('should use default python path and scripts path when not provided', () => {
      const defaultService = new DocumentProcessingService(mockConfig, mockProcessingConfig);
      expect(defaultService).toBeInstanceOf(DocumentProcessingService);
    });
  });

  describe('processDocuments', () => {
    beforeEach(() => {
      // Mock file system operations
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1024 });
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    });

    it('should process multiple documents successfully', async () => {
      const filePaths = ['test1.pdf', 'test2.docx', 'test3.txt'];
      
      // Mock Python script execution - need to mock both extraction and chunking calls
      const mockSpawn = require('child_process').spawn;
      let callCount = 0;
      mockSpawn.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          // Content extraction call
          return {
            stdout: {
              on: (event: string, callback: Function) => {
                if (event === 'data') {
                  callback(JSON.stringify({
                    content: 'Test document content',
                    title: 'Test Document',
                    imageMapping: {}
                  }));
                }
              }
            },
            stderr: { on: jest.fn() },
            on: (event: string, callback: Function) => {
              if (event === 'close') {
                callback(0); // Success exit code
              }
            }
          };
        } else {
          // Chunking call
          return {
            stdout: {
              on: (event: string, callback: Function) => {
                if (event === 'data') {
                  callback(JSON.stringify({
                    chunks: [{
                      content: 'Test chunk content',
                      title: 'Test Document',
                      url: null,
                      contentVector: null,
                      tokenCount: 4
                    }]
                  }));
                }
              }
            },
            stderr: { on: jest.fn() },
            on: (event: string, callback: Function) => {
              if (event === 'close') {
                callback(0);
              }
            }
          };
        }
      });

      const progressCallback = jest.fn();
      const result = await service.processDocuments(filePaths, progressCallback);

      expect(result.success).toBe(true);
      expect(result.totalFiles).toBe(3);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle unsupported file formats', async () => {
      const filePaths = ['test.xyz', 'test.abc'];
      
      const result = await service.processDocuments(filePaths);

      expect(result.success).toBe(false);
      expect(result.unsupportedFiles).toBe(2);
      expect(result.documentsProcessed).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('unsupported_format');
    });

    it('should handle file access errors gracefully', async () => {
      const filePaths = ['nonexistent.pdf'];
      
      // Mock file access failure
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.processDocuments(filePaths);

      expect(result.success).toBe(false);
      expect(result.documentsProcessed).toHaveLength(0);
    });

    it('should process files in batches', async () => {
      const filePaths = Array.from({ length: 15 }, (_, i) => `test${i}.pdf`);
      
      // Mock successful processing
      const mockSpawn = require('child_process').spawn;
      mockSpawn.mockImplementation(() => ({
        stdout: {
          on: (event: string, callback: Function) => {
            if (event === 'data') {
              callback(JSON.stringify({
                content: 'Test content',
                title: 'Test',
                imageMapping: {}
              }));
            }
          }
        },
        stderr: { on: jest.fn() },
        on: (event: string, callback: Function) => {
          if (event === 'close') callback(0);
        }
      }));

      const progressCallback = jest.fn();
      await service.processDocuments(filePaths, progressCallback);

      // Should have called progress callback multiple times for batches
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'processing',
          message: expect.stringContaining('batch')
        })
      );
    });
  });

  describe('processDocument', () => {
    beforeEach(() => {
      (fs.stat as jest.Mock).mockResolvedValue({ size: 2048 });
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    });

    it('should process a single document with language detection and translation', async () => {
      const filePath = 'test.pdf';
      
      // Mock content extraction
      const mockSpawn = require('child_process').spawn;
      mockSpawn.mockImplementationOnce(() => ({
        stdout: {
          on: (event: string, callback: Function) => {
            if (event === 'data') {
              callback(JSON.stringify({
                content: 'Acesta este un document de test în română.',
                title: 'Document Test',
                imageMapping: { 'img1': 'base64data' }
              }));
            }
          }
        },
        stderr: { on: jest.fn() },
        on: (event: string, callback: Function) => {
          if (event === 'close') callback(0);
        }
      }));

      // Mock chunking
      mockSpawn.mockImplementationOnce(() => ({
        stdout: {
          on: (event: string, callback: Function) => {
            if (event === 'data') {
              callback(JSON.stringify({
                chunks: [
                  {
                    content: 'This is a test document in English.',
                    title: 'Document Test',
                    url: null,
                    contentVector: null,
                    tokenCount: 8
                  }
                ]
              }));
            }
          }
        },
        stderr: { on: jest.fn() },
        on: (event: string, callback: Function) => {
          if (event === 'close') callback(0);
        }
      }));

      const result = await service.processDocument(filePath);

      expect(result.filePath).toBe(filePath);
      expect(result.originalLanguage).toBe('ro'); // Simulation mode returns 'ro'
      expect(result.translatedContent).toBeDefined();
      expect(result.chunks).toHaveLength(1);
      expect(result.metadata.originalLanguage).toBe('ro');
      expect(result.metadata.translatedLanguage).toBe('en');
    });

    it('should skip translation for English content', async () => {
      // Disable simulation mode to test actual language detection logic
      mockConfig.pipeline.simulationMode = false;
      service = new DocumentProcessingService(mockConfig, mockProcessingConfig);

      const filePath = 'test.txt';
      
      // Mock content extraction and chunking
      const mockSpawn = require('child_process').spawn;
      let callCount = 0;
      mockSpawn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Content extraction
          return {
            stdout: {
              on: (event: string, callback: Function) => {
                if (event === 'data') {
                  callback(JSON.stringify({
                    content: 'This is an English document.',
                    title: 'English Document',
                    imageMapping: {}
                  }));
                }
              }
            },
            stderr: { on: jest.fn() },
            on: (event: string, callback: Function) => {
              if (event === 'close') callback(0);
            }
          };
        } else {
          // Chunking
          return {
            stdout: {
              on: (event: string, callback: Function) => {
                if (event === 'data') {
                  callback(JSON.stringify({
                    chunks: [{
                      content: 'This is an English document.',
                      title: 'English Document',
                      url: null,
                      contentVector: null,
                      tokenCount: 5
                    }]
                  }));
                }
              }
            },
            stderr: { on: jest.fn() },
            on: (event: string, callback: Function) => {
              if (event === 'close') callback(0);
            }
          };
        }
      });

      // Mock language detection returning English
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ language: 'en', score: 0.98 }])
      });

      const result = await service.processDocument(filePath);

      expect(result.originalLanguage).toBe('en');
      expect(result.translatedContent).toBeUndefined();
      expect(result.metadata.translatedLanguage).toBeUndefined();
    });

    it('should handle content extraction errors', async () => {
      const filePath = 'error.pdf';
      
      // Mock Python script failure
      const mockSpawn = require('child_process').spawn;
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: {
          on: (event: string, callback: Function) => {
            if (event === 'data') {
              callback('Python error occurred');
            }
          }
        },
        on: (event: string, callback: Function) => {
          if (event === 'close') {
            callback(1); // Error exit code
          }
        }
      }));

      await expect(service.processDocument(filePath)).rejects.toThrow();
    });

    it('should handle language detection failures gracefully', async () => {
      // Disable simulation mode to test actual language detection
      mockConfig.pipeline.simulationMode = false;
      service = new DocumentProcessingService(mockConfig, mockProcessingConfig);

      const filePath = 'test.pdf';
      
      // Mock content extraction and chunking success
      const mockSpawn = require('child_process').spawn;
      let callCount = 0;
      mockSpawn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Content extraction
          return {
            stdout: {
              on: (event: string, callback: Function) => {
                if (event === 'data') {
                  callback(JSON.stringify({
                    content: 'Test content',
                    title: 'Test',
                    imageMapping: {}
                  }));
                }
              }
            },
            stderr: { on: jest.fn() },
            on: (event: string, callback: Function) => {
              if (event === 'close') callback(0);
            }
          };
        } else {
          // Chunking
          return {
            stdout: {
              on: (event: string, callback: Function) => {
                if (event === 'data') {
                  callback(JSON.stringify({
                    chunks: [{
                      content: 'Test content',
                      title: 'Test',
                      url: null,
                      contentVector: null,
                      tokenCount: 2
                    }]
                  }));
                }
              }
            },
            stderr: { on: jest.fn() },
            on: (event: string, callback: Function) => {
              if (event === 'close') callback(0);
            }
          };
        }
      });

      // Mock language detection failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Should not throw, should fallback to English
      const result = await service.processDocument(filePath);
      expect(result.originalLanguage).toBe('en'); // Fallback language
    });
  });

  describe('processDocumentsFromBlobStorage', () => {
    beforeEach(() => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.rm as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    });

    it('should process documents from blob storage in simulation mode', async () => {
      const blobPaths = ['blob://container/test1.pdf', 'blob://container/test2.docx'];
      
      // Mock successful processing after download
      const mockSpawn = require('child_process').spawn;
      let callCount = 0;
      mockSpawn.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          // Content extraction
          return {
            stdout: {
              on: (event: string, callback: Function) => {
                if (event === 'data') {
                  callback(JSON.stringify({
                    content: 'Mock blob content',
                    title: 'Blob Document',
                    imageMapping: {}
                  }));
                }
              }
            },
            stderr: { on: jest.fn() },
            on: (event: string, callback: Function) => {
              if (event === 'close') callback(0);
            }
          };
        } else {
          // Chunking
          return {
            stdout: {
              on: (event: string, callback: Function) => {
                if (event === 'data') {
                  callback(JSON.stringify({
                    chunks: [{
                      content: 'Mock blob content',
                      title: 'Blob Document',
                      url: null,
                      contentVector: null,
                      tokenCount: 3
                    }]
                  }));
                }
              }
            },
            stderr: { on: jest.fn() },
            on: (event: string, callback: Function) => {
              if (event === 'close') callback(0);
            }
          };
        }
      });

      const progressCallback = jest.fn();
      const result = await service.processDocumentsFromBlobStorage(blobPaths, progressCallback);

      expect(result.success).toBe(true);
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'blob_download',
          message: expect.stringContaining('Downloading')
        })
      );
    });

    it('should handle blob storage errors when not in simulation mode', async () => {
      // Disable simulation mode
      mockConfig.pipeline.simulationMode = false;
      service = new DocumentProcessingService(mockConfig, mockProcessingConfig);

      const blobPaths = ['blob://container/test.pdf'];

      await expect(service.processDocumentsFromBlobStorage(blobPaths)).rejects.toThrow(
        'Azure Blob Storage download not yet implemented'
      );
    });
  });

  describe('language detection', () => {
    it('should return mock result in simulation mode', async () => {
      // Access private method for testing
      const detectLanguage = (service as any).detectLanguage.bind(service);
      
      const result = await detectLanguage('Test content');
      
      expect(result.language).toBe('ro');
      expect(result.confidence).toBe(0.95);
      expect(result.isSupported).toBe(true);
    });

    it('should call Azure Translator API when not in simulation mode', async () => {
      mockConfig.pipeline.simulationMode = false;
      service = new DocumentProcessingService(mockConfig, mockProcessingConfig);
      
      // Clear previous mock calls
      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ language: 'fr', score: 0.92 }])
      });

      const detectLanguage = (service as any).detectLanguage.bind(service);
      const result = await detectLanguage('Bonjour le monde');

      expect(result.language).toBe('fr');
      expect(result.confidence).toBe(0.92);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('detect'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': 'test-translator-key'
          })
        })
      );
    });
  });

  describe('translation', () => {
    it('should return mock result in simulation mode', async () => {
      const translateContent = (service as any).translateContent.bind(service);
      
      const result = await translateContent('Salut lume', 'ro', 'en');
      
      expect(result.translatedText).toContain('[SIMULATED TRANSLATION]');
      expect(result.originalLanguage).toBe('ro');
      expect(result.targetLanguage).toBe('en');
    });

    it('should call Azure Translator API when not in simulation mode', async () => {
      mockConfig.pipeline.simulationMode = false;
      service = new DocumentProcessingService(mockConfig, mockProcessingConfig);
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ translations: [{ text: 'Hello world' }] }])
      });

      const translateContent = (service as any).translateContent.bind(service);
      const result = await translateContent('Salut lume', 'ro', 'en');

      expect(result.translatedText).toBe('Hello world');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('translate'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': 'test-translator-key'
          })
        })
      );
    });

    it('should handle large content by splitting into chunks', async () => {
      mockConfig.pipeline.simulationMode = false;
      service = new DocumentProcessingService(mockConfig, mockProcessingConfig);
      
      // Create content that will definitely be split (larger than 5000 chars)
      const largeContent = 'A'.repeat(10000) + '. ' + 'B'.repeat(1000) + '.'; // Large content with sentence breaks
      
      // Clear previous mock calls
      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ translations: [{ text: 'Translated chunk' }] }])
      });

      const translateContent = (service as any).translateContent.bind(service);
      const result = await translateContent(largeContent, 'ro', 'en');

      expect(result.translatedText).toContain('Translated chunk');
      expect(global.fetch).toHaveBeenCalledTimes(2); // Should be split into multiple calls
    });
  });

  describe('utility methods', () => {
    it('should validate and filter supported files correctly', async () => {
      const filePaths = ['test.pdf', 'test.xyz', 'test.docx', 'nonexistent.txt'];
      
      // Mock file access - some files exist, some don't
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // test.pdf exists
        .mockRejectedValueOnce(new Error('Not found')) // test.xyz doesn't exist
        .mockResolvedValueOnce(undefined) // test.docx exists
        .mockRejectedValueOnce(new Error('Not found')); // nonexistent.txt doesn't exist

      const validateAndFilterFiles = (service as any).validateAndFilterFiles.bind(service);
      const validFiles = await validateAndFilterFiles(filePaths);

      expect(validFiles).toEqual(['test.pdf', 'test.docx']);
    });

    it('should create batches correctly', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const createBatches = (service as any).createBatches.bind(service);
      
      const batches = createBatches(items, 3);
      
      expect(batches).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10]
      ]);
    });

    it('should split text into chunks for translation', () => {
      const longText = 'First sentence. Second sentence! Third sentence? Fourth sentence.';
      const splitTextIntoChunks = (service as any).splitTextIntoChunks.bind(service);
      
      const chunks = splitTextIntoChunks(longText, 30);
      
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every(chunk => chunk.length <= 30)).toBe(true);
    });

    it('should estimate token count', () => {
      const text = 'This is a test sentence with multiple words.';
      const estimateTokenCount = (service as any).estimateTokenCount.bind(service);
      
      const tokenCount = estimateTokenCount(text);
      
      expect(tokenCount).toBeGreaterThan(0);
      expect(tokenCount).toBe(Math.ceil(text.length / 4));
    });
  });

  describe('error handling', () => {
    it('should handle Python script execution errors', async () => {
      const filePath = 'test.pdf';
      
      // Mock Python script failure
      const mockSpawn = require('child_process').spawn;
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: {
          on: (event: string, callback: Function) => {
            if (event === 'data') {
              callback('Python execution failed');
            }
          }
        },
        on: (event: string, callback: Function) => {
          if (event === 'close') {
            callback(1); // Error exit code
          }
          if (event === 'error') {
            callback(new Error('Spawn failed'));
          }
        }
      }));

      await expect(service.processDocument(filePath)).rejects.toThrow();
    });

    it('should handle Azure service API errors', async () => {
      mockConfig.pipeline.simulationMode = false;
      service = new DocumentProcessingService(mockConfig, mockProcessingConfig);
      
      // Mock API failure
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      const detectLanguage = (service as any).detectLanguage.bind(service);
      const result = await detectLanguage('Test content');
      
      // Should fallback to English on API failure
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.5);
    });

    it('should handle translation API errors', async () => {
      mockConfig.pipeline.simulationMode = false;
      service = new DocumentProcessingService(mockConfig, mockProcessingConfig);
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const translateContent = (service as any).translateContent.bind(service);
      
      await expect(translateContent('Test', 'ro', 'en')).rejects.toThrow('Translation failed');
    });
  });
});