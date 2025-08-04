import { Persona } from '../types/persona'
import { QuickQuestionTopic } from '../config/quickQuestions'

export interface OnboardingContext {
  persona: Persona
  selectedTopic: QuickQuestionTopic | null
  warmUpPrompt: string
  quickQuestions: string[]
}

/**
 * Generate a warm-up prompt for OpenAI based on persona and selected topic
 */
export const generateWarmUpPrompt = (persona: Persona, topicLabel: string): string => {
  const personaMap = {
    'elev': 'student',
    'părinte': 'parent', 
    'profesor': 'teacher',
    'incognito': 'user'
  }
  
  const personaInEnglish = personaMap[persona] || 'user'
  
  return `You are about to engage in a conversation with a ${personaInEnglish} who is interested in: "${topicLabel}". 
Please provide helpful, age-appropriate responses tailored to this persona and topic area. 
Respond in Romanian and be supportive and encouraging.`
}

/**
 * Create onboarding context from persona and topic selection
 */
export const createOnboardingContext = (
  persona: Persona, 
  selectedTopic: QuickQuestionTopic | null
): OnboardingContext => {
  const warmUpPrompt = selectedTopic 
    ? generateWarmUpPrompt(persona, selectedTopic.label)
    : `You are about to engage in a conversation with a ${persona}. Please provide helpful, age-appropriate responses in Romanian.`
  
  const quickQuestions = selectedTopic ? selectedTopic.questions : []
  
  return {
    persona,
    selectedTopic,
    warmUpPrompt,
    quickQuestions
  }
}

/**
 * Get persona-specific greeting message
 */
export const getPersonaGreeting = (persona: Persona): string => {
  switch (persona) {
    case 'elev':
      return 'Salut! Sunt aici să te ajut cu școala și nu numai. Ce te preocupă?'
    case 'părinte':
      return 'Bună! Sunt aici să te ajut cu întrebările legate de copilul tău și educația lui. Cu ce pot să te ajut?'
    case 'profesor':
      return 'Bună! Sunt aici să te sprijin în activitatea ta educațională. Ce provocări întâmpini?'
    case 'incognito':
      return 'Bună! Sunt aici să te ajut. Cu ce pot să încep?'
    default:
      return 'Bună! Cu ce te pot ajuta astăzi?'
  }
}