import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useOnboardingState } from '../useOnboardingState'
import { AppStateProvider } from '../../state/AppProvider'
import { Persona } from '../../types/persona'
import { QuickQuestionTopic } from '../../config/quickQuestions'

// Mock data
const mockTopic: QuickQuestionTopic = {
  label: "să învăț mai bine și să primesc sfaturi pentru teme și școală",
  questions: [
    "Am o temă grea. Cum pot să-mi ușurez munca?",
    "Cum învăț mai eficient pentru un test important?",
    "Ce pot face când mă plictisesc la ore?"
  ]
}

const mockParentTopic: QuickQuestionTopic = {
  label: "să îmi ajut copilul la școală cu sfaturi pentru teme și obiceiuri bune acasă",
  questions: [
    "Cum pot face temele mai ușor de suportat pentru copilul meu?",
    "Ce rutine zilnice pot ajuta la învățare?",
    "Ce fac dacă copilul meu nu vrea să învețe?"
  ]
}

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppStateProvider>{children}</AppStateProvider>
)

describe('useOnboardingState', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      expect(result.current.state.currentPersona).toBeNull()
      expect(result.current.state.selectedTopic).toBeNull()
      expect(result.current.state.selectedTopicLabel).toBeNull()
      expect(result.current.state.onboardingCompleted).toBe(false)
      expect(result.current.state.availableTopics).toEqual([])
      expect(result.current.state.onboardingContext).toBeNull()
      expect(result.current.state.warmUpPrompt).toBeNull()
      expect(result.current.state.quickQuestions).toEqual([])
      expect(result.current.state.personaGreeting).toBeNull()
    })

    it('should provide all required actions', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      const { actions } = result.current
      expect(typeof actions.setPersona).toBe('function')
      expect(typeof actions.setTopic).toBe('function')
      expect(typeof actions.setTopicByLabel).toBe('function')
      expect(typeof actions.completeOnboarding).toBe('function')
      expect(typeof actions.resetOnboarding).toBe('function')
      expect(typeof actions.generateContext).toBe('function')
      expect(typeof actions.generateWarmUpPromptForCurrent).toBe('function')
      expect(typeof actions.getQuickQuestionsForCurrent).toBe('function')
      expect(typeof actions.canCompleteOnboarding).toBe('function')
      expect(typeof actions.isPersonaSelected).toBe('function')
      expect(typeof actions.isTopicSelected).toBe('function')
    })
  })

  describe('persona selection', () => {
    it('should set persona and update available topics', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      expect(result.current.state.currentPersona).toBe('elev')
      expect(result.current.state.availableTopics.length).toBeGreaterThan(0)
      expect(result.current.state.personaGreeting).toContain('Salut')
      expect(result.current.actions.isPersonaSelected()).toBe(true)
      expect(result.current.actions.canCompleteOnboarding()).toBe(true)
    })

    it('should generate basic warm-up prompt without topic', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      expect(result.current.state.warmUpPrompt).toContain('elev')
      expect(result.current.state.warmUpPrompt).toContain('Romanian')
    })

    it('should reset topic when persona changes', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      // Set persona and topic
      act(() => {
        result.current.actions.setPersona('elev')
      })
      
      act(() => {
        result.current.actions.setTopic(mockTopic)
      })

      expect(result.current.state.selectedTopic).toStrictEqual(mockTopic)

      // Change persona
      act(() => {
        result.current.actions.setPersona('părinte')
      })

      expect(result.current.state.selectedTopic).toBeNull()
      expect(result.current.state.currentPersona).toBe('părinte')
    })
  })

  describe('topic selection', () => {
    beforeEach(() => {
      // Helper to set up persona before each test
    })

    it('should set topic and generate context', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.setTopic(mockTopic)
      })

      expect(result.current.state.selectedTopic).toStrictEqual(mockTopic)
      expect(result.current.state.selectedTopicLabel).toBe(mockTopic.label)
      expect(result.current.state.quickQuestions).toEqual(mockTopic.questions)
      expect(result.current.actions.isTopicSelected()).toBe(true)
    })

    it('should set topic by label', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.setTopicByLabel(mockTopic.label)
      })

      expect(result.current.state.selectedTopic?.label).toBe(mockTopic.label)
      expect(result.current.state.quickQuestions).toEqual(mockTopic.questions)
    })

    it('should generate enhanced warm-up prompt with topic', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.setTopic(mockTopic)
      })

      const warmUpPrompt = result.current.state.warmUpPrompt
      expect(warmUpPrompt).toContain('student')
      expect(warmUpPrompt).toContain(mockTopic.label)
      expect(warmUpPrompt).toContain('Romanian')
    })

    it('should handle invalid topic label gracefully', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.setTopicByLabel('invalid topic label')
      })

      expect(result.current.state.selectedTopic).toBeNull()
      expect(result.current.actions.isTopicSelected()).toBe(false)
    })
  })

  describe('context generation', () => {
    it('should generate complete onboarding context', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.setTopic(mockTopic)
      })

      const context = result.current.actions.generateContext()
      expect(context).not.toBeNull()
      expect(context?.persona).toBe('elev')
      expect(context?.selectedTopic).toStrictEqual(mockTopic)
      expect(context?.quickQuestions).toEqual(mockTopic.questions)
      expect(context?.warmUpPrompt).toContain('student')
    })

    it('should generate context without topic', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      const context = result.current.actions.generateContext()
      expect(context).not.toBeNull()
      expect(context?.persona).toBe('elev')
      expect(context?.selectedTopic).toBeNull()
      expect(context?.quickQuestions).toEqual([])
    })

    it('should return null context when no persona selected', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      const context = result.current.actions.generateContext()
      expect(context).toBeNull()
    })

    it('should generate warm-up prompt for current selection', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('părinte')
      })

      act(() => {
        result.current.actions.setTopic(mockParentTopic)
      })

      const prompt = result.current.actions.generateWarmUpPromptForCurrent()
      expect(prompt).toContain('parent')
      expect(prompt).toContain(mockParentTopic.label)
      expect(prompt).toContain('Romanian')
    })

    it('should get quick questions for current selection', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.setTopic(mockTopic)
      })

      const questions = result.current.actions.getQuickQuestionsForCurrent()
      expect(questions).toEqual(mockTopic.questions)
    })
  })

  describe('onboarding completion', () => {
    it('should complete onboarding', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.completeOnboarding()
      })

      expect(result.current.state.onboardingCompleted).toBe(true)
    })

    it('should reset onboarding', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      // Set up some state
      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.setTopic(mockTopic)
      })

      act(() => {
        result.current.actions.completeOnboarding()
      })

      // Reset
      act(() => {
        result.current.actions.resetOnboarding()
      })

      expect(result.current.state.currentPersona).toBeNull()
      expect(result.current.state.selectedTopic).toBeNull()
      expect(result.current.state.onboardingCompleted).toBe(false)
      expect(result.current.state.onboardingContext).toBeNull()
    })

    it('should check if onboarding can be completed', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      // Initially cannot complete
      expect(result.current.actions.canCompleteOnboarding()).toBe(false)

      // Can complete after persona selection
      act(() => {
        result.current.actions.setPersona('elev')
      })

      expect(result.current.actions.canCompleteOnboarding()).toBe(true)
    })
  })

  describe('persona-specific behavior', () => {
    it('should handle elev persona correctly', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      expect(result.current.state.personaGreeting).toContain('Salut')
      expect(result.current.state.availableTopics.length).toBe(4) // Should have 4 topics
      expect(result.current.state.warmUpPrompt).toContain('elev')
    })

    it('should handle părinte persona correctly', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('părinte')
      })

      expect(result.current.state.personaGreeting).toContain('copilul tău')
      expect(result.current.state.availableTopics.length).toBe(4) // Should have 4 topics
      expect(result.current.state.warmUpPrompt).toContain('părinte')
    })

    it('should handle profesor persona correctly', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('profesor')
      })

      expect(result.current.state.personaGreeting).toContain('educațională')
      expect(result.current.state.availableTopics.length).toBe(4) // Should have 4 topics
      expect(result.current.state.warmUpPrompt).toContain('profesor')
    })

    it('should handle incognito persona correctly', () => {
      const { result } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('incognito')
      })

      expect(result.current.state.personaGreeting).not.toContain('școala')
      expect(result.current.state.availableTopics.length).toBe(0) // Incognito has no topics
      expect(result.current.state.warmUpPrompt).toContain('incognito')
    })
  })

  describe('error handling', () => {
    it('should throw error when used outside AppStateProvider', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        renderHook(() => useOnboardingState())
      }).toThrow('useOnboardingState must be used within AppStateProvider')
      
      consoleSpy.mockRestore()
    })
  })

  describe('memoization and performance', () => {
    it('should memoize available topics based on persona', () => {
      const { result, rerender } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      const firstTopics = result.current.state.availableTopics
      
      // Rerender without changing persona
      rerender()
      
      expect(result.current.state.availableTopics).toBe(firstTopics) // Same reference
    })

    it('should memoize onboarding context', () => {
      const { result, rerender } = renderHook(() => useOnboardingState(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.actions.setPersona('elev')
      })

      act(() => {
        result.current.actions.setTopic(mockTopic)
      })

      const firstContext = result.current.state.onboardingContext
      
      // Rerender without changing state
      rerender()
      
      expect(result.current.state.onboardingContext).toBe(firstContext) // Same reference
    })
  })
})