import { 
  generateWarmUpPrompt, 
  createOnboardingContext, 
  getPersonaGreeting 
} from '../onboardingContext'
import { Persona } from '../../types/persona'
import { QuickQuestionTopic } from '../../config/quickQuestions'

const mockTopic: QuickQuestionTopic = {
  label: "să învăț mai bine și să primesc sfaturi pentru teme și școală",
  questions: [
    "Am o temă grea. Cum pot să-mi ușurez munca?",
    "Cum învăț mai eficient pentru un test important?",
    "Ce pot face când mă plictisesc la ore?"
  ]
}

describe('onboardingContext utilities', () => {
  describe('generateWarmUpPrompt', () => {
    it('generates correct prompt for elev persona', () => {
      const prompt = generateWarmUpPrompt('elev', mockTopic.label)
      
      expect(prompt).toContain('student')
      expect(prompt).toContain(mockTopic.label)
      expect(prompt).toContain('Romanian')
    })

    it('generates correct prompt for părinte persona', () => {
      const prompt = generateWarmUpPrompt('părinte', mockTopic.label)
      
      expect(prompt).toContain('parent')
      expect(prompt).toContain(mockTopic.label)
      expect(prompt).toContain('Romanian')
    })

    it('generates correct prompt for profesor persona', () => {
      const prompt = generateWarmUpPrompt('profesor', mockTopic.label)
      
      expect(prompt).toContain('teacher')
      expect(prompt).toContain(mockTopic.label)
      expect(prompt).toContain('Romanian')
    })

    it('generates correct prompt for incognito persona', () => {
      const prompt = generateWarmUpPrompt('incognito', mockTopic.label)
      
      expect(prompt).toContain('user')
      expect(prompt).toContain(mockTopic.label)
      expect(prompt).toContain('Romanian')
    })
  })

  describe('createOnboardingContext', () => {
    it('creates context with selected topic', () => {
      const context = createOnboardingContext('elev', mockTopic)
      
      expect(context.persona).toBe('elev')
      expect(context.selectedTopic).toBe(mockTopic)
      expect(context.quickQuestions).toEqual(mockTopic.questions)
      expect(context.warmUpPrompt).toContain('student')
      expect(context.warmUpPrompt).toContain(mockTopic.label)
    })

    it('creates context without selected topic', () => {
      const context = createOnboardingContext('elev', null)
      
      expect(context.persona).toBe('elev')
      expect(context.selectedTopic).toBeNull()
      expect(context.quickQuestions).toEqual([])
      expect(context.warmUpPrompt).toContain('elev')
      expect(context.warmUpPrompt).toContain('Romanian')
    })
  })

  describe('getPersonaGreeting', () => {
    it('returns correct greeting for elev', () => {
      const greeting = getPersonaGreeting('elev')
      expect(greeting).toContain('Salut')
      expect(greeting).toContain('școala')
    })

    it('returns correct greeting for părinte', () => {
      const greeting = getPersonaGreeting('părinte')
      expect(greeting).toContain('Bună')
      expect(greeting).toContain('copilul tău')
    })

    it('returns correct greeting for profesor', () => {
      const greeting = getPersonaGreeting('profesor')
      expect(greeting).toContain('Bună')
      expect(greeting).toContain('educațională')
    })

    it('returns correct greeting for incognito', () => {
      const greeting = getPersonaGreeting('incognito')
      expect(greeting).toContain('Bună')
      expect(greeting).not.toContain('școala')
      expect(greeting).not.toContain('copilul')
    })

    it('returns default greeting for unknown persona', () => {
      const greeting = getPersonaGreeting('unknown' as Persona)
      expect(greeting).toContain('Bună')
      expect(greeting).toContain('te pot ajuta')
    })
  })
})