import { Action, AppState } from './AppProvider'

// Persistence utilities (duplicated to avoid circular imports)
const STORAGE_KEYS = {
  PERSONA: 'narada_onboarding_persona',
  TOPIC: 'narada_onboarding_topic',
  COMPLETED: 'narada_onboarding_completed'
} as const

const persistenceUtils = {
  savePersona: (persona: string | null) => {
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

// Define the reducer function
export const appStateReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'TOGGLE_CHAT_HISTORY':
      return { ...state, isChatHistoryOpen: !state.isChatHistoryOpen }
    case 'UPDATE_CURRENT_CHAT':
      return { ...state, currentChat: action.payload }
    case 'UPDATE_CHAT_HISTORY_LOADING_STATE':
      return { ...state, chatHistoryLoadingState: action.payload }
    case 'UPDATE_CHAT_HISTORY':
      if (!state.chatHistory || !state.currentChat) {
        return state
      }
      const conversationIndex = state.chatHistory.findIndex(conv => conv.id === action.payload.id)
      if (conversationIndex !== -1) {
        const updatedChatHistory = [...state.chatHistory]
        updatedChatHistory[conversationIndex] = state.currentChat
        return { ...state, chatHistory: updatedChatHistory }
      } else {
        return { ...state, chatHistory: [...state.chatHistory, action.payload] }
      }
    case 'UPDATE_CHAT_TITLE':
      if (!state.chatHistory) {
        return { ...state, chatHistory: [] }
      }
      const updatedChats = state.chatHistory.map(chat => {
        if (chat.id === action.payload.id) {
          if (state.currentChat?.id === action.payload.id) {
            state.currentChat.title = action.payload.title
          }
          //TODO: make api call to save new title to DB
          return { ...chat, title: action.payload.title }
        }
        return chat
      })
      return { ...state, chatHistory: updatedChats }
    case 'DELETE_CHAT_ENTRY':
      if (!state.chatHistory) {
        return { ...state, chatHistory: [] }
      }
      const filteredChat = state.chatHistory.filter(chat => chat.id !== action.payload)
      state.currentChat = null
      //TODO: make api call to delete conversation from DB
      return { ...state, chatHistory: filteredChat }
    case 'DELETE_CHAT_HISTORY':
      //TODO: make api call to delete all conversations from DB
      return { ...state, chatHistory: [], filteredChatHistory: [], currentChat: null }
    case 'DELETE_CURRENT_CHAT_MESSAGES':
      //TODO: make api call to delete current conversation messages from DB
      if (!state.currentChat || !state.chatHistory) {
        return state
      }
      const updatedCurrentChat = {
        ...state.currentChat,
        messages: []
      }
      return {
        ...state,
        currentChat: updatedCurrentChat
      }
    case 'FETCH_CHAT_HISTORY':
      return { ...state, chatHistory: action.payload }
    case 'SET_COSMOSDB_STATUS':
      return { ...state, isCosmosDBAvailable: action.payload }
    case 'FETCH_FRONTEND_SETTINGS':
      return { ...state, isLoading: false, frontendSettings: action.payload }
    case 'SET_FEEDBACK_STATE':
      return {
        ...state,
        feedbackState: {
          ...state.feedbackState,
          [action.payload.answerId]: action.payload.feedback
        }
      }
    case 'SET_ANSWER_EXEC_RESULT':
      return {
        ...state,
        answerExecResult: {
          ...state.answerExecResult,
          [action.payload.answerId]: action.payload.exec_result
        }
      }
    // Persona actions with persistence
    case 'SET_PERSONA':
      persistenceUtils.savePersona(action.payload)
      // Clear topic when persona changes as it may not be valid for new persona
      persistenceUtils.saveTopic(null)
      return {
        ...state,
        currentPersona: action.payload,
        selectedInterest: null, // Reset interest when persona changes
        selectedTopic: null, // Reset topic when persona changes
        onboardingContext: null // Reset context when persona changes
      }
    case 'SET_INTEREST':
      persistenceUtils.saveTopic(action.payload.label)
      return {
        ...state,
        selectedInterest: action.payload
      }
    case 'SET_TOPIC':
      persistenceUtils.saveTopic(action.payload.label)
      return {
        ...state,
        selectedTopic: action.payload,
        // Also update selectedInterest for compatibility
        selectedInterest: {
          label: action.payload.label,
          value: action.payload.label.toLowerCase().replace(/\s+/g, '-')
        }
      }
    case 'SET_ONBOARDING_CONTEXT':
      return {
        ...state,
        onboardingContext: action.payload
      }
    case 'COMPLETE_ONBOARDING':
      persistenceUtils.saveCompleted(true)
      return {
        ...state,
        onboardingCompleted: true
      }
    case 'RESET_ONBOARDING':
      persistenceUtils.clearAll()
      return {
        ...state,
        currentPersona: null,
        selectedInterest: null,
        selectedTopic: null,
        onboardingContext: null,
        onboardingCompleted: false
      }
    default:
      return state
  }
}
