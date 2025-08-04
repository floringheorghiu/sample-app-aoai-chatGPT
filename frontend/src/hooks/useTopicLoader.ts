import { useState, useEffect, useCallback } from 'react'
import { Persona } from '../types/persona'
import { QuickQuestionTopic, getTopicsForPersona } from '../config/quickQuestions'

export interface TopicLoadingState {
  topics: QuickQuestionTopic[]
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
  hasRetried: boolean
}

export interface TopicLoaderActions {
  retry: () => void
  clearError: () => void
  forceReload: () => void
}

export interface UseTopicLoaderReturn {
  state: TopicLoadingState
  actions: TopicLoaderActions
}

interface UseTopicLoaderOptions {
  persona: Persona
  retryDelay?: number
  maxRetries?: number
  onError?: (error: Error) => void
  onSuccess?: (topics: QuickQuestionTopic[]) => void
}

/**
 * Hook for loading topic data with error handling and retry mechanisms
 */
export const useTopicLoader = ({
  persona,
  retryDelay = 1000,
  maxRetries = 3,
  onError,
  onSuccess
}: UseTopicLoaderOptions): UseTopicLoaderReturn => {
  const [state, setState] = useState<TopicLoadingState>({
    topics: [],
    isLoading: true,
    error: null,
    isEmpty: false,
    hasRetried: false
  })

  const [retryCount, setRetryCount] = useState(0)

  const loadTopics = useCallback(async (isRetry = false) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      hasRetried: isRetry
    }))

    try {
      // Simulate network delay for realistic loading experience
      await new Promise(resolve => setTimeout(resolve, isRetry ? retryDelay : 300))

      // Load topics from configuration
      const topics = getTopicsForPersona(persona)

      if (!topics || topics.length === 0) {
        throw new Error(`No topics found for persona: ${persona}`)
      }

      // Validate topic structure
      const invalidTopics = topics.filter(topic => 
        !topic.label || 
        !topic.questions || 
        !Array.isArray(topic.questions) || 
        topic.questions.length === 0
      )

      if (invalidTopics.length > 0) {
        throw new Error(`Invalid topic structure found for persona: ${persona}`)
      }

      setState({
        topics,
        isLoading: false,
        error: null,
        isEmpty: false,
        hasRetried: isRetry
      })

      if (onSuccess) {
        onSuccess(topics)
      }

      // Reset retry count on success
      setRetryCount(0)

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error occurred')
      
      setState(prev => ({
        ...prev,
        topics: [],
        isLoading: false,
        error: errorObj,
        isEmpty: true,
        hasRetried: isRetry
      }))

      if (onError) {
        onError(errorObj)
      }

      console.error('Failed to load topics:', errorObj)
    }
  }, [persona, retryDelay, onError, onSuccess])

  const retry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1)
      loadTopics(true)
    } else {
      console.warn(`Max retries (${maxRetries}) reached for loading topics`)
    }
  }, [retryCount, maxRetries, loadTopics])

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }, [])

  const forceReload = useCallback(() => {
    setRetryCount(0)
    loadTopics(false)
  }, [loadTopics])

  // Load topics when persona changes
  useEffect(() => {
    loadTopics(false)
  }, [loadTopics])

  const actions: TopicLoaderActions = {
    retry,
    clearError,
    forceReload
  }

  return {
    state,
    actions
  }
}

/**
 * Simplified hook for basic topic loading without advanced error handling
 */
export const useTopics = (persona: Persona) => {
  const { state, actions } = useTopicLoader({ persona })
  
  return {
    topics: state.topics,
    isLoading: state.isLoading,
    error: state.error,
    retry: actions.retry
  }
}