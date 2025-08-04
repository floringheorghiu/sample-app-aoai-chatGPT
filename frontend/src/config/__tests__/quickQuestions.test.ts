import { 
  quickQuestionsConfig, 
  getTopicsForPersona, 
  getTopicByLabel, 
  getQuickQuestionsForTopic 
} from '../quickQuestions'

describe('Quick Questions Configuration', () => {
  const personas = ['elev', 'parinte', 'profesor'] as const
  
  describe('Data Structure Validation', () => {
    test('should have exactly 4 topics for each persona', () => {
      personas.forEach(persona => {
        const topics = getTopicsForPersona(persona)
        expect(topics).toHaveLength(4)
      })
    })

    test('should have exactly 3 questions per topic', () => {
      personas.forEach(persona => {
        const topics = getTopicsForPersona(persona)
        topics.forEach(topic => {
          expect(topic.questions).toHaveLength(3)
          expect(topic.questions.every(q => typeof q === 'string' && q.length > 0)).toBe(true)
        })
      })
    })

    test('should have valid topic labels', () => {
      personas.forEach(persona => {
        const topics = getTopicsForPersona(persona)
        topics.forEach(topic => {
          expect(topic.label).toBeDefined()
          expect(typeof topic.label).toBe('string')
          expect(topic.label.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('Persona Compatibility', () => {
    test('should handle both "parinte" and "părinte" persona keys', () => {
      const topicsParinte = getTopicsForPersona('parinte')
      const topicsParinteDiacritic = getTopicsForPersona('părinte')
      
      expect(topicsParinte).toHaveLength(4)
      expect(topicsParinteDiacritic).toHaveLength(4)
      expect(topicsParinte).toEqual(topicsParinteDiacritic)
    })

    test('should return empty array for invalid persona', () => {
      const topics = getTopicsForPersona('invalid-persona')
      expect(topics).toEqual([])
    })
  })

  describe('Helper Functions', () => {
    test('getTopicByLabel should return correct topic', () => {
      const topic = getTopicByLabel('elev', 'să învăț mai bine și să primesc sfaturi pentru teme și școală')
      expect(topic).toBeDefined()
      expect(topic?.label).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')
      expect(topic?.questions).toHaveLength(3)
    })

    test('getTopicByLabel should return null for invalid label', () => {
      const topic = getTopicByLabel('elev', 'invalid-topic-label')
      expect(topic).toBeNull()
    })

    test('getQuickQuestionsForTopic should return correct questions', () => {
      const questions = getQuickQuestionsForTopic('elev', 'să învăț mai bine și să primesc sfaturi pentru teme și școală')
      expect(questions).toHaveLength(3)
      expect(questions).toContain('Am o temă grea. Cum pot să-mi ușurez munca?')
    })

    test('getQuickQuestionsForTopic should return empty array for invalid topic', () => {
      const questions = getQuickQuestionsForTopic('elev', 'invalid-topic-label')
      expect(questions).toEqual([])
    })
  })

  describe('Data Consistency with JSON', () => {
    test('should match expected topic structure for elev', () => {
      const topics = getTopicsForPersona('elev')
      expect(topics[0].label).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')
      expect(topics[1].label).toBe('cum să îmi înțeleg emoțiile și să depășesc momentele grele')
      expect(topics[2].label).toBe('cum să fiu în siguranța online cu prietenii și să mă protejez')
      expect(topics[3].label).toBe('să am curajul de a spune ce gândesc și să fiu auzit la școală')
    })

    test('should match expected topic structure for parinte', () => {
      const topics = getTopicsForPersona('parinte')
      expect(topics[0].label).toBe('să îmi ajut copilul la școală cu sfaturi pentru teme și obiceiuri bune acasă')
      expect(topics[1].label).toBe('cum să vorbesc cu profesorii de la școală și cum să colaborez mai bine cu aceștia')
      expect(topics[2].label).toBe('cum să am grijă de mintea și sufletul copilului meu, să-i înțeleg și să-i susțin emoțiile')
      expect(topics[3].label).toBe('cum să fiu parte din școală și comunitate prin deciziile și sprijinul meu')
    })

    test('should match expected topic structure for profesor', () => {
      const topics = getTopicsForPersona('profesor')
      expect(topics[0].label).toBe('să ajut elevii să învețe singuri prin strategii noi de succes școlar și dezvoltare')
      expect(topics[1].label).toBe('cum să creez un mediu de învățare pozitiv și sigur pentru a avea o clasă de elevi fericiți')
      expect(topics[2].label).toBe('cum să lucrez împreună cu familiile și comunitatea pentru a oferi o educație mai bună')
      expect(topics[3].label).toBe('cum să mă dezvolt ca profesor și să am mai multă încredere în abilitățile mele')
    })
  })
})