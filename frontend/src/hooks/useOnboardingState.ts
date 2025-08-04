import { useContext, useCallback, useMemo } from 'react'
import { AppStateContext } from '../state/AppProvider'
import { Persona } from '../types/persona'
import { QuickQuestionTopic, getTopicsForPersona } from '../config/quickQuestions'
import { 
  OnboardingContext, 
  createOnboardingContext, 
  generateWarmUpPrompt,
  getPersonaGreeting 
} from '../utils/onboardingContext'

export interface OnboardingState {
  // Current state
  currentPersona: Persona | null
  selectedTopic: QuickQuestionTopic | null
  selectedTopicLabel: string | null
  onboardingCompleted: boolean
  
  // Available data
  availableTopics: QuickQuestionTopic[]
  
  // Generated context
  onboardingContext: OnboardingContext | null
  warmUpPrompt: string | null
  quickQuestions: string[]
  personaGreeting: string | null
}

export interface OnboardingActions {
  // Basic actions
  setPersona: (persona: Persona) => void
  setTopic: (topic: QuickQuestionTopic) => void
  setTopicByLabel: (topicLabel: string) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
  
  // Context generation
  generateContext: () => OnboardingContext | null
  generateWarmUpPromptForCurrent: () => string | null
  getQuickQuestionsForCurrent: () => string[]
  
  // Utility functions
  canCompleteOnboarding: () => boolean
  isPersonaSelected: () => boolean
  isTopicSelected: () => boolean
}

export interface UseOnboardingStateReturn {
  state: OnboardingState
  actions: OnboardingActions
}

/**
 * Enhanced onboarding state management hook
 * Integrates with existing AppProvider and provides context generation for OpenAI
 */
export const useOnboardingState = (): UseOnboardingStateReturn => {
  const context = useContext(AppStateContext)
  
  if (!context) {
    throw new Error('useOnboardingState must be used within AppStateProvider')
  }
  
  const { state, dispatch } = context
  
  // Memoized available topics based on current persona
  const availableTopics = useMemo(() => {
    if (!state.currentPersona) return []
    return getTopicsForPersona(state.currentPersona)
  }, [state.currentPersona])
  
  // Find selected topic object from label
  const selectedTopic = useMemo(() => {
    if (!state.selectedInterest?.label || !availableTopics.length) return null
    return availableTopics.find(topic => topic.label === state.selectedInterest?.label) || null
  }, [state.selectedInterest?.label, availableTopics])
  
  // Generate onboarding context
  const onboardingContext = useMemo(() => {
    if (!state.currentPersona) return null
    return createOnboardingContext(state.currentPersona, selectedTopic)
  }, [state.currentPersona, selectedTopic])
  
  // Generate warm-up prompt
  const warmUpPrompt = useMemo(() => {
    if (!state.currentPersona) return null
    if (!selectedTopic) {
      // Generate basic prompt without topic
      return `You are about to engage in a conversation with a ${state.currentPersona}. Please provide helpful, age-appropriate responses in Romanian.`
    }
    return generateWarmUpPrompt(state.currentPersona, selectedTopic.label)
  }, [state.currentPersona, selectedTopic])
  
  // Get quick questions for current selection
  const quickQuestions = useMemo(() => {
    return selectedTopic ? selectedTopic.questions : []
  }, [selectedTopic])
  
  // Get persona greeting
  const personaGreeting = useMemo(() => {
    if (!state.currentPersona) return null
    return getPersonaGreeting(state.currentPersona)
  }, [state.currentPersona])
  
  // Actions
  const setPersona = useCallback((persona: Persona) => {
    dispatch({ type: 'SET_PERSONA', payload: persona })
  }, [dispatch])
  
  const setTopic = useCallback((topic: QuickQuestionTopic) => {
    // Convert topic to InterestArea format for compatibility with existing state
    const interestArea = {
      label: topic.label,
      value: topic.label.toLowerCase().replace(/\s+/g, '-')
    }
    dispatch({ type: 'SET_INTEREST', payload: interestArea })
  }, [dispatch])
  
  const setTopicByLabel = useCallback((topicLabel: string) => {
    const topic = availableTopics.find(t => t.label === topicLabel)
    if (topic) {
      setTopic(topic)
    }
  }, [availableTopics, setTopic])
  
  const completeOnboarding = useCallback(() => {
    dispatch({ type: 'COMPLETE_ONBOARDING' })
  }, [dispatch])
  
  const resetOnboarding = useCallback(() => {
    dispatch({ type: 'RESET_ONBOARDING' })
  }, [dispatch])
  
  const generateContext = useCallback((): OnboardingContext | null => {
    if (!state.currentPersona) return null
    return createOnboardingContext(state.currentPersona, selectedTopic)
  }, [state.currentPersona, selectedTopic])
  
  const generateWarmUpPromptForCurrent = useCallback((): string | null => {
    if (!state.currentPersona) return null
    if (!selectedTopic) {
      return `You are about to engage in a conversation with a ${state.currentPersona}. Please provide helpful, age-appropriate responses in Romanian.`
    }
    return generateWarmUpPrompt(state.currentPersona, selectedTopic.label)
  }, [state.currentPersona, selectedTopic])
  
  const getQuickQuestionsForCurrent = useCallback((): string[] => {
    return selectedTopic ? selectedTopic.questions : []
  }, [selectedTopic])
  
  const canCompleteOnboarding = useCallback((): boolean => {
    return state.currentPersona !== null
  }, [state.currentPersona])
  
  const isPersonaSelected = useCallback((): boolean => {
    return state.currentPersona !== null
  }, [state.currentPersona])
  
  const isTopicSelected = useCallback((): boolean => {
    return selectedTopic !== null
  }, [selectedTopic])
  
  // Compose state object
  const onboardingState: OnboardingState = {
    currentPersona: state.currentPersona,
    selectedTopic,
    selectedTopicLabel: state.selectedInterest?.label || null,
    onboardingCompleted: state.onboardingCompleted,
    availableTopics,
    onboardingContext,
    warmUpPrompt,
    quickQuestions,
    personaGreeting
  }
  
  // Compose actions object
  const actions: OnboardingActions = {
    setPersona,
    setTopic,
    setTopicByLabel,
    completeOnboarding,
    resetOnboarding,
    generateContext,
    generateWarmUpPromptForCurrent,
    getQuickQuestionsForCurrent,
    canCompleteOnboarding,
    isPersonaSelected,
    isTopicSelected
  }
  
  return {
    state: onboardingState,
    actions
  }
}