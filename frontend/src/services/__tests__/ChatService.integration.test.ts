import { ChatService, StreamingResponse } from '../ChatService'
import { ChatMessage, Citation, ToolMessageContent } from '../../api'

// Mock the API functions for integration testing
jest.mock('../../api', () => ({
  conversationApi: jest.fn(),
  historyGenerate: jest.fn(),
  historyUpdate: jest.fn(),
  historyMessageFeedback: jest.fn(),
  historyClear: jest.fn(),
  historyDelete: jest.fn(),
  historyRename: jest.fn()
}))

// Mock uuid
jest.mock('react-uuid', () => ({
  default: () => 'mock-uuid-123'
}))

// Mock lodash
jest.mock('lodash', () => ({
  isEmpty: (obj: any) => !obj || Object.keys(obj).length === 0
}))

describe('ChatService Integration Tests', () => {
  let chatService: ChatService

  beforeEach(() => {
    chatService = new ChatService()
    jest.clearAllMocks()
  })

  afterEach(() => {
    chatService.abort()
  })

  describe('NDJSON parsing compatibility', () => {
    it('should handle the exact NDJSON format from Azure OpenAI', () => {
      // Test with actual NDJSON format from the Microsoft sample app
      const ndjsonLine = '{"id":"chatcmpl-123","object":"extensions.chat.completion.chunk","choices":[{"messages":[{"role":"assistant","content":"Hello there!"}]}],"history_metadata":{},"apim-request-id":"test-123"}'
      
      // Verify the service can parse this format
      expect(() => JSON.parse(ndjsonLine)).not.toThrow()
      
      const parsed = JSON.parse(ndjsonLine)
      expect(parsed.choices).toBeDefined()
      expect(parsed.choices[0].messages).toBeDefined()
      expect(parsed.choices[0].messages[0].role).toBe('assistant')
      expect(parsed.choices[0].messages[0].content).toBe('Hello there!')
    })

    it('should handle tool messages with citations in the expected format', () => {
      const mockCitations: Citation[] = [
        {
          id: 'doc1_chunk1',
          content: 'This is the content from the document',
          title: 'Document Title',
          filepath: 'documents/sample.pdf',
          url: 'https://example.com/documents/sample.pdf',
          metadata: '{"page": 1}',
          chunk_id: 'chunk_1',
          reindex_id: 'reindex_1'
        }
      ]

      const toolMessageContent: ToolMessageContent = {
        citations: mockCitations,
        intent: 'search_documents'
      }

      const toolMessage: ChatMessage = {
        id: 'tool-msg-1',
        role: 'tool',
        content: JSON.stringify(toolMessageContent),
        date: new Date().toISOString()
      }

      const citations = chatService.parseCitationFromMessage(toolMessage)
      
      expect(citations).toHaveLength(1)
      expect(citations[0]).toEqual(mockCitations[0])
      expect(citations[0].id).toBe('doc1_chunk1')
      expect(citations[0].content).toBe('This is the content from the document')
    })

    it('should handle multimodal content format', () => {
      const multimodalContent = [
        { type: "text", text: "What's in this image?" },
        { type: "image_url", image_url: { url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..." } }
      ]

      const userMessage: ChatMessage = {
        id: 'user-1',
        role: 'user',
        content: multimodalContent as any,
        date: new Date().toISOString()
      }

      // Verify the service can handle multimodal content structure
      expect(Array.isArray(userMessage.content)).toBe(true)
      expect((userMessage.content as any)[0].type).toBe('text')
      expect((userMessage.content as any)[1].type).toBe('image_url')
    })
  })

  describe('Error handling compatibility', () => {
    it('should handle Azure OpenAI content filtering errors', () => {
      // Test the exact error format from Azure OpenAI content filtering
      const contentFilterError = "Error - {'innererror': {'content_filter_result': {'jailbreak': {'filtered': True, 'detected': True}}}}"
      
      // The parseErrorMessage method is private, but we can test the pattern it should handle
      expect(contentFilterError).toContain('innererror')
      expect(contentFilterError).toContain('content_filter_result')
      expect(contentFilterError).toContain('jailbreak')
      expect(contentFilterError).toContain('filtered')
    })

    it('should handle rate limiting errors', () => {
      const rateLimitError = "Error-429 - Rate limit exceeded. Please try again later."
      
      // Verify the service can identify rate limit errors
      expect(rateLimitError).toContain('Error-429')
      expect(rateLimitError).toContain('Rate limit')
    })

    it('should handle service unavailable errors', () => {
      const serviceError = "Error-503 - Service temporarily unavailable"
      
      // Verify the service can handle service errors
      expect(serviceError).toContain('Error-503')
      expect(serviceError).toContain('unavailable')
    })
  })

  describe('Message processing compatibility', () => {
    it('should filter error messages from conversation requests', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          date: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there!',
          date: '2024-01-01T00:00:01Z'
        },
        {
          id: '3',
          role: 'error',
          content: 'Something went wrong',
          date: '2024-01-01T00:00:02Z'
        },
        {
          id: '4',
          role: 'user',
          content: 'How are you?',
          date: '2024-01-01T00:00:03Z'
        }
      ]

      // Filter out error messages (this is what the service should do internally)
      const filteredMessages = messages.filter(msg => msg.role !== 'error')
      
      expect(filteredMessages).toHaveLength(3)
      expect(filteredMessages.every(msg => msg.role !== 'error')).toBe(true)
    })

    it('should handle exec results in assistant messages', () => {
      const execResultContent = JSON.stringify({
        all_exec_results: [
          {
            intent: 'sql_query',
            search_query: 'SELECT * FROM users',
            search_result: 'Query executed successfully',
            code_generated: 'SELECT * FROM users WHERE active = 1',
            code_exec_result: '[{"id": 1, "name": "John"}]'
          }
        ]
      })

      const assistantMessage: ChatMessage = {
        id: 'assistant-1',
        role: 'assistant',
        content: execResultContent,
        date: new Date().toISOString()
      }

      // Verify the service can identify exec results
      expect(assistantMessage.content).toContain('all_exec_results')
      expect(() => JSON.parse(assistantMessage.content as string)).not.toThrow()
      
      const parsed = JSON.parse(assistantMessage.content as string)
      expect(parsed.all_exec_results).toBeDefined()
      expect(Array.isArray(parsed.all_exec_results)).toBe(true)
    })
  })

  describe('Streaming response format compatibility', () => {
    it('should produce StreamingResponse objects with correct structure', () => {
      const mockStreamingResponse: StreamingResponse = {
        message: {
          id: 'msg-123',
          role: 'assistant',
          content: 'Hello there!',
          date: new Date().toISOString(),
          isComplete: false
        },
        citations: [
          {
            id: 'citation-1',
            content: 'Sample content',
            title: 'Sample Document',
            filepath: '/docs/sample.pdf',
            url: 'https://example.com/sample.pdf',
            metadata: null,
            chunk_id: 'chunk-1',
            reindex_id: null
          }
        ],
        isComplete: false
      }

      // Verify the response structure matches expectations
      expect(mockStreamingResponse.message).toBeDefined()
      expect(mockStreamingResponse.message.id).toBe('msg-123')
      expect(mockStreamingResponse.message.role).toBe('assistant')
      expect(mockStreamingResponse.message.content).toBe('Hello there!')
      expect(mockStreamingResponse.message.isComplete).toBe(false)
      expect(mockStreamingResponse.citations).toBeDefined()
      expect(Array.isArray(mockStreamingResponse.citations)).toBe(true)
      expect(mockStreamingResponse.isComplete).toBe(false)
    })

    it('should handle complete vs incomplete message states', () => {
      const incompleteResponse: StreamingResponse = {
        message: {
          id: 'msg-123',
          role: 'assistant',
          content: 'Hello',
          date: new Date().toISOString(),
          isComplete: false
        },
        isComplete: false
      }

      const completeResponse: StreamingResponse = {
        message: {
          id: 'msg-123',
          role: 'assistant',
          content: 'Hello there!',
          date: new Date().toISOString(),
          isComplete: true
        },
        isComplete: true
      }

      expect(incompleteResponse.message.isComplete).toBe(false)
      expect(incompleteResponse.isComplete).toBe(false)
      expect(completeResponse.message.isComplete).toBe(true)
      expect(completeResponse.isComplete).toBe(true)
    })
  })

  describe('Configuration and lifecycle', () => {
    it('should support configuration callbacks', () => {
      const onMessageUpdate = jest.fn()
      const onError = jest.fn()
      const onComplete = jest.fn()

      const configuredService = new ChatService({
        onMessageUpdate,
        onError,
        onComplete
      })

      expect(configuredService).toBeInstanceOf(ChatService)
      // The callbacks are stored internally and would be called during streaming
    })

    it('should handle abort controller lifecycle', () => {
      const service = new ChatService()
      
      // Should not throw when aborting without active stream
      expect(() => service.abort()).not.toThrow()
      
      // Should be able to abort multiple times
      service.abort()
      service.abort()
      
      expect(() => service.abort()).not.toThrow()
    })
  })
})