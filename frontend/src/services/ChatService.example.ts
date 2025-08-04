/**
 * ChatService Usage Examples
 * 
 * This file demonstrates how to use the ChatService wrapper layer
 * to maintain 100% compatibility with the existing Azure backend.
 */

import { ChatService, StreamingResponse, ChatServiceConfig } from './ChatService'
import { ChatMessage } from '../api'

// Example 1: Basic usage with streaming
export async function basicStreamingExample() {
  const chatService = new ChatService()
  
  const messages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello, how are you?',
      date: new Date().toISOString()
    }
  ]

  try {
    // Stream conversation without CosmosDB (matches existing makeApiRequestWithoutCosmosDB)
    for await (const response of chatService.streamConversationWithoutCosmosDB(messages)) {
      console.log('Streaming response:', response.message.content)
      
      if (response.citations && response.citations.length > 0) {
        console.log('Citations found:', response.citations.length)
      }
      
      if (response.isComplete) {
        console.log('Message complete!')
        break
      }
    }
  } catch (error) {
    console.error('Streaming error:', error)
  } finally {
    chatService.abort() // Clean up
  }
}

// Example 2: Usage with CosmosDB integration
export async function cosmosDBStreamingExample() {
  const chatService = new ChatService()
  
  const messages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'What is artificial intelligence?',
      date: new Date().toISOString()
    }
  ]

  const conversationId = 'existing-conversation-123'

  try {
    // Stream conversation with CosmosDB (matches existing makeApiRequestWithCosmosDB)
    for await (const response of chatService.streamConversationWithCosmosDB(messages, conversationId)) {
      console.log('Streaming response:', response.message.content)
      
      // Handle citations exactly like the original Chat.tsx
      if (response.citations && response.citations.length > 0) {
        response.citations.forEach((citation, index) => {
          console.log(`Citation ${index + 1}:`, citation.title, citation.url)
        })
      }
      
      if (response.isComplete) {
        console.log('Message complete!')
        break
      }
    }
  } catch (error) {
    console.error('Streaming error:', error)
  } finally {
    chatService.abort()
  }
}

// Example 3: Using configuration callbacks
export async function configuredStreamingExample() {
  const config: ChatServiceConfig = {
    onMessageUpdate: (response: StreamingResponse) => {
      // Handle real-time message updates
      console.log('Message update:', response.message.content)
    },
    onError: (error) => {
      // Handle errors
      console.error('Chat error:', error)
    },
    onComplete: () => {
      // Handle completion
      console.log('Chat completed')
    }
  }

  const chatService = new ChatService(config)
  
  const messages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Explain quantum computing',
      date: new Date().toISOString()
    }
  ]

  try {
    for await (const response of chatService.streamConversationWithoutCosmosDB(messages)) {
      // The callbacks will be triggered automatically
      if (response.isComplete) {
        break
      }
    }
  } finally {
    chatService.abort()
  }
}

// Example 4: Citation parsing (matches existing parseCitationFromMessage)
export function citationParsingExample() {
  const chatService = new ChatService()
  
  const toolMessage: ChatMessage = {
    id: 'tool-1',
    role: 'tool',
    content: JSON.stringify({
      citations: [
        {
          id: 'doc1_chunk1',
          content: 'Artificial intelligence (AI) is intelligence demonstrated by machines...',
          title: 'Introduction to AI',
          filepath: 'documents/ai-intro.pdf',
          url: 'https://example.com/ai-intro.pdf',
          metadata: '{"page": 1, "section": "Introduction"}',
          chunk_id: 'chunk_1',
          reindex_id: 'reindex_1'
        }
      ],
      intent: 'search_documents'
    }),
    date: new Date().toISOString()
  }

  // Parse citations exactly like the original implementation
  const citations = chatService.parseCitationFromMessage(toolMessage)
  console.log('Parsed citations:', citations)
  
  return citations
}

// Example 5: History management (matches existing API calls)
export async function historyManagementExample() {
  const chatService = new ChatService()
  
  const messages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      date: new Date().toISOString()
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hi there! How can I help you?',
      date: new Date().toISOString()
    }
  ]

  const conversationId = 'conv-123'

  try {
    // Update conversation history (matches existing historyUpdate)
    const updateResponse = await chatService.updateConversationHistory(messages, conversationId)
    console.log('History updated:', updateResponse.ok)

    // Submit message feedback (matches existing historyMessageFeedback)
    const feedbackResponse = await chatService.submitMessageFeedback('msg-123', 'positive')
    console.log('Feedback submitted:', feedbackResponse.ok)

    // Rename conversation (matches existing historyRename)
    const renameResponse = await chatService.renameConversation(conversationId, 'New Chat Title')
    console.log('Conversation renamed:', renameResponse.ok)

    // Clear conversation (matches existing historyClear)
    const clearResponse = await chatService.clearConversationHistory(conversationId)
    console.log('Conversation cleared:', clearResponse.ok)

    // Delete conversation (matches existing historyDelete)
    const deleteResponse = await chatService.deleteConversation(conversationId)
    console.log('Conversation deleted:', deleteResponse.ok)

  } catch (error) {
    console.error('History management error:', error)
  }
}

// Example 6: Error handling (matches existing error parsing)
export async function errorHandlingExample() {
  const chatService = new ChatService()
  
  const messages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Some potentially problematic content',
      date: new Date().toISOString()
    }
  ]

  try {
    for await (const response of chatService.streamConversationWithoutCosmosDB(messages)) {
      if (response.error) {
        // Handle different types of errors exactly like the original implementation
        if (response.error.includes('content filtering')) {
          console.log('Content was filtered by Azure OpenAI')
        } else if (response.error.includes('Rate limit')) {
          console.log('Rate limit exceeded')
        } else {
          console.log('General error:', response.error)
        }
      }
      
      if (response.isComplete) {
        break
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error)
  } finally {
    chatService.abort()
  }
}

// Example 7: Multimodal content (matches existing image upload format)
export async function multimodalExample() {
  const chatService = new ChatService()
  
  const multimodalMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: [
        { type: "text", text: "What's in this image?" },
        { type: "image_url", image_url: { url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..." } }
      ] as any,
      date: new Date().toISOString()
    }
  ]

  try {
    for await (const response of chatService.streamConversationWithoutCosmosDB(multimodalMessages)) {
      console.log('AI response to image:', response.message.content)
      
      if (response.isComplete) {
        break
      }
    }
  } finally {
    chatService.abort()
  }
}

// Example 8: Abort streaming (matches existing abort controller logic)
export async function abortExample() {
  const chatService = new ChatService()
  
  const messages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Tell me a very long story',
      date: new Date().toISOString()
    }
  ]

  // Start streaming
  const streamPromise = (async () => {
    for await (const response of chatService.streamConversationWithoutCosmosDB(messages)) {
      console.log('Streaming:', response.message.content)
      
      if (response.isComplete) {
        break
      }
    }
  })()

  // Abort after 2 seconds (matches existing stopGenerating functionality)
  setTimeout(() => {
    console.log('Aborting stream...')
    chatService.abort()
  }, 2000)

  try {
    await streamPromise
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Stream was aborted successfully')
    } else {
      console.error('Unexpected error:', error)
    }
  }
}

/**
 * Key Compatibility Points:
 * 
 * 1. NDJSON Parsing: Maintains exact parsing logic from Chat.tsx
 * 2. Citation Handling: Uses existing parseCitationFromMessage function
 * 3. Error Processing: Preserves RAI content filtering and error parsing
 * 4. Streaming: Maintains real-time message updates
 * 5. API Calls: Wraps existing API functions without modification
 * 6. State Management: Compatible with existing AppStateContext
 * 7. Multimodal: Supports existing image upload format
 * 8. Abort Control: Matches existing abort controller behavior
 */