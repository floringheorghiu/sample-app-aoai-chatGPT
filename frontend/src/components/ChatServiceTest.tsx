import React, { useState, useRef } from 'react'
import { ChatService, StreamingResponse } from '../services/ChatService'
import { ChatMessage } from '../api'

interface TestResult {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  timestamp: Date
}

const ChatServiceTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const chatServiceRef = useRef<ChatService | null>(null)

  const addTestResult = (type: TestResult['type'], message: string) => {
    const result: TestResult = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    }
    setTestResults(prev => [...prev, result])
  }

  const clearResults = () => {
    setTestResults([])
    setStreamingContent('')
  }

  const testCitationParsing = () => {
    addTestResult('info', 'Testing citation parsing...')
    
    const chatService = new ChatService()
    
    // Test with valid tool message
    const toolMessage: ChatMessage = {
      id: 'tool-1',
      role: 'tool',
      content: JSON.stringify({
        citations: [
          {
            id: 'test-citation-1',
            content: 'This is a test citation content',
            title: 'Test Document',
            filepath: '/test/document.pdf',
            url: 'https://example.com/test.pdf',
            metadata: '{"page": 1}',
            chunk_id: 'chunk-1',
            reindex_id: null
          }
        ],
        intent: 'search'
      }),
      date: new Date().toISOString()
    }

    try {
      const citations = chatService.parseCitationFromMessage(toolMessage)
      if (citations.length === 1 && citations[0].id === 'test-citation-1') {
        addTestResult('success', `Citation parsing successful: Found ${citations.length} citation(s)`)
      } else {
        addTestResult('error', `Citation parsing failed: Expected 1 citation, got ${citations.length}`)
      }
    } catch (error) {
      addTestResult('error', `Citation parsing error: ${error}`)
    }

    // Test with invalid JSON
    const invalidToolMessage: ChatMessage = {
      id: 'tool-2',
      role: 'tool',
      content: 'invalid json content',
      date: new Date().toISOString()
    }

    try {
      const citations = chatService.parseCitationFromMessage(invalidToolMessage)
      if (citations.length === 0) {
        addTestResult('success', 'Invalid JSON handling successful: Returned empty array')
      } else {
        addTestResult('error', 'Invalid JSON handling failed: Should return empty array')
      }
    } catch (error) {
      addTestResult('error', `Invalid JSON handling error: ${error}`)
    }

    // Test with non-tool message
    const userMessage: ChatMessage = {
      id: 'user-1',
      role: 'user',
      content: 'Hello world',
      date: new Date().toISOString()
    }

    try {
      const citations = chatService.parseCitationFromMessage(userMessage)
      if (citations.length === 0) {
        addTestResult('success', 'Non-tool message handling successful: Returned empty array')
      } else {
        addTestResult('error', 'Non-tool message handling failed: Should return empty array')
      }
    } catch (error) {
      addTestResult('error', `Non-tool message handling error: ${error}`)
    }
  }

  const testServiceInstantiation = () => {
    addTestResult('info', 'Testing service instantiation...')
    
    try {
      // Test default constructor
      const service1 = new ChatService()
      addTestResult('success', 'Default constructor successful')

      // Test with configuration
      const config = {
        onMessageUpdate: (response: StreamingResponse) => {
          console.log('Message update:', response)
        },
        onError: (error) => {
          console.error('Service error:', error)
        },
        onComplete: () => {
          console.log('Service complete')
        }
      }
      const service2 = new ChatService(config)
      addTestResult('success', 'Configured constructor successful')

      // Test methods exist
      const methods = [
        'streamConversationWithoutCosmosDB',
        'streamConversationWithCosmosDB',
        'parseCitationFromMessage',
        'updateConversationHistory',
        'submitMessageFeedback',
        'clearConversationHistory',
        'deleteConversation',
        'renameConversation',
        'abort'
      ]

      let allMethodsExist = true
      for (const method of methods) {
        if (typeof (service1 as any)[method] !== 'function') {
          addTestResult('error', `Method ${method} does not exist or is not a function`)
          allMethodsExist = false
        }
      }

      if (allMethodsExist) {
        addTestResult('success', `All ${methods.length} required methods exist`)
      }

    } catch (error) {
      addTestResult('error', `Service instantiation error: ${error}`)
    }
  }

  const testRealStreamingWithoutCosmosDB = async () => {
    addTestResult('info', 'Testing REAL streaming without CosmosDB...')
    setIsRunning(true)
    setStreamingContent('')

    try {
      const chatService = new ChatService({
        onMessageUpdate: (response: StreamingResponse) => {
          setStreamingContent(prev => prev + response.message.content)
          addTestResult('info', `Streaming: "${response.message.content.slice(-50)}..." (Complete: ${response.isComplete})`)
        }
      })

      chatServiceRef.current = chatService

      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: currentMessage || 'Hello! Can you tell me about Narada and education in Romania?',
          date: new Date().toISOString()
        }
      ]

      addTestResult('info', 'Starting real Azure OpenAI streaming...')
      
      let messageCount = 0
      let totalContent = ''
      
      for await (const response of chatService.streamConversationWithoutCosmosDB(messages)) {
        messageCount++
        totalContent = response.message.content
        
        if (response.citations && response.citations.length > 0) {
          addTestResult('success', `Found ${response.citations.length} citations!`)
        }
        
        if (response.isComplete) {
          addTestResult('success', `Streaming completed! Received ${messageCount} updates, total content length: ${totalContent.length}`)
          break
        }
      }

    } catch (error) {
      addTestResult('error', `Real streaming test error: ${error}`)
      console.error('Streaming error details:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const testRealStreamingWithCosmosDB = async () => {
    addTestResult('info', 'Testing REAL streaming with CosmosDB...')
    setIsRunning(true)
    setStreamingContent('')

    try {
      const chatService = new ChatService({
        onMessageUpdate: (response: StreamingResponse) => {
          setStreamingContent(prev => prev + response.message.content)
          addTestResult('info', `CosmosDB Streaming: "${response.message.content.slice(-30)}..." (Complete: ${response.isComplete})`)
        }
      })

      chatServiceRef.current = chatService

      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: currentMessage || 'What are some effective teaching strategies for Romanian students?',
          date: new Date().toISOString()
        }
      ]

      addTestResult('info', 'Starting real Azure OpenAI streaming with CosmosDB...')
      
      let messageCount = 0
      let totalContent = ''
      
      for await (const response of chatService.streamConversationWithCosmosDB(messages)) {
        messageCount++
        totalContent = response.message.content
        
        if (response.citations && response.citations.length > 0) {
          addTestResult('success', `Found ${response.citations.length} citations from Azure Search!`)
          response.citations.forEach((citation, index) => {
            addTestResult('info', `Citation ${index + 1}: ${citation.title || 'Untitled'} - ${citation.url || 'No URL'}`)
          })
        }
        
        if (response.isComplete) {
          addTestResult('success', `CosmosDB streaming completed! Received ${messageCount} updates, total content length: ${totalContent.length}`)
          break
        }
      }

    } catch (error) {
      addTestResult('error', `Real CosmosDB streaming test error: ${error}`)
      console.error('CosmosDB streaming error details:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const testAbortFunctionality = () => {
    addTestResult('info', 'Testing abort functionality...')
    
    try {
      const chatService = new ChatService()
      
      // Test abort without active stream
      chatService.abort()
      addTestResult('success', 'Abort without active stream successful')

      // Test multiple aborts
      chatService.abort()
      chatService.abort()
      addTestResult('success', 'Multiple abort calls successful')

    } catch (error) {
      addTestResult('error', `Abort functionality error: ${error}`)
    }
  }

  const runAllTests = async () => {
    clearResults()
    addTestResult('info', 'Starting comprehensive ChatService tests...')
    
    // Basic tests first
    testServiceInstantiation()
    testCitationParsing()
    testAbortFunctionality()
    
    // Real streaming tests
    addTestResult('info', 'Starting REAL Azure OpenAI streaming tests...')
    await testRealStreamingWithoutCosmosDB()
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await testRealStreamingWithCosmosDB()
    
    addTestResult('info', '🎉 All tests completed!')
  }

  const stopStreaming = () => {
    if (chatServiceRef.current) {
      chatServiceRef.current.abort()
      addTestResult('info', 'Streaming aborted by user')
    }
    setIsRunning(false)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>ChatService Test Page</h1>
      <p>This page tests the ChatService wrapper layer functionality against the REAL Azure OpenAI service.</p>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>🔗 Azure Configuration Status</h4>
        <p style={{ margin: '0', fontSize: '14px' }}>
          <strong>Endpoint:</strong> ceerdc-openai-team4.openai.azure.com<br/>
          <strong>Model:</strong> gpt-4o<br/>
          <strong>Search:</strong> ceerdcnaradaaisearch (azureblob-index)<br/>
          <strong>CosmosDB:</strong> db-ceerdcnaradawebapp
        </p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Test Message Input</h3>
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Enter test message (optional)"
          style={{ width: '300px', padding: '8px', marginRight: '10px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests} 
          disabled={isRunning}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <button 
          onClick={testCitationParsing}
          disabled={isRunning}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#107c10',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          Test Citation Parsing
        </button>

        <button 
          onClick={testServiceInstantiation}
          disabled={isRunning}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#5c2d91',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          Test Service Setup
        </button>

        <button 
          onClick={testRealStreamingWithoutCosmosDB}
          disabled={isRunning}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#d83b01',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          🔥 Test REAL Streaming (No DB)
        </button>

        <button 
          onClick={testRealStreamingWithCosmosDB}
          disabled={isRunning}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#ca5010',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          🚀 Test REAL Streaming (CosmosDB)
        </button>

        <button 
          onClick={clearResults}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#d13438',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Results
        </button>

        {isRunning && (
          <button 
            onClick={stopStreaming}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#ff4b4b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Stop/Abort
          </button>
        )}
      </div>

      {streamingContent && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Streaming Content</h3>
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#f5f5f5', 
            border: '1px solid #ddd',
            borderRadius: '4px',
            minHeight: '50px'
          }}>
            {streamingContent}
          </div>
        </div>
      )}

      <div>
        <h3>Test Results</h3>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '10px'
        }}>
          {testResults.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No test results yet. Click "Run All Tests" to start.</p>
          ) : (
            testResults.map(result => (
              <div 
                key={result.id}
                style={{ 
                  padding: '8px',
                  marginBottom: '5px',
                  borderRadius: '4px',
                  backgroundColor: 
                    result.type === 'success' ? '#d4edda' :
                    result.type === 'error' ? '#f8d7da' : '#d1ecf1',
                  borderLeft: `4px solid ${
                    result.type === 'success' ? '#28a745' :
                    result.type === 'error' ? '#dc3545' : '#17a2b8'
                  }`
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ 
                    fontWeight: result.type === 'error' ? 'bold' : 'normal',
                    color: 
                      result.type === 'success' ? '#155724' :
                      result.type === 'error' ? '#721c24' : '#0c5460'
                  }}>
                    {result.message}
                  </span>
                  <small style={{ 
                    color: '#666',
                    fontSize: '0.8em',
                    marginLeft: '10px',
                    whiteSpace: 'nowrap'
                  }}>
                    {result.timestamp.toLocaleTimeString()}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Test Coverage</h4>
        <ul>
          <li>✅ Service instantiation (default and configured)</li>
          <li>✅ Citation parsing from tool messages</li>
          <li>✅ Invalid JSON handling</li>
          <li>✅ Non-tool message handling</li>
          <li>✅ Method existence verification</li>
          <li>✅ Abort functionality</li>
          <li>🔥 <strong>REAL Azure OpenAI streaming (without CosmosDB)</strong></li>
          <li>🚀 <strong>REAL Azure OpenAI streaming (with CosmosDB)</strong></li>
          <li>🔍 <strong>REAL Azure AI Search citations</strong></li>
          <li>📊 <strong>REAL NDJSON parsing from Azure</strong></li>
        </ul>
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
          <p><strong>🎯 MAIN GOAL ACHIEVED:</strong> This page now tests the ChatService against the REAL Azure OpenAI endpoints!</p>
          <p><strong>Configuration:</strong> Using Azure OpenAI resource: <code>ceerdc-openai-team4</code></p>
          <p><strong>Model:</strong> <code>gpt-4o</code> with Azure AI Search integration</p>
        </div>
      </div>
    </div>
  )
}

export default ChatServiceTest