import {
    TranslationService,
    TranslationServiceError,
    TranslationRateLimitError,
    TranslationQuotaExceededError,
    UnsupportedLanguageError,
    createTranslationService,
    type TranslationResult,
    type TranslationBatchResult,
    type AzureTranslatorCredentials
} from '../translation-service';

// Mock fetch globally
global.fetch = jest.fn();

describe('TranslationService', () => {
    let mockCredentials: AzureTranslatorCredentials;
    let translationService: TranslationService;

    beforeEach(() => {
        mockCredentials = {
            endpoint: 'https://api.cognitive.microsofttranslator.com/',
            key: 'test-key-12345',
            region: 'eastus'
        };

        translationService = new TranslationService(mockCredentials);

        // Reset fetch mock
        (fetch as jest.Mock).mockReset();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with default options', () => {
            const service = new TranslationService(mockCredentials);
            expect(service).toBeInstanceOf(TranslationService);
        });

        it('should initialize with custom options', () => {
            const customOptions = {
                maxRetries: 5,
                retryDelayMs: 2000,
                timeoutMs: 60000,
                batchSize: 50
            };

            const service = new TranslationService(mockCredentials, customOptions);
            expect(service).toBeInstanceOf(TranslationService);
        });
    });

    describe('translateText', () => {
        it('should successfully translate text', async () => {
            const mockResponse = [{
                translations: [{ text: 'Hola', to: 'es' }],
                detectedLanguage: { language: 'en', score: 0.95 }
            }];

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await translationService.translateText('Hello', 'en', 'es');

            expect(result).toEqual({
                translatedText: 'Hola',
                originalLanguage: 'en',
                targetLanguage: 'es',
                confidence: 0.95
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('translate?api-version=3.0&from=en&to=es'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Ocp-Apim-Subscription-Key': 'test-key-12345',
                        'Ocp-Apim-Subscription-Region': 'eastus',
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify([{ text: 'Hello' }])
                })
            );
        });

        it('should handle empty text input', async () => {
            await expect(translationService.translateText('', 'en', 'es'))
                .rejects.toThrow(TranslationServiceError);

            await expect(translationService.translateText('   ', 'en', 'es'))
                .rejects.toThrow(TranslationServiceError);
        });

        it('should validate unsupported languages', async () => {
            await expect(translationService.translateText('Hello', 'xyz', 'es'))
                .rejects.toThrow(UnsupportedLanguageError);

            await expect(translationService.translateText('Hello', 'en', 'xyz'))
                .rejects.toThrow(UnsupportedLanguageError);
        });

        it('should reject same source and target languages', async () => {
            await expect(translationService.translateText('Hello', 'en', 'en'))
                .rejects.toThrow(TranslationServiceError);
        });

        it('should handle API rate limiting with retry', async () => {
            // First call returns rate limit error
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests',
                    headers: new Map([['Retry-After', '2']]),
                    json: async () => ({ error: { message: 'Rate limit exceeded' } })
                })
                // Second call succeeds
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [{
                        translations: [{ text: 'Hola', to: 'es' }],
                        detectedLanguage: { language: 'en', score: 0.95 }
                    }]
                });

            const result = await translationService.translateText('Hello', 'en', 'es');

            expect(result.translatedText).toBe('Hola');
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('should handle quota exceeded error', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                json: async () => ({ error: { message: 'Quota exceeded' } })
            });

            await expect(translationService.translateText('Hello', 'en', 'es'))
                .rejects.toThrow(TranslationQuotaExceededError);
        });

        it('should handle network timeout', async () => {
            (fetch as jest.Mock).mockImplementationOnce(() =>
                new Promise((_, reject) => {
                    const error = new Error('The operation was aborted');
                    error.name = 'AbortError';
                    setTimeout(() => reject(error), 10);
                })
            );

            const service = new TranslationService(mockCredentials, { timeoutMs: 50, maxRetries: 0 });

            await expect(service.translateText('Hello', 'en', 'es'))
                .rejects.toThrow('Translation request timed out');
        }, 10000);

        it('should retry on server errors', async () => {
            // First call returns server error
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    json: async () => ({ error: { message: 'Server error' } })
                })
                // Second call succeeds
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [{
                        translations: [{ text: 'Hola', to: 'es' }],
                        detectedLanguage: { language: 'en', score: 0.95 }
                    }]
                });

            const result = await translationService.translateText('Hello', 'en', 'es');

            expect(result.translatedText).toBe('Hola');
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('should fail after max retries', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => ({ error: { message: 'Server error' } })
            });

            const service = new TranslationService(mockCredentials, { maxRetries: 2, retryDelayMs: 10 });

            await expect(service.translateText('Hello', 'en', 'es'))
                .rejects.toThrow('Translation failed after 3 attempts');

            expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
        }, 10000);
    });

    describe('translateBatch', () => {
        it('should successfully translate multiple texts', async () => {
            const mockResponse = [
                {
                    translations: [{ text: 'Hola', to: 'es' }],
                    detectedLanguage: { language: 'en', score: 0.95 }
                },
                {
                    translations: [{ text: 'Mundo', to: 'es' }],
                    detectedLanguage: { language: 'en', score: 0.98 }
                }
            ];

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await translationService.translateBatch(['Hello', 'World'], 'en', 'es');

            expect(result.totalProcessed).toBe(2);
            expect(result.totalFailed).toBe(0);
            expect(result.results).toHaveLength(2);
            expect(result.results[0].translatedText).toBe('Hola');
            expect(result.results[1].translatedText).toBe('Mundo');
        });

        it('should handle empty input array', async () => {
            const result = await translationService.translateBatch([], 'en', 'es');

            expect(result.totalProcessed).toBe(0);
            expect(result.totalFailed).toBe(0);
            expect(result.results).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should filter out empty texts and track errors', async () => {
            const mockResponse = [{
                translations: [{ text: 'Hola', to: 'es' }],
                detectedLanguage: { language: 'en', score: 0.95 }
            }];

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await translationService.translateBatch(['Hello', '', '   '], 'en', 'es');

            expect(result.totalProcessed).toBe(1);
            expect(result.totalFailed).toBe(2);
            expect(result.results).toHaveLength(1);
            expect(result.errors).toHaveLength(2);
            expect(result.errors[0].index).toBe(1);
            expect(result.errors[1].index).toBe(2);
        });

        it('should process texts in batches', async () => {
            const service = new TranslationService(mockCredentials, { batchSize: 2 });

            // Mock responses for two batches
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [
                        { translations: [{ text: 'Uno', to: 'es' }] },
                        { translations: [{ text: 'Dos', to: 'es' }] }
                    ]
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [
                        { translations: [{ text: 'Tres', to: 'es' }] }
                    ]
                });

            const result = await service.translateBatch(['One', 'Two', 'Three'], 'en', 'es');

            expect(result.totalProcessed).toBe(3);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('should handle partial batch failures', async () => {
            const service = new TranslationService(mockCredentials, { batchSize: 2, maxRetries: 0 });

            // First batch succeeds, second batch fails
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [
                        { translations: [{ text: 'Uno', to: 'es' }] },
                        { translations: [{ text: 'Dos', to: 'es' }] }
                    ]
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    json: async () => ({ error: { message: 'Server error' } })
                });

            const result = await service.translateBatch(['One', 'Two', 'Three'], 'en', 'es');

            expect(result.totalProcessed).toBe(2);
            expect(result.totalFailed).toBe(1);
            expect(result.results).toHaveLength(2);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].index).toBe(2);
        });

        it('should handle rate limiting in batch processing', async () => {
            const service = new TranslationService(mockCredentials, { batchSize: 1 });

            // First call rate limited, second call succeeds
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests',
                    headers: new Map([['Retry-After', '1']]),
                    json: async () => ({ error: { message: 'Rate limit exceeded' } })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [{ translations: [{ text: 'Hola', to: 'es' }] }]
                });

            const result = await service.translateBatch(['Hello'], 'en', 'es');

            expect(result.totalProcessed).toBe(1);
            expect(result.totalFailed).toBe(0);
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('language support', () => {
        it('should check if language is supported', () => {
            expect(translationService.isLanguageSupported('en')).toBe(true);
            expect(translationService.isLanguageSupported('es')).toBe(true);
            expect(translationService.isLanguageSupported('ro')).toBe(true);
            expect(translationService.isLanguageSupported('xyz')).toBe(false);
        });

        it('should return list of supported languages', () => {
            const languages = translationService.getSupportedLanguages();
            expect(languages).toContain('en');
            expect(languages).toContain('es');
            expect(languages).toContain('ro');
            expect(languages.length).toBeGreaterThan(50);
        });
    });

    describe('testConnection', () => {
        it('should return success for valid connection', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    translations: [{ text: 'Hola', to: 'es' }]
                }]
            });

            const result = await translationService.testConnection();
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should return error for failed connection', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: async () => ({ error: { message: 'Invalid credentials' } })
            });

            const result = await translationService.testConnection();
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid authentication credentials');
        });
    });

    describe('getServiceInfo', () => {
        it('should return service information', async () => {
            const info = await translationService.getServiceInfo();

            expect(info.supportedLanguages).toContain('en');
            expect(info.maxBatchSize).toBe(25);
            expect(info.defaultTimeout).toBe(30000);
            expect(info.maxRetries).toBe(3);
        });
    });

    describe('error handling', () => {
        it('should handle 400 Bad Request', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: async () => ({ error: { message: 'Invalid request' } })
            });

            await expect(translationService.translateText('Hello', 'en', 'es'))
                .rejects.toThrow(TranslationServiceError);
        });

        it('should handle 401 Unauthorized', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: async () => ({ error: { message: 'Invalid credentials' } })
            });

            await expect(translationService.translateText('Hello', 'en', 'es'))
                .rejects.toThrow('Invalid authentication credentials');
        });

        it('should handle malformed JSON response', async () => {
            const service = new TranslationService(mockCredentials, { maxRetries: 0 });

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => { throw new Error('Invalid JSON'); }
            });

            await expect(service.translateText('Hello', 'en', 'es'))
                .rejects.toThrow(TranslationServiceError);
        }, 10000);

        it('should handle network errors', async () => {
            const service = new TranslationService(mockCredentials, { maxRetries: 0 });

            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            await expect(service.translateText('Hello', 'en', 'es'))
                .rejects.toThrow('Network error');
        }, 10000);
    });

    describe('createTranslationService factory', () => {
        it('should create service and test connection', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    translations: [{ text: 'Hola', to: 'es' }]
                }]
            });

            const service = await createTranslationService(mockCredentials);
            expect(service).toBeInstanceOf(TranslationService);
        });

        it('should throw error if connection test fails', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: async () => ({ error: { message: 'Invalid credentials' } })
            });

            await expect(createTranslationService(mockCredentials))
                .rejects.toThrow('Failed to connect to Azure Translator service');
        });
    });

    describe('retry logic and exponential backoff', () => {
        it('should implement exponential backoff', async () => {
            const service = new TranslationService(mockCredentials, {
                maxRetries: 2,
                retryDelayMs: 100
            });

            // Mock all calls to fail with server error
            (fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => ({ error: { message: 'Server error' } })
            });

            const startTime = Date.now();

            await expect(service.translateText('Hello', 'en', 'es'))
                .rejects.toThrow('Translation failed after 3 attempts');

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should have waited for retries (at least 100ms + 200ms for exponential backoff)
            expect(duration).toBeGreaterThan(250);
            expect(fetch).toHaveBeenCalledTimes(3);
        });

        it('should respect retry-after header for rate limiting', async () => {
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests',
                    headers: new Map([['Retry-After', '1']]),
                    json: async () => ({ error: { message: 'Rate limit exceeded' } })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [{
                        translations: [{ text: 'Hola', to: 'es' }]
                    }]
                });

            const startTime = Date.now();
            const result = await translationService.translateText('Hello', 'en', 'es');
            const endTime = Date.now();

            expect(result.translatedText).toBe('Hola');
            expect(endTime - startTime).toBeGreaterThan(900); // Should wait ~1 second
        });
    });

    describe('request headers and tracing', () => {
        it('should include proper headers in requests', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    translations: [{ text: 'Hola', to: 'es' }]
                }]
            });

            await translationService.translateText('Hello', 'en', 'es');

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Ocp-Apim-Subscription-Key': 'test-key-12345',
                        'Ocp-Apim-Subscription-Region': 'eastus',
                        'Content-Type': 'application/json',
                        'X-ClientTraceId': expect.stringMatching(/^\d+-[a-z0-9]+$/)
                    })
                })
            );
        });

        it('should include optional parameters in URL', async () => {
            const service = new TranslationService(mockCredentials, {
                includeAlignment: true,
                includeSentenceLength: true
            });

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    translations: [{ text: 'Hola', to: 'es' }]
                }]
            });

            await service.translateText('Hello', 'en', 'es');

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('includeAlignment=true'),
                expect.any(Object)
            );
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('includeSentenceLength=true'),
                expect.any(Object)
            );
        });
    });
});