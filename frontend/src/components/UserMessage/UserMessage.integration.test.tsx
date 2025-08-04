import React from 'react'
import { render, screen } from '@testing-library/react'
import { UserMessage } from './UserMessage'
import { AppStateContext } from '../../state/AppProvider'
import { ChatMessage } from '../../api/models'
import { Persona } from '../../types/persona'
import { ChatHistoryLoadingState, CosmosDBStatus } from '../../api'

// Mock the Avatar component
jest.mock('../ui/avatar', () => ({
  Avatar: ({ persona, type, className }: { persona: string; type: string; className?: string }) => (
    <div data-testid="avatar" data-persona={persona} data-type={type} className={className}>
      {persona} Avatar
    </div>
  )
}))

// Mock the utils
jest.mock('../../lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' ')
}))

// Create a mock context provider
const createMockContext = (persona: Persona | null) => ({
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
  dispatch: jest.fn()
})

const renderWithContext = (component: React.ReactElement, persona: Persona | null = 'elev') => {
  const mockContext = createMockContext(persona)
  return render(
    <AppStateContext.Provider value={mockContext}>
      {component}
    </AppStateContext.Provider>
  )
}

describe('UserMessage Integration Tests', () => {
  const textMessage: ChatMessage = {
    id: 'integration-test-1',
    role: 'user',
    content: 'Poți să mă ajuți cu matematica?',
    date: '2024-01-15T10:30:00Z'
  }

  const multimodalMessage: ChatMessage = {
    id: 'integration-test-2',
    role: 'user',
    content: [
      { type: 'text', text: 'Ce vezi în această imagine?' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' } }
    ] as any,
    date: '2024-01-15T10:35:00Z'
  }

  describe('Persona Theme Integration', () => {
    it('integrates properly with elev persona theme', () => {
      const { container } = renderWithContext(<UserMessage message={textMessage} />, 'elev')
      
      // Check that the avatar shows the correct persona
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('elev')
      expect(avatar.textContent).toBe('elev Avatar')
      
      // Check that the message bubble has persona-specific styling
      const messageBubble = container.querySelector('.bg-\\[\\#D0337D\\]')
      expect(messageBubble).toBeTruthy()
    })

    it('integrates properly with părinte persona theme', () => {
      const { container } = renderWithContext(<UserMessage message={textMessage} />, 'părinte')
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('părinte')
      expect(avatar.textContent).toBe('părinte Avatar')
      
      // Check for părinte-specific styling
      const messageBubble = container.querySelector('.bg-\\[\\#ff4773\\]')
      expect(messageBubble).toBeTruthy()
    })

    it('integrates properly with profesor persona theme', () => {
      const { container } = renderWithContext(<UserMessage message={textMessage} />, 'profesor')
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('profesor')
      expect(avatar.textContent).toBe('profesor Avatar')
      
      // Check for profesor-specific styling
      const messageBubble = container.querySelector('.bg-\\[\\#9a6ae1\\]')
      expect(messageBubble).toBeTruthy()
    })

    it('integrates properly with incognito persona theme', () => {
      const { container } = renderWithContext(<UserMessage message={textMessage} />, 'incognito')
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('incognito')
      expect(avatar.textContent).toBe('incognito Avatar')
      
      // Check for incognito-specific styling
      const messageBubble = container.querySelector('.bg-gray-600')
      expect(messageBubble).toBeTruthy()
    })
  })

  describe('Multimodal Content Integration', () => {
    it('handles multimodal content with persona theming', () => {
      renderWithContext(<UserMessage message={multimodalMessage} />, 'elev')
      
      // Check text content
      expect(screen.getByText('Ce vezi în această imagine?')).toBeTruthy()
      
      // Check image content
      const image = screen.getByAltText('Uploaded content')
      expect(image).toBeTruthy()
      expect(image.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
      
      // Check avatar
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('elev')
    })
  })

  describe('Romanian Locale Integration', () => {
    it('displays Romanian text content correctly', () => {
      renderWithContext(<UserMessage message={textMessage} />, 'elev')
      
      expect(screen.getByText('Poți să mă ajuți cu matematica?')).toBeTruthy()
    })

    it('formats time in Romanian locale', () => {
      renderWithContext(<UserMessage message={textMessage} />, 'elev')
      
      // Should display time in HH:MM format
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeTruthy()
    })
  })

  describe('Accessibility Integration', () => {
    it('maintains accessibility standards from onboarding system', () => {
      const { container } = renderWithContext(<UserMessage message={multimodalMessage} />, 'elev')
      
      // Check image alt text
      const image = screen.getByAltText('Uploaded content')
      expect(image).toBeTruthy()
      
      // Check semantic structure
      const messageContainer = container.querySelector('.flex.justify-end')
      expect(messageContainer).toBeTruthy()
      
      // Check avatar accessibility
      const avatar = screen.getByTestId('avatar')
      expect(avatar).toBeTruthy()
    })
  })

  describe('Responsive Design Integration', () => {
    it('applies responsive classes correctly', () => {
      const { container } = renderWithContext(<UserMessage message={textMessage} />, 'elev')
      
      // Check max-width constraint for mobile
      const messageContent = container.querySelector('.max-w-\\[80\\%\\]')
      expect(messageContent).toBeTruthy()
      
      // Check image responsive classes
      renderWithContext(<UserMessage message={multimodalMessage} />, 'elev')
      const image = screen.getByAltText('Uploaded content')
      expect(image.className).toContain('max-w-full')
    })
  })
})