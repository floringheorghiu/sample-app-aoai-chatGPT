import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { AppStateProvider } from '../../state/AppProvider'
import { useOnboardingState } from '../useOnboardingState'
import { Persona } from '../../types/persona'

// Mock the API calls to prevent interference with tests
jest.mock('../../api', () => ({
  ...jest.requireActual('../../api'),
  historyEnsure: jest.fn().mockResolvedValue({ cosmosDB: false }),
  historyList: jest.fn().mockResolvedValue([]),
  frontendSettings: jest.fn().mockResolvedValue({})
}))

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

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppStateProvider>{children}</AppStateProvider>
)

describe('useOnboardingState - Persistence Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Persona Data Persistence', () => {
    it('should store persona selection in localStorage', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      expect(localStorage.getItem('narada_onboarding_persona')).toBe('elev')
      expect(result.current.state.currentPersona).toBe('elev')
    })

    it('should retrieve persona from localStorage on initialization', () => {
      // Pre-populate localStorage
      localStorage.setItem('narada_onboarding_persona', 'părinte')
      localStorage.setItem('narada_onboarding_completed', 'true')

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      expect(result.current.state.currentPersona).toBe('părinte')
      expect(result.current.state.onboardingCompleted).toBe(true)
    })

    it('should store topic selection in localStorage', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.setTopicByLabel('să învăț mai bine și să primesc sfaturi pentru teme și școală')
      })

      const storedTopic = localStorage.getItem('narada_onboarding_topic')
      expect(storedTopic).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')
      expect(result.current.state.selectedTopicLabel).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')
    })

    it('should store onboarding completion status', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('profesor')
      })

      act(() => {
        result.current.actions.completeOnboarding()
      })

      expect(localStorage.getItem('narada_onboarding_completed')).toBe('true')
      expect(result.current.state.onboardingCompleted).toBe(true)
    })

    it('should clear localStorage when onboarding is reset', () => {
      // Pre-populate localStorage
      localStorage.setItem('narada_onboarding_persona', 'elev')
      localStorage.setItem('narada_onboarding_topic', 'test topic')
      localStorage.setItem('narada_onboarding_completed', 'true')

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.resetOnboarding()
      })

      expect(localStorage.getItem('narada_onboarding_persona')).toBeNull()
      expect(localStorage.getItem('narada_onboarding_topic')).toBeNull()
      expect(localStorage.getItem('narada_onboarding_completed')).toBeNull()
      expect(result.current.state.currentPersona).toBeNull()
      expect(result.current.state.onboardingCompleted).toBe(false)
    })
  })

  describe('Cross-Session Persistence', () => {
    it('should maintain persona selection across browser sessions', () => {
      // Simulate first session
      const { result: firstSession } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        firstSession.current.actions.setPersona('părinte')
        firstSession.current.actions.setTopicByLabel('să îmi ajut copilul la școală cu sfaturi pentru teme și obiceiuri bune acasă')
        firstSession.current.actions.completeOnboarding()
      })

      // Simulate second session (new hook instance)
      const { result: secondSession } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      expect(secondSession.current.state.currentPersona).toBe('părinte')
      expect(secondSession.current.state.selectedTopicLabel).toBe('să îmi ajut copilul la școală cu sfaturi pentru teme și obiceiuri bune acasă')
      expect(secondSession.current.state.onboardingCompleted).toBe(true)
    })

    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid data in localStorage
      localStorage.setItem('narada_onboarding_persona', 'invalid_persona')
      localStorage.setItem('narada_onboarding_completed', 'not_a_boolean')

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      // Should fallback to default values
      expect(result.current.state.currentPersona).toBeNull()
      expect(result.current.state.onboardingCompleted).toBe(false)
    })

    it('should handle missing localStorage gracefully', () => {
      // Mock localStorage to throw errors
      const originalGetItem = localStorage.getItem
      localStorage.getItem = jest.fn(() => {
        throw new Error('localStorage not available')
      })

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      expect(result.current.state.currentPersona).toBeNull()
      expect(result.current.state.onboardingCompleted).toBe(false)

      // Restore original localStorage
      localStorage.getItem = originalGetItem
    })
  })

  describe('Data Validation', () => {
    it('should validate persona values before storing', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      const validPersonas: Persona[] = ['elev', 'părinte', 'profesor', 'incognito']
      
      validPersonas.forEach(persona => {
        act(() => {
          result.current.actions.setPersona(persona)
        })
        
        expect(localStorage.getItem('narada_onboarding_persona')).toBe(persona)
        expect(result.current.state.currentPersona).toBe(persona)
      })
    })

    it('should validate topic labels against available topics', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      // Valid topic for elev persona
      act(() => {
        result.current.actions.setTopicByLabel('să învăț mai bine și să primesc sfaturi pentru teme și școală')
      })

      expect(result.current.state.selectedTopicLabel).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')

      // Invalid topic should not be set
      act(() => {
        result.current.actions.setTopicByLabel('invalid topic')
      })

      // Should still have the previous valid topic
      expect(result.current.state.selectedTopicLabel).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')
    })
  })

  describe('Theme Persistence', () => {
    it('should maintain persona theme consistency after reload', () => {
      // Set persona and complete onboarding
      localStorage.setItem('narada_onboarding_persona', 'elev')
      localStorage.setItem('narada_onboarding_completed', 'true')

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      expect(result.current.state.currentPersona).toBe('elev')
      
      // Generate context to verify theme consistency
      const context = result.current.actions.generateContext()
      expect(context?.persona).toBe('elev')
    })

    it('should generate consistent warm-up prompts after persistence', () => {
      localStorage.setItem('narada_onboarding_persona', 'profesor')
      localStorage.setItem('narada_onboarding_topic', 'să îmi ajut elevii să învețe mai bine și să creez un mediu pozitiv în clasă')
      localStorage.setItem('narada_onboarding_completed', 'true')

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      const warmUpPrompt = result.current.actions.generateWarmUpPromptForCurrent()
      expect(warmUpPrompt).toContain('profesor')
      expect(warmUpPrompt).toContain('să îmi ajut elevii să învețe mai bine și să creez un mediu pozitiv în clasă')
    })
  })

  describe('Quick Questions Persistence', () => {
    it('should maintain quick questions after browser reload', () => {
      localStorage.setItem('narada_onboarding_persona', 'părinte')
      localStorage.setItem('narada_onboarding_topic', 'să îmi ajut copilul la școală cu sfaturi pentru teme și obiceiuri bune acasă')
      localStorage.setItem('narada_onboarding_completed', 'true')

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      const quickQuestions = result.current.actions.getQuickQuestionsForCurrent()
      expect(quickQuestions).toHaveLength(3)
      expect(quickQuestions[0]).toContain('copilul meu')
    })

    it('should return empty array for quick questions when no topic is selected', () => {
      localStorage.setItem('narada_onboarding_persona', 'incognito')
      localStorage.setItem('narada_onboarding_completed', 'true')

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      const quickQuestions = result.current.actions.getQuickQuestionsForCurrent()
      expect(quickQuestions).toHaveLength(0)
    })
  })

  describe('Error Recovery', () => {
    it('should recover from partial data corruption', () => {
      // Set valid persona but corrupted topic
      localStorage.setItem('narada_onboarding_persona', 'elev')
      localStorage.setItem('narada_onboarding_topic', 'corrupted_topic_data')
      localStorage.setItem('narada_onboarding_completed', 'true')

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      expect(result.current.state.currentPersona).toBe('elev')
      expect(result.current.state.onboardingCompleted).toBe(true)
      // Topic should be null due to corruption
      expect(result.current.state.selectedTopicLabel).toBeNull()
    })

    it('should handle localStorage quota exceeded gracefully', () => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError')
      })

      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      // Should not throw error when trying to persist
      expect(() => {
        act(() => {
          result.current.actions.setPersona('elev')
        })
      }).not.toThrow()

      // Restore original localStorage
      localStorage.setItem = originalSetItem
    })
  })
})