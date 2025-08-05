import { 
  getQuickQuestionsByIndex, 
  getTopicIndex, 
  getTopicsForPersona 
} from '../quickQuestions'

describe('Dynamic Quick Questions', () => {
  describe('getTopicsForPersona', () => {
    it('should return topics for elev persona', () => {
      const topics = getTopicsForPersona('elev')
      expect(topics).toHaveLength(4)
      expect(topics[0].label).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')
    })

    it('should return topics for părinte persona', () => {
      const topics = getTopicsForPersona('părinte')
      expect(topics).toHaveLength(4)
      expect(topics[0].label).toBe('să îmi ajut copilul la școală cu sfaturi pentru teme și obiceiuri bune acasă')
    })

    it('should return topics for profesor persona', () => {
      const topics = getTopicsForPersona('profesor')
      expect(topics).toHaveLength(4)
      expect(topics[0].label).toBe('să ajut elevii să învețe singuri prin strategii noi de succes școlar și dezvoltare')
    })

    it('should return empty array for invalid persona', () => {
      const topics = getTopicsForPersona('invalid')
      expect(topics).toEqual([])
    })
  })

  describe('getTopicIndex', () => {
    it('should return correct index for elev topics', () => {
      const index = getTopicIndex('elev', 'cum să îmi înțeleg emoțiile și să depășesc momentele grele')
      expect(index).toBe(1)
    })

    it('should return -1 for invalid topic', () => {
      const index = getTopicIndex('elev', 'invalid topic')
      expect(index).toBe(-1)
    })
  })

  describe('getQuickQuestionsByIndex', () => {
    it('should return questions for elev topic index 0', () => {
      const questions = getQuickQuestionsByIndex('elev', 0)
      expect(questions).toHaveLength(3)
      expect(questions[0]).toBe('Am o temă grea. Cum pot să-mi ușurez munca?')
    })

    it('should return questions for elev topic index 1', () => {
      const questions = getQuickQuestionsByIndex('elev', 1)
      expect(questions).toHaveLength(3)
      expect(questions[0]).toBe('Ce pot face când mă simt trist sau nervos?')
      expect(questions[1]).toBe('Cum pot vorbi despre ce simt fără să-mi fie rușine?')
    })

    it('should return empty array for invalid index', () => {
      const questions = getQuickQuestionsByIndex('elev', 10)
      expect(questions).toEqual([])
    })

    it('should return empty array for invalid persona', () => {
      const questions = getQuickQuestionsByIndex('invalid', 0)
      expect(questions).toEqual([])
    })
  })

  describe('Integration test - matching hardcoded questions', () => {
    it('should find the hardcoded questions in the config', () => {
      // These were the hardcoded questions in Chat.tsx
      const hardcodedQuestions = [
        'Cum pot vorbi despre ce simt fără să-mi fie rușine?',
        'Cum mă pot calma înainte de un test sau o prezentare?'
      ]

      // Check if these exist in elev persona
      const elevTopics = getTopicsForPersona('elev')
      const allElevQuestions = elevTopics.flatMap(topic => topic.questions)
      
      hardcodedQuestions.forEach(question => {
        expect(allElevQuestions).toContain(question)
      })
    })
  })
})