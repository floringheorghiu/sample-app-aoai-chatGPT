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
      Avatar
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

describe('UserMessage', () => {
  const baseMessage: ChatMessage = {
    id: 'test-message-1',
    role: 'user',
    content: 'Test message content',
    date: '2024-01-15T10:30:00Z'
  }

  const multimodalMessage: ChatMessage = {
    id: 'test-message-2',
    role: 'user',
    content: [
      { type: 'text', text: 'Here is an image I want to ask about' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' } }
    ] as any,
    date: '2024-01-15T10:35:00Z'
  }

  describe('Basic Rendering', () => {
    it('renders text-only message correctly', () => {
      renderWithContext(<UserMessage message={baseMessage} />)
      
      expect(screen.getByText('Test message content')).toBeTruthy()
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeTruthy()
      expect(screen.getByTestId('avatar')).toBeTruthy()
    })

    it('renders multimodal message with text and image', () => {
      renderWithContext(<UserMessage message={multimodalMessage} />)
      
      expect(screen.getByText('Here is an image I want to ask about')).toBeTruthy()
      expect(screen.getByAltText('Uploaded content')).toBeTruthy()
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeTruthy()
    })

    it('handles empty content gracefully', () => {
      const emptyMessage = { ...baseMessage, content: '' }
      renderWithContext(<UserMessage message={emptyMessage} />)
      
      expect(screen.getByTestId('avatar')).toBeTruthy()
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeTruthy()
    })
  })

  describe('Persona Integration', () => {
    it('renders with elev persona', () => {
      renderWithContext(<UserMessage message={baseMessage} />, 'elev')
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('elev')
      expect(avatar.getAttribute('data-type')).toBe('user')
    })

    it('renders with părinte persona', () => {
      renderWithContext(<UserMessage message={baseMessage} />, 'părinte')
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('părinte')
    })

    it('renders with profesor persona', () => {
      renderWithContext(<UserMessage message={baseMessage} />, 'profesor')
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('profesor')
    })

    it('renders with incognito persona', () => {
      renderWithContext(<UserMessage message={baseMessage} />, 'incognito')
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('incognito')
    })

    it('defaults to incognito when no persona is set', () => {
      renderWithContext(<UserMessage message={baseMessage} />, null)
      
      const avatar = screen.getByTestId('avatar')
      expect(avatar.getAttribute('data-persona')).toBe('incognito')
    })
  })

  describe('Multimodal Content Handling', () => {
    it('displays both text and image for multimodal content', () => {
      renderWithContext(<UserMessage message={multimodalMessage} />)
      
      const textElement = screen.getByText('Here is an image I want to ask about')
      const imageElement = screen.getByAltText('Uploaded content')
      
      expect(textElement).toBeTruthy()
      expect(imageElement).toBeTruthy()
      expect(imageElement.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    })

    it('handles image-only content', () => {
      const imageOnlyMessage: ChatMessage = {
        ...baseMessage,
        content: [
          { type: 'image_url', image_url: { url: 'data:image/png;base64,test' } }
        ] as any
      }
      
      renderWithContext(<UserMessage message={imageOnlyMessage} />)
      
      const imageElement = screen.getByAltText('Uploaded content')
      expect(imageElement).toBeTruthy()
      expect(imageElement.getAttribute('src')).toBe('data:image/png;base64,test')
    })

    it('handles malformed multimodal content gracefully', () => {
      const malformedMessage: ChatMessage = {
        ...baseMessage,
        content: [
          { type: 'unknown', text: 'This should not crash' }
        ] as any
      }
      
      renderWithContext(<UserMessage message={malformedMessage} />)
      
      // Should still render the component without crashing
      expect(screen.getByTestId('avatar')).toBeTruthy()
    })
  })

  describe('Styling and Layout', () => {
    it('applies custom className', () => {
      const { container } = renderWithContext(
        <UserMessage message={baseMessage} className="custom-class" />
      )
      
      expect((container.firstChild as HTMLElement)?.className).toContain('custom-class')
    })

    it('preserves whitespace in text content', () => {
      const messageWithWhitespace = {
        ...baseMessage,
        content: 'Line 1\nLine 2\n\nLine 4'
      }
      
      renderWithContext(<UserMessage message={messageWithWhitespace} />)
      
      const textElement = screen.getByText((content, element) => {
        return element?.textContent === 'Line 1\nLine 2\n\nLine 4' && element?.className?.includes('whitespace-pre-wrap')
      })
      expect(textElement.className).toContain('whitespace-pre-wrap')
    })

    it('applies proper image styling', () => {
      renderWithContext(<UserMessage message={multimodalMessage} />)
      
      const imageElement = screen.getByAltText('Uploaded content') as HTMLImageElement
      expect(imageElement.style.maxHeight).toBe('200px')
      expect(imageElement.style.objectFit).toBe('contain')
      expect(imageElement.className).toContain('max-w-full')
    })
  })

  describe('Time Formatting', () => {
    it('formats time correctly for Romanian locale', () => {
      const messageWithSpecificTime: ChatMessage = {
        ...baseMessage,
        date: '2024-01-15T14:25:30Z'
      }
      
      renderWithContext(<UserMessage message={messageWithSpecificTime} />)
      
      // Time should be formatted as HH:MM in Romanian locale
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('provides proper alt text for images', () => {
      renderWithContext(<UserMessage message={multimodalMessage} />)
      
      const imageElement = screen.getByAltText('Uploaded content')
      expect(imageElement).toBeTruthy()
    })

    it('maintains proper semantic structure', () => {
      const { container } = renderWithContext(<UserMessage message={baseMessage} />)
      
      // Should have proper flex layout structure
      const messageContainer = container.querySelector('.flex.justify-end')
      expect(messageContainer).toBeTruthy()
    })
  })
})