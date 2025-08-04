import React, { useState, useEffect } from 'react'
import { AssistantMessage } from './AssistantMessage'
import { ChatMessage, Citation } from '../../api/models'

// Example usage of the AssistantMessage component
export const AssistantMessageExample: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')

  const sampleMessage: ChatMessage = {
    id: 'example-message-1',
    role: 'assistant',
    content: `# Salut! Sunt asistentul tău AI

Pot să te ajut cu diverse întrebări și sarcini. Iată câteva exemple de ce pot face:

## Funcționalități principale:
- **Răspunsuri detaliate** la întrebările tale
- **Analiză de cod** și sugestii de îmbunătățire
- **Explicații pas cu pas** pentru concepte complexe

### Exemplu de cod:
\`\`\`javascript
function salutare(nume) {
  console.log(\`Salut, \${nume}!\`);
  return \`Bună ziua, \${nume}!\`;
}

salutare("utilizator");
\`\`\`

> **Notă:** Toate răspunsurile mele sunt generate automat și pot conține erori.

Cum te pot ajuta astăzi?`,
    date: new Date().toISOString()
  }

  const sampleCitations: Citation[] = [
    {
      id: 'citation-1',
      content: 'Documentație oficială React',
      title: 'React Documentation',
      filepath: '/docs/react-guide.pdf',
      url: 'https://react.dev/learn',
      metadata: null,
      chunk_id: '1',
      reindex_id: null,
      part_index: 1
    },
    {
      id: 'citation-2',
      content: 'Ghid JavaScript modern',
      title: 'Modern JavaScript Guide',
      filepath: '/docs/js-modern.pdf',
      url: 'https://javascript.info',
      metadata: null,
      chunk_id: '2',
      reindex_id: null,
      part_index: 1
    }
  ]

  const streamingMessage: ChatMessage = {
    id: 'streaming-message',
    role: 'assistant',
    content: '',
    date: new Date().toISOString()
  }

  // Simulate streaming text
  const simulateStreaming = () => {
    const fullText = "Acesta este un exemplu de text care apare progresiv, simulând răspunsul în timp real al asistentului AI. Textul se afișează cuvânt cu cuvânt pentru a crea o experiență interactivă și angajantă pentru utilizator."
    const words = fullText.split(' ')
    let currentIndex = 0
    
    setIsStreaming(true)
    setStreamingContent('')
    
    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setStreamingContent(prev => prev + (prev ? ' ' : '') + words[currentIndex])
        currentIndex++
      } else {
        setIsStreaming(false)
        clearInterval(interval)
      }
    }, 200) // Add a word every 200ms
  }

  const handleCitationClick = (citation: Citation) => {
    alert(`Citation clicked: ${citation.title}\nURL: ${citation.url}`)
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          AssistantMessage Component Examples
        </h1>

        {/* Example 1: Basic message with markdown */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            1. Basic Message with Markdown
          </h2>
          <AssistantMessage 
            message={sampleMessage}
            onCitationClick={handleCitationClick}
          />
        </div>

        {/* Example 2: Message with citations */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            2. Message with Citations
          </h2>
          <AssistantMessage 
            message={{
              ...sampleMessage,
              content: "Iată informațiile pe care le-am găsit despre React și JavaScript modern. Aceste resurse te vor ajuta să înțelegi mai bine conceptele fundamentale."
            }}
            citations={sampleCitations}
            onCitationClick={handleCitationClick}
          />
        </div>

        {/* Example 3: Streaming message */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            3. Streaming Message
          </h2>
          <div className="mb-4">
            <button
              onClick={simulateStreaming}
              disabled={isStreaming}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStreaming ? 'Streaming...' : 'Start Streaming Demo'}
            </button>
          </div>
          <AssistantMessage 
            message={streamingMessage}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onCitationClick={handleCitationClick}
          />
        </div>

        {/* Example 4: Empty/Loading state */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            4. Loading State
          </h2>
          <AssistantMessage 
            message={{
              id: 'loading-message',
              role: 'assistant',
              content: '',
              date: new Date().toISOString()
            }}
            isStreaming={true}
            streamingContent=""
          />
        </div>
      </div>
    </div>
  )
}

export default AssistantMessageExample