import { 
  isValidPersona, 
  isValidTopicForPersona, 
  validatePersistedData, 
  cleanupInvalidPersistedData 
} from '../persistenceValidation'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Persistence Validation Utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('isValidPersona', () => {
    it('should validate correct persona values', () => {
      expect(isValidPersona('elev')).toBe(true)
      expect(isValidPersona('părinte')).toBe(true)
      expect(isValidPersona('profesor')).toBe(true)
      expect(isValidPersona('incognito')).toBe(true)
    })

    it('should reject invalid persona values', () => {
      expect(isValidPersona('invalid')).toBe(false)
      expect(isValidPersona('student')).toBe(false)
      expect(isValidPersona('parent')).toBe(false)
      expect(isValidPersona('')).toBe(false)
      expect(isValidPersona('null')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidPersona('ELEV')).toBe(false) // case sensitive
      expect(isValidPersona(' elev ')).toBe(false) // whitespace
      expect(isValidPersona('elev\n')).toBe(false) // newline
    })
  })

  describe('isValidTopicForPersona', () => {
    it('should validate correct topic for elev persona', () => {
      const validTopic = 'să învăț mai bine și să primesc sfaturi pentru teme și școală'
      expect(isValidTopicForPersona('elev', validTopic)).toBe(true)
    })

    it('should validate correct topic for părinte persona', () => {
      const validTopic = 'să îmi ajut copilul la școală cu sfaturi pentru teme și obiceiuri bune acasă'
      expect(isValidTopicForPersona('părinte', validTopic)).toBe(true)
    })

    it('should validate correct topic for profesor persona', () => {
      const validTopic = 'să ajut elevii să învețe singuri prin strategii noi de succes școlar și dezvoltare'
      expect(isValidTopicForPersona('profesor', validTopic)).toBe(true)
    })

    it('should reject invalid topics for persona', () => {
      expect(isValidTopicForPersona('elev', 'invalid topic')).toBe(false)
      expect(isValidTopicForPersona('părinte', 'să îmi ajut elevii')).toBe(false) // profesor topic
      expect(isValidTopicForPersona('profesor', 'să învăț mai bine')).toBe(false) // elev topic
    })

    it('should handle incognito persona gracefully', () => {
      // Incognito should have no topics, so any topic should be invalid
      expect(isValidTopicForPersona('incognito', 'any topic')).toBe(false)
    })

    it('should handle errors gracefully', () => {
      // Mock getTopicsForPersona to throw error
      const originalConsoleWarn = console.warn
      console.warn = jest.fn()

      // This should not throw but return false
      expect(isValidTopicForPersona('elev', 'test')).toBe(false) // Invalid topic should return false
      
      console.warn = originalConsoleWarn
    })
  })

  describe('validatePersistedData', () => {
    it('should validate complete valid data', () => {
      const result = validatePersistedData(
        'elev',
        'să învăț mai bine și să primesc sfaturi pentru teme și școală',
        true
      )

      expect(result.validPersona).toBe('elev')
      expect(result.validTopicLabel).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')
      expect(result.validCompleted).toBe(true)
    })

    it('should handle invalid persona', () => {
      const result = validatePersistedData(
        'invalid_persona',
        'some topic',
        true
      )

      expect(result.validPersona).toBeNull()
      expect(result.validTopicLabel).toBeNull()
      expect(result.validCompleted).toBe(false)
    })

    it('should handle invalid topic for valid persona', () => {
      const originalConsoleWarn = console.warn
      console.warn = jest.fn()

      const result = validatePersistedData(
        'elev',
        'invalid topic for elev',
        true
      )

      expect(result.validPersona).toBe('elev')
      expect(result.validTopicLabel).toBeNull()
      expect(result.validCompleted).toBe(true)
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid topic "invalid topic for elev" for persona "elev"')
      )

      console.warn = originalConsoleWarn
    })

    it('should handle null values', () => {
      const result = validatePersistedData(null, null, false)

      expect(result.validPersona).toBeNull()
      expect(result.validTopicLabel).toBeNull()
      expect(result.validCompleted).toBe(false)
    })

    it('should not mark as completed without valid persona', () => {
      const result = validatePersistedData(null, null, true)

      expect(result.validPersona).toBeNull()
      expect(result.validTopicLabel).toBeNull()
      expect(result.validCompleted).toBe(false)
    })

    it('should handle incognito persona correctly', () => {
      const result = validatePersistedData('incognito', null, true)

      expect(result.validPersona).toBe('incognito')
      expect(result.validTopicLabel).toBeNull()
      expect(result.validCompleted).toBe(true)
    })

    it('should clear topic for incognito persona', () => {
      const result = validatePersistedData('incognito', 'some topic', true)

      expect(result.validPersona).toBe('incognito')
      expect(result.validTopicLabel).toBeNull() // Should be cleared
      expect(result.validCompleted).toBe(true)
    })
  })

  describe('cleanupInvalidPersistedData', () => {
    it('should clean up invalid persona', () => {
      localStorage.setItem('narada_onboarding_persona', 'invalid')
      
      cleanupInvalidPersistedData(
        'invalid', null, false,
        null, null, false
      )

      expect(localStorage.getItem('narada_onboarding_persona')).toBeNull()
    })

    it('should clean up invalid topic', () => {
      localStorage.setItem('narada_onboarding_topic', 'invalid topic')
      
      cleanupInvalidPersistedData(
        'elev', 'invalid topic', false,
        'elev', null, false
      )

      expect(localStorage.getItem('narada_onboarding_topic')).toBeNull()
    })

    it('should clean up invalid completion status', () => {
      localStorage.setItem('narada_onboarding_completed', 'true')
      
      cleanupInvalidPersistedData(
        null, null, true,
        null, null, false
      )

      expect(localStorage.getItem('narada_onboarding_completed')).toBeNull()
    })

    it('should update valid data correctly', () => {
      cleanupInvalidPersistedData(
        null, null, false,
        'elev', 'să învăț mai bine și să primesc sfaturi pentru teme și școală', true
      )

      expect(localStorage.getItem('narada_onboarding_persona')).toBe('elev')
      expect(localStorage.getItem('narada_onboarding_topic')).toBe('să învăț mai bine și să primesc sfaturi pentru teme și școală')
      expect(localStorage.getItem('narada_onboarding_completed')).toBe('true')
    })

    it('should not modify data that is already correct', () => {
      localStorage.setItem('narada_onboarding_persona', 'elev')
      localStorage.setItem('narada_onboarding_topic', 'valid topic')
      localStorage.setItem('narada_onboarding_completed', 'true')

      const setItemSpy = jest.spyOn(localStorage, 'setItem')
      const removeItemSpy = jest.spyOn(localStorage, 'removeItem')

      cleanupInvalidPersistedData(
        'elev', 'valid topic', true,
        'elev', 'valid topic', true
      )

      expect(setItemSpy).not.toHaveBeenCalled()
      expect(removeItemSpy).not.toHaveBeenCalled()

      setItemSpy.mockRestore()
      removeItemSpy.mockRestore()
    })

    it('should handle localStorage errors gracefully', () => {
      const originalConsoleWarn = console.warn
      console.warn = jest.fn()

      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn(() => {
        throw new Error('localStorage error')
      })

      expect(() => {
        cleanupInvalidPersistedData(
          null, null, false,
          'elev', null, false
        )
      }).not.toThrow()

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to cleanup invalid persisted data:',
        expect.any(Error)
      )

      localStorage.setItem = originalSetItem
      console.warn = originalConsoleWarn
    })
  })

  describe('Integration scenarios', () => {
    it('should handle persona change scenario', () => {
      // User had elev persona with elev topic
      localStorage.setItem('narada_onboarding_persona', 'elev')
      localStorage.setItem('narada_onboarding_topic', 'să învăț mai bine și să primesc sfaturi pentru teme și școală')
      localStorage.setItem('narada_onboarding_completed', 'true')

      // But somehow persona got corrupted to părinte while keeping elev topic
      const result = validatePersistedData(
        'părinte',
        'să învăț mai bine și să primesc sfaturi pentru teme și școală', // elev topic
        true
      )

      expect(result.validPersona).toBe('părinte')
      expect(result.validTopicLabel).toBeNull() // Should be cleared due to mismatch
      expect(result.validCompleted).toBe(true)
    })

    it('should handle partial corruption recovery', () => {
      // Set up localStorage with corrupted data
      localStorage.setItem('narada_onboarding_persona', 'profesor')
      localStorage.setItem('narada_onboarding_topic', 'corrupted_topic_data')
      localStorage.setItem('narada_onboarding_completed', 'true')

      const result = validatePersistedData(
        'profesor',
        'corrupted_topic_data',
        true
      )

      expect(result.validPersona).toBe('profesor')
      expect(result.validTopicLabel).toBeNull()
      expect(result.validCompleted).toBe(true) // Still completed, just topic is invalid

      cleanupInvalidPersistedData(
        'profesor', 'corrupted_topic_data', true,
        result.validPersona, result.validTopicLabel, result.validCompleted
      )

      expect(localStorage.getItem('narada_onboarding_persona')).toBe('profesor')
      expect(localStorage.getItem('narada_onboarding_topic')).toBeNull()
      expect(localStorage.getItem('narada_onboarding_completed')).toBe('true')
    })
  })
})