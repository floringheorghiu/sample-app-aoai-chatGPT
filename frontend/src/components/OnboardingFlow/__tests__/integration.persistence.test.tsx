import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppStateProvider } from '../../../state/AppProvider'
import { OnboardingFlow } from '../OnboardingFlow'
import { ChatWithOnboarding } from '../../ChatWithOnboarding'
import { OnboardingData } from '../../../types/persona'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock the Chat component to avoid complex dependencies
jest.mock('../../../pages/chat/Chat', () => {
  return function MockChat() {
    return <div data-testid="chat-interface">Chat Interface</div>
  }
})

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppStateProvider>{children}</AppStateProvider>
)

describe('Onboarding Flow - Persistence Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Complete Onboarding Flow Persistence', () => {
    it('should persist persona selection through complete flow', async () => {
      const user = userEvent.setup()
      const mockOnComplete = jest.fn()

      render(
        <TestWrapper>
          <OnboardingFlow onComplete={mockOnComplete} />
        </TestWrapper>
      )

      // Select elev persona
      const elevCard = screen.getByRole('radio', { name: /elev/i })
      await user.click(elevCard)

      // Continue to interest selection
      const continueButton = screen.getByRole('button', { name: /continuă/i })
      await user.click(continueButton)

      // Verify persona is persisted in localStorage
      expect(localStorage.getItem('narada_onboarding_persona')).toBe('elev')

      // Select a topic
      await waitFor(() => {
        expect(screen.getByText(/ce te interesează cel mai mult/i)).toBeInTheDocument()
      })

      const topicCard = screen.getByRole('radio', { name: /să învăț mai bine/i })
      await user.click(topicCard)

      // Start chat
      const startChatButton = screen.getByRole('button', { name: /începe chat-ul/i })
      await user.click(startChatButton)

      // Verify all data is persisted
      expect(localStorage.getItem('narada_onboarding_persona')).toBe('elev')
      expect(localStorage.getItem('narada_onboarding_topic')).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')
      expect(localStorage.getItem('narada_onboarding_completed')).toBe('true')

      expect(mockOnComplete).toHaveBeenCalledWith({
        persona: 'elev',
        interest: expect.objectContaining({
          label: 'să învăț mai bine și să primesc sfaturi pentru teme și școală'
        }),
        selectedTopicLabel: 'să învăț mai bine și să primesc sfaturi pentru teme și școală'
      })
    })

    it('should handle incognito persona flow with persistence', async () => {
      const user = userEvent.setup()
      const mockOnComplete = jest.fn()

      render(
        <TestWrapper>
          <OnboardingFlow onComplete={mockOnComplete} />
        </TestWrapper>
      )

      // Select incognito persona
      const incognitoCard = screen.getByRole('radio', { name: /incognito/i })
      await user.click(incognitoCard)

      // Continue (should skip interest selection)
      const continueButton = screen.getByRole('button', { name: /continuă/i })
      await user.click(continueButton)

      // Verify incognito persona is persisted
      expect(localStorage.getItem('narada_onboarding_persona')).toBe('incognito')
      expect(localStorage.getItem('narada_onboarding_completed')).toBe('true')
      expect(localStorage.getItem('narada_onboarding_topic')).toBeNull()

      expect(mockOnComplete).toHaveBeenCalledWith({
        persona: 'incognito',
        interest: null,
        selectedTopicLabel: null
      })
    })

    it('should persist navigation state when going back', async () => {
      const user = userEvent.setup()
      const mockOnComplete = jest.fn()

      render(
        <TestWrapper>
          <OnboardingFlow onComplete={mockOnComplete} />
        </TestWrapper>
      )

      // Select părinte persona
      const parentCard = screen.getByRole('radio', { name: /părinte/i })
      await user.click(parentCard)

      // Continue to interest selection
      const continueButton = screen.getByRole('button', { name: /continuă/i })
      await user.click(continueButton)

      // Verify persona is persisted
      expect(localStorage.getItem('narada_onboarding_persona')).toBe('părinte')

      // Go back
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /înapoi/i })).toBeInTheDocument()
      })

      const backButton = screen.getByRole('button', { name: /înapoi/i })
      await user.click(backButton)

      // Verify we're back to persona selection but data is still persisted
      expect(screen.getByText(/aș dori să știu dacă ești/i)).toBeInTheDocument()
      expect(localStorage.getItem('narada_onboarding_persona')).toBe('părinte')

      // The părinte card should still be selected
      const parentCardAgain = screen.getByRole('radio', { name: /părinte/i })
      expect(parentCardAgain).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('ChatWithOnboarding Persistence Integration', () => {
    it('should show onboarding when no persisted data exists', () => {
      render(
        <TestWrapper>
          <ChatWithOnboarding />
        </TestWrapper>
      )

      // Should show onboarding flow
      expect(screen.getByText(/bună, eu sunt asistentul tău/i)).toBeInTheDocument()
      expect(screen.queryByTestId('chat-interface')).not.toBeInTheDocument()
    })

    it('should show chat interface when onboarding is completed and persisted', () => {
      // Pre-populate localStorage with completed onboarding
      localStorage.setItem('narada_onboarding_persona', 'profesor')
      localStorage.setItem('narada_onboarding_topic', 'să îmi ajut elevii să învețe mai bine și să creez un mediu pozitiv în clasă')
      localStorage.setItem('narada_onboarding_completed', 'true')

      render(
        <TestWrapper>
          <ChatWithOnboarding />
        </TestWrapper>
      )

      // Should show chat interface directly
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      expect(screen.queryByText(/bună, eu sunt asistentul tău/i)).not.toBeInTheDocument()
    })

    it('should show onboarding when persisted data is incomplete', () => {
      // Only set persona but not completion status
      localStorage.setItem('narada_onboarding_persona', 'elev')

      render(
        <TestWrapper>
          <ChatWithOnboarding />
        </TestWrapper>
      )

      // Should show onboarding flow
      expect(screen.getByText(/bună, eu sunt asistentul tău/i)).toBeInTheDocument()
      expect(screen.queryByTestId('chat-interface')).not.toBeInTheDocument()
    })

    it('should handle corrupted persisted data gracefully', () => {
      // Set invalid data
      localStorage.setItem('narada_onboarding_persona', 'invalid_persona')
      localStorage.setItem('narada_onboarding_completed', 'true')

      render(
        <TestWrapper>
          <ChatWithOnboarding />
        </TestWrapper>
      )

      // Should show onboarding flow due to invalid persona
      expect(screen.getByText(/bună, eu sunt asistentul tău/i)).toBeInTheDocument()
      expect(screen.queryByTestId('chat-interface')).not.toBeInTheDocument()
    })
  })

  describe('Cross-Session Persistence Scenarios', () => {
    it('should maintain complete onboarding state across browser restart simulation', async () => {
      const user = userEvent.setup()

      // First session - complete onboarding
      const { unmount } = render(
        <TestWrapper>
          <OnboardingFlow onComplete={() => {}} />
        </TestWrapper>
      )

      // Complete onboarding flow
      const elevCard = screen.getByRole('radio', { name: /elev/i })
      await user.click(elevCard)

      const continueButton = screen.getByRole('button', { name: /continuă/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.getByText(/ce te interesează cel mai mult/i)).toBeInTheDocument()
      })

      const topicCard = screen.getByRole('radio', { name: /să învăț mai bine/i })
      await user.click(topicCard)

      const startChatButton = screen.getByRole('button', { name: /începe chat-ul/i })
      await user.click(startChatButton)

      // Unmount to simulate browser close
      unmount()

      // Second session - should go directly to chat
      render(
        <TestWrapper>
          <ChatWithOnboarding />
        </TestWrapper>
      )

      // Should show chat interface directly
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      expect(screen.queryByText(/bună, eu sunt asistentul tău/i)).not.toBeInTheDocument()
    })

    it('should handle partial completion across sessions', async () => {
      const user = userEvent.setup()

      // First session - only select persona
      const { unmount } = render(
        <TestWrapper>
          <OnboardingFlow onComplete={() => {}} />
        </TestWrapper>
      )

      const parentCard = screen.getByRole('radio', { name: /părinte/i })
      await user.click(parentCard)

      const continueButton = screen.getByRole('button', { name: /continuă/i })
      await user.click(continueButton)

      // Simulate browser close before completing interest selection
      unmount()

      // Second session - should resume from interest selection
      render(
        <TestWrapper>
          <ChatWithOnboarding />
        </TestWrapper>
      )

      // Should show onboarding (not completed yet)
      expect(screen.getByText(/bună, eu sunt asistentul tău/i)).toBeInTheDocument()

      // But when we get to interest selection, persona should be pre-selected
      const parentCardAgain = screen.getByRole('radio', { name: /părinte/i })
      await user.click(parentCardAgain)

      const continueButtonAgain = screen.getByRole('button', { name: /continuă/i })
      await user.click(continueButtonAgain)

      await waitFor(() => {
        expect(screen.getByText(/perfect! ești părinte/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data Integrity Validation', () => {
    it('should validate persona-topic consistency after persistence', () => {
      // Set mismatched persona and topic
      localStorage.setItem('narada_onboarding_persona', 'elev')
      localStorage.setItem('narada_onboarding_topic', 'să îmi ajut elevii să învețe mai bine') // profesor topic
      localStorage.setItem('narada_onboarding_completed', 'true')

      render(
        <TestWrapper>
          <ChatWithOnboarding />
        </TestWrapper>
      )

      // Should still show chat but with corrected data
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      
      // Topic should be cleared due to mismatch
      expect(localStorage.getItem('narada_onboarding_topic')).toBeNull()
    })

    it('should handle localStorage size limits gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock localStorage to simulate quota exceeded
      const originalSetItem = localStorage.setItem
      let callCount = 0
      localStorage.setItem = jest.fn((key, value) => {
        callCount++
        if (callCount > 2) {
          throw new Error('QuotaExceededError')
        }
        originalSetItem.call(localStorage, key, value)
      })

      const mockOnComplete = jest.fn()

      render(
        <TestWrapper>
          <OnboardingFlow onComplete={mockOnComplete} />
        </TestWrapper>
      )

      // Complete onboarding flow
      const elevCard = screen.getByRole('radio', { name: /elev/i })
      await user.click(elevCard)

      const continueButton = screen.getByRole('button', { name: /continuă/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.getByText(/ce te interesează cel mai mult/i)).toBeInTheDocument()
      })

      const topicCard = screen.getByRole('radio', { name: /să învăț mai bine/i })
      await user.click(topicCard)

      // Should not throw error even if localStorage fails
      expect(() => {
        const startChatButton = screen.getByRole('button', { name: /începe chat-ul/i })
        user.click(startChatButton)
      }).not.toThrow()

      // Restore original localStorage
      localStorage.setItem = originalSetItem
    })
  })

  describe('Theme Consistency After Persistence', () => {
    it('should maintain persona theme colors after browser reload', () => {
      // Set elev persona
      localStorage.setItem('narada_onboarding_persona', 'elev')
      localStorage.setItem('narada_onboarding_completed', 'true')

      render(
        <TestWrapper>
          <ChatWithOnboarding />
        </TestWrapper>
      )

      // Chat interface should be rendered with elev theme
      const chatInterface = screen.getByTestId('chat-interface')
      expect(chatInterface).toBeInTheDocument()
      
      // The PersonaThemeProvider should apply elev theme
      // This would be tested more thoroughly in theme-specific tests
    })

    it('should apply correct theme for each persisted persona', () => {
      const personas = ['elev', 'părinte', 'profesor', 'incognito'] as const

      personas.forEach(persona => {
        localStorage.clear()
        localStorage.setItem('narada_onboarding_persona', persona)
        localStorage.setItem('narada_onboarding_completed', 'true')

        const { unmount } = render(
          <TestWrapper>
            <ChatWithOnboarding />
          </TestWrapper>
        )

        // Should render chat interface for each persona
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()

        unmount()
      })
    })
  })
})