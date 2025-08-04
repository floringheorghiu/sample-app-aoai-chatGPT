import { Persona } from '../types/persona'
import { getTopicsForPersona } from '../config/quickQuestions'

/**
 * Validates that a persona value is valid
 */
export const isValidPersona = (persona: string): persona is Persona => {
  return ['elev', 'părinte', 'profesor', 'incognito'].includes(persona)
}

/**
 * Validates that a topic label is valid for the given persona
 */
export const isValidTopicForPersona = (persona: Persona, topicLabel: string): boolean => {
  try {
    const availableTopics = getTopicsForPersona(persona)
    return availableTopics.some(topic => topic.label === topicLabel)
  } catch (error) {
    console.warn('Error validating topic for persona:', error)
    return false
  }
}

/**
 * Validates and cleans persisted onboarding data
 * Returns cleaned data or null values for invalid data
 */
export const validatePersistedData = (
  persona: string | null,
  topicLabel: string | null,
  completed: boolean
): {
  validPersona: Persona | null
  validTopicLabel: string | null
  validCompleted: boolean
} => {
  let validPersona: Persona | null = null
  let validTopicLabel: string | null = null
  let validCompleted = false

  // Validate persona
  if (persona && isValidPersona(persona)) {
    validPersona = persona
  }

  // Validate topic only if persona is valid
  if (validPersona && topicLabel) {
    if (isValidTopicForPersona(validPersona, topicLabel)) {
      validTopicLabel = topicLabel
    } else {
      console.warn(`Invalid topic "${topicLabel}" for persona "${validPersona}". Clearing topic.`)
    }
  }

  // Only consider completed if we have a valid persona
  if (validPersona && completed) {
    validCompleted = true
  }

  return {
    validPersona,
    validTopicLabel,
    validCompleted
  }
}

/**
 * Cleans up invalid persisted data from localStorage
 */
export const cleanupInvalidPersistedData = (
  originalPersona: string | null,
  originalTopic: string | null,
  originalCompleted: boolean,
  validPersona: Persona | null,
  validTopicLabel: string | null,
  validCompleted: boolean
): void => {
  try {
    // Clean up invalid persona
    if (originalPersona !== validPersona) {
      if (validPersona) {
        localStorage.setItem('narada_onboarding_persona', validPersona)
      } else {
        localStorage.removeItem('narada_onboarding_persona')
      }
    }

    // Clean up invalid topic
    if (originalTopic !== validTopicLabel) {
      if (validTopicLabel) {
        localStorage.setItem('narada_onboarding_topic', validTopicLabel)
      } else {
        localStorage.removeItem('narada_onboarding_topic')
      }
    }

    // Clean up invalid completion status
    if (originalCompleted !== validCompleted) {
      if (validCompleted) {
        localStorage.setItem('narada_onboarding_completed', 'true')
      } else {
        localStorage.removeItem('narada_onboarding_completed')
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup invalid persisted data:', error)
  }
}