import React, {
  createContext,
  ReactNode,
  useEffect,
  useReducer
} from 'react'

import {
  ChatHistoryLoadingState,
  Conversation,
  CosmosDBHealth,
  CosmosDBStatus,
  Feedback,
  FrontendSettings,
  frontendSettings,
  historyEnsure,
  historyList
} from '../api'

import { Persona, InterestArea } from '../types/persona'
import { QuickQuestionTopic } from '../config/quickQuestions'
import { OnboardingContext } from '../utils/onboardingContext'
import { validatePersistedData, cleanupInvalidPersistedData } from '../utils/persistenceValidation'

import { appStateReducer } from './AppReducer'

// Persistence utilities
const STORAGE_KEYS = {
  PERSONA: 'narada_onboarding_persona',
  TOPIC: 'narada_onboarding_topic',
  COMPLETED: 'narada_onboarding_completed'
} as const

const persistenceUtils = {
  savePersona: (persona: Persona | null) => {
    try {
      if (persona) {
        localStorage.setItem(STORAGE_KEYS.PERSONA, persona)
      } else {
        localStorage.removeItem(STORAGE_KEYS.PERSONA)
      }
    } catch (error) {
      console.warn('Failed to save persona to localStorage:', error)
    }
  },

  saveTopic: (topicLabel: string | null) => {
    try {
      if (topicLabel) {
        localStorage.setItem(STORAGE_KEYS.TOPIC, topicLabel)
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOPIC)
      }
    } catch (error) {
      console.warn('Failed to save topic to localStorage:', error)
    }
  },

  saveCompleted: (completed: boolean) => {
    try {
      if (completed) {
        localStorage.setItem(STORAGE_KEYS.COMPLETED, 'true')
      } else {
        localStorage.removeItem(STORAGE_KEYS.COMPLETED)
      }
    } catch (error) {
      console.warn('Failed to save completion status to localStorage:', error)
    }
  },

  loadPersona: (): Persona | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERSONA)
      if (stored && ['elev', 'părinte', 'profesor', 'incognito'].includes(stored)) {
        return stored as Persona
      }
    } catch (error) {
      console.warn('Failed to load persona from localStorage:', error)
    }
    return null
  },

  loadTopic: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TOPIC)
    } catch (error) {
      console.warn('Failed to load topic from localStorage:', error)
    }
    return null
  },

  loadCompleted: (): boolean => {
    try {
      return localStorage.getItem(STORAGE_KEYS.COMPLETED) === 'true'
    } catch (error) {
      console.warn('Failed to load completion status from localStorage:', error)
    }
    return false
  },

  clearAll: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.PERSONA)
      localStorage.removeItem(STORAGE_KEYS.TOPIC)
      localStorage.removeItem(STORAGE_KEYS.COMPLETED)
    } catch (error) {
      console.warn('Failed to clear onboarding data from localStorage:', error)
    }
  }
}

export interface AppState {
  isChatHistoryOpen: boolean
  chatHistoryLoadingState: ChatHistoryLoadingState
  isCosmosDBAvailable: CosmosDBHealth
  chatHistory: Conversation[] | null
  filteredChatHistory: Conversation[] | null
  currentChat: Conversation | null
  frontendSettings: FrontendSettings | null
  feedbackState: { [answerId: string]: Feedback.Neutral | Feedback.Positive | Feedback.Negative }
  isLoading: boolean;
  answerExecResult: { [answerId: string]: [] }
  // Persona state
  currentPersona: Persona | null
  selectedInterest: InterestArea | null
  onboardingCompleted: boolean
  // Enhanced onboarding state
  selectedTopic: QuickQuestionTopic | null
  onboardingContext: OnboardingContext | null
}

export type Action =
  | { type: 'TOGGLE_CHAT_HISTORY' }
  | { type: 'SET_COSMOSDB_STATUS'; payload: CosmosDBHealth }
  | { type: 'UPDATE_CHAT_HISTORY_LOADING_STATE'; payload: ChatHistoryLoadingState }
  | { type: 'UPDATE_CURRENT_CHAT'; payload: Conversation | null }
  | { type: 'UPDATE_FILTERED_CHAT_HISTORY'; payload: Conversation[] | null }
  | { type: 'UPDATE_CHAT_HISTORY'; payload: Conversation }
  | { type: 'UPDATE_CHAT_TITLE'; payload: Conversation }
  | { type: 'DELETE_CHAT_ENTRY'; payload: string }
  | { type: 'DELETE_CHAT_HISTORY' }
  | { type: 'DELETE_CURRENT_CHAT_MESSAGES'; payload: string }
  | { type: 'FETCH_CHAT_HISTORY'; payload: Conversation[] | null }
  | { type: 'FETCH_FRONTEND_SETTINGS'; payload: FrontendSettings | null }
  | {
    type: 'SET_FEEDBACK_STATE'
    payload: { answerId: string; feedback: Feedback.Positive | Feedback.Negative | Feedback.Neutral }
  }
  | { type: 'GET_FEEDBACK_STATE'; payload: string }
  | { type: 'SET_ANSWER_EXEC_RESULT'; payload: { answerId: string, exec_result: [] } }
  // Persona actions
  | { type: 'SET_PERSONA'; payload: Persona }
  | { type: 'SET_INTEREST'; payload: InterestArea }
  | { type: 'SET_TOPIC'; payload: QuickQuestionTopic }
  | { type: 'SET_ONBOARDING_CONTEXT'; payload: OnboardingContext }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'RESET_ONBOARDING' }

// Load persisted onboarding data with validation
const loadPersistedOnboardingState = () => {
  const rawPersona = persistenceUtils.loadPersona()
  const rawTopicLabel = persistenceUtils.loadTopic()
  const rawCompleted = persistenceUtils.loadCompleted()

  // Validate the persisted data
  const { validPersona, validTopicLabel, validCompleted } = validatePersistedData(
    rawPersona,
    rawTopicLabel,
    rawCompleted
  )

  // Clean up any invalid data in localStorage
  cleanupInvalidPersistedData(
    rawPersona,
    rawTopicLabel,
    rawCompleted,
    validPersona,
    validTopicLabel,
    validCompleted
  )

  // Create InterestArea and QuickQuestionTopic from valid topic label if available
  let selectedInterest: InterestArea | null = null
  let selectedTopic: QuickQuestionTopic | null = null
  
  if (validTopicLabel) {
    selectedInterest = {
      label: validTopicLabel,
      value: validTopicLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
    }
    
    selectedTopic = {
      label: validTopicLabel,
      questions: [] // Will be populated from config when needed
    }
  }

  return {
    currentPersona: validPersona,
    selectedInterest,
    selectedTopic,
    onboardingCompleted: validCompleted
  }
}

const persistedState = loadPersistedOnboardingState()

const initialState: AppState = {
  isChatHistoryOpen: false,
  chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
  chatHistory: null,
  filteredChatHistory: null,
  currentChat: null,
  isCosmosDBAvailable: {
    cosmosDB: false,
    status: CosmosDBStatus.NotConfigured
  },
  frontendSettings: null,
  feedbackState: {},
  isLoading: true,
  answerExecResult: {},
  // Persona initial state with persistence
  currentPersona: persistedState.currentPersona,
  selectedInterest: persistedState.selectedInterest,
  onboardingCompleted: persistedState.onboardingCompleted,
  // Enhanced onboarding initial state
  selectedTopic: persistedState.selectedTopic,
  onboardingContext: null,
}

export const AppStateContext = createContext<
  | {
    state: AppState
    dispatch: React.Dispatch<Action>
  }
  | undefined
>(undefined)

type AppStateProviderProps = {
  children: ReactNode
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState)

  useEffect(() => {
    // Check for cosmosdb config and fetch initial data here
    const fetchChatHistory = async (offset = 0): Promise<Conversation[] | null> => {
      const result = await historyList(offset)
        .then(response => {
          if (response) {
            dispatch({ type: 'FETCH_CHAT_HISTORY', payload: response })
          } else {
            dispatch({ type: 'FETCH_CHAT_HISTORY', payload: null })
          }
          return response
        })
        .catch(_err => {
          dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
          dispatch({ type: 'FETCH_CHAT_HISTORY', payload: null })
          console.error('There was an issue fetching your data.')
          return null
        })
      return result
    }

    const getHistoryEnsure = async () => {
      dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Loading })
      // Small delay to ensure Vite proxy is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      historyEnsure()
        .then(response => {
          if (response?.cosmosDB) {
            fetchChatHistory()
              .then(res => {
                if (res) {
                  dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Success })
                  dispatch({ type: 'SET_COSMOSDB_STATUS', payload: response })
                } else {
                  dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
                  dispatch({
                    type: 'SET_COSMOSDB_STATUS',
                    payload: { cosmosDB: false, status: CosmosDBStatus.NotWorking }
                  })
                }
              })
              .catch(_err => {
                dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
                dispatch({
                  type: 'SET_COSMOSDB_STATUS',
                  payload: { cosmosDB: false, status: CosmosDBStatus.NotWorking }
                })
              })
          } else {
            dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
            dispatch({ type: 'SET_COSMOSDB_STATUS', payload: response })
          }
        })
        .catch(_err => {
          dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
          dispatch({ type: 'SET_COSMOSDB_STATUS', payload: { cosmosDB: false, status: CosmosDBStatus.NotConfigured } })
        })
    }
    getHistoryEnsure()
  }, [])

  useEffect(() => {
    const getFrontendSettings = async () => {
      // Small delay to ensure Vite proxy is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      frontendSettings()
        .then(response => {
          dispatch({ type: 'FETCH_FRONTEND_SETTINGS', payload: response as FrontendSettings })
        })
        .catch(_err => {
          console.error('There was an issue fetching your data.')
        })
    }
    getFrontendSettings()
  }, [])

  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>
}
