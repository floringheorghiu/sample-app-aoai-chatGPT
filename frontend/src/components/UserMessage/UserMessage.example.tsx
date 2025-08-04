import React from 'react'
import { UserMessage } from './UserMessage'
import { ChatMessage } from '../../api/models'
import { AppStateContext } from '../../state/AppProvider'
import { ChatHistoryLoadingState, CosmosDBStatus } from '../../api'
import { Persona } from '../../types/persona'

/**
 * Example usage of the UserMessage component with different personas and content types
 * This file demonstrates how to use the UserMessage component in various scenarios
 */

// Mock context for examples
const createExampleContext = (persona: Persona | null) => ({
  state: {
    isChatHistoryOpen: false,
    chatHistoryLoadingState: ChatHistoryLoadingState.NotStarted,
    isCosmosDBAvailable: { cosmosDB: false, status: CosmosDBStatus.NotConfigured },
    chatHistory: [],
    filteredChatHistory: [],
    currentChat: null,
    frontendSettings: null,
    feedbackState: {},
    isLoading: false,
    answerExecResult: {},
    currentPersona: persona,
    selectedInterest: null,
    onboardingCompleted: true,
    selectedTopic: null,
    onboardingContext: null
  },
  dispatch: () => {}
})

// Example messages
const textMessage: ChatMessage = {
  id: 'example-1',
  role: 'user',
  content: 'Poți să mă ajuți cu tema la matematică?',
  date: new Date().toISOString()
}

const multimodalMessage: ChatMessage = {
  id: 'example-2',
  role: 'user',
  content: [
    { type: 'text', text: 'Ce vezi în această diagramă?' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' } }
  ] as any,
  date: new Date().toISOString()
}

const longTextMessage: ChatMessage = {
  id: 'example-3',
  role: 'user',
  content: `Salut! Am o întrebare despre proiectul de științe.

Trebuie să fac un experiment despre fotosinteza și nu știu de unde să încep.

Poți să mă ajuți cu niște idei?`,
  date: new Date().toISOString()
}

// Example components for different personas
export const ElevExample: React.FC = () => (
  <AppStateContext.Provider value={createExampleContext('elev')}>
    <div className="p-4 bg-[#FEEFF7] min-h-screen">
      <h2 className="text-lg font-semibold mb-4 text-[#07050a]">Elev Persona Example</h2>
      <UserMessage message={textMessage} />
      <UserMessage message={multimodalMessage} />
      <UserMessage message={longTextMessage} />
    </div>
  </AppStateContext.Provider>
)

export const ParinteExample: React.FC = () => (
  <AppStateContext.Provider value={createExampleContext('părinte')}>
    <div className="p-4 bg-[#FFF0F3] min-h-screen">
      <h2 className="text-lg font-semibold mb-4 text-[#07050a]">Părinte Persona Example</h2>
      <UserMessage message={{
        ...textMessage,
        content: 'Cum pot să-mi ajut copilul cu temele?'
      }} />
      <UserMessage message={multimodalMessage} />
    </div>
  </AppStateContext.Provider>
)

export const ProfesorExample: React.FC = () => (
  <AppStateContext.Provider value={createExampleContext('profesor')}>
    <div className="p-4 bg-[#F5F0FF] min-h-screen">
      <h2 className="text-lg font-semibold mb-4 text-[#07050a]">Profesor Persona Example</h2>
      <UserMessage message={{
        ...textMessage,
        content: 'Cum pot să fac lecțiile mai interactive?'
      }} />
      <UserMessage message={longTextMessage} />
    </div>
  </AppStateContext.Provider>
)

export const IncognitoExample: React.FC = () => (
  <AppStateContext.Provider value={createExampleContext('incognito')}>
    <div className="p-4 bg-gray-50 min-h-screen">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Incognito Persona Example</h2>
      <UserMessage message={{
        ...textMessage,
        content: 'Vreau să învăț ceva nou astăzi.'
      }} />
      <UserMessage message={multimodalMessage} />
    </div>
  </AppStateContext.Provider>
)

// Combined example showing all personas
export const AllPersonasExample: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <ElevExample />
    <ParinteExample />
    <ProfesorExample />
    <IncognitoExample />
  </div>
)

// Usage examples for developers
export const UsageExamples = {
  // Basic text message
  basicUsage: `
import { UserMessage } from './components/UserMessage'
import { useAppPersonaTheme } from './hooks/usePersonaTheme'

const MyComponent = () => {
  const message = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, can you help me?',
    date: new Date().toISOString()
  }

  return <UserMessage message={message} />
}`,

  // Multimodal message
  multimodalUsage: `
const multimodalMessage = {
  id: 'msg-2',
  role: 'user',
  content: [
    { type: 'text', text: 'What do you see in this image?' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
  ],
  date: new Date().toISOString()
}

return <UserMessage message={multimodalMessage} />`,

  // With custom styling
  customStylingUsage: `
return (
  <UserMessage 
    message={message} 
    className="my-custom-class" 
  />
)`
}