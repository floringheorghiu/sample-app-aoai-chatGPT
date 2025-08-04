import { 
  getPersonaTheme, 
  applyPersonaTheme, 
  getPersonaButtonClasses,
  getPersonaMessageClasses,
  getPersonaAccentClasses,
  getPersonaBackgroundClasses,
  getPersonaCSSProperties,
  createPersonaThemeUtils
} from './personaTheme'
import { Persona } from '../types/persona'

describe('personaTheme utilities', () => {
  describe('getPersonaTheme', () => {
    it('returns default theme for null persona', () => {
      const theme = getPersonaTheme(null)
      expect(theme.bg).toBe('bg-background')
      expect(theme.text).toBe('text-foreground')
      expect(theme.primary).toBe('bg-primary hover:bg-primary/90')
    })

    it('returns correct theme for elev persona', () => {
      const theme = getPersonaTheme('elev')
      expect(theme.bg).toBe('bg-[#FEEFF7]')
      expect(theme.text).toBe('text-[#07050a]')
      expect(theme.primary).toBe('bg-[#D0337D] hover:bg-[#B02A6B]')
      expect(theme.userBubble).toBe('bg-[#D0337D]')
    })

    it('returns correct theme for părinte persona', () => {
      const theme = getPersonaTheme('părinte')
      expect(theme.primary).toBe('bg-[#ff4773] hover:bg-[#E63E66]')
      expect(theme.userBubble).toBe('bg-[#ff4773]')
    })

    it('returns correct theme for profesor persona', () => {
      const theme = getPersonaTheme('profesor')
      expect(theme.primary).toBe('bg-[#9a6ae1] hover:bg-[#8A5DD1]')
      expect(theme.userBubble).toBe('bg-[#9a6ae1]')
    })

    it('returns correct theme for incognito persona', () => {
      const theme = getPersonaTheme('incognito')
      expect(theme.primary).toBe('bg-gray-600 hover:bg-gray-700')
      expect(theme.userBubble).toBe('bg-gray-600')
    })
  })

  describe('applyPersonaTheme', () => {
    it('applies primary theme by default', () => {
      const classes = applyPersonaTheme('elev', 'base-class')
      expect(classes).toContain('base-class')
      expect(classes).toContain('bg-[#D0337D]')
    })

    it('applies specified theme property', () => {
      const classes = applyPersonaTheme('elev', 'base-class', 'secondary')
      expect(classes).toContain('base-class')
      expect(classes).toContain('bg-[#F8D7E7]')
    })

    it('handles null persona gracefully', () => {
      const classes = applyPersonaTheme(null, 'base-class')
      expect(classes).toContain('base-class')
      expect(classes).toContain('bg-primary')
    })
  })

  describe('getPersonaButtonClasses', () => {
    it('returns primary button classes with persona theme', () => {
      const classes = getPersonaButtonClasses('elev', 'primary')
      expect(classes).toContain('px-4 py-2 rounded-md')
      expect(classes).toContain('bg-[#D0337D]')
      expect(classes).toContain('text-white')
    })

    it('returns secondary button classes with persona theme', () => {
      const classes = getPersonaButtonClasses('elev', 'secondary')
      expect(classes).toContain('px-4 py-2 rounded-md')
      expect(classes).toContain('bg-[#F8D7E7]')
      expect(classes).toContain('text-[#07050a]')
    })

    it('includes base classes', () => {
      const classes = getPersonaButtonClasses('elev', 'primary', 'custom-class')
      expect(classes).toContain('custom-class')
    })
  })

  describe('getPersonaMessageClasses', () => {
    it('returns user message classes with persona theme', () => {
      const classes = getPersonaMessageClasses('elev', true)
      expect(classes).toContain('rounded-lg px-4 py-2')
      expect(classes).toContain('text-white')
      expect(classes).toContain('bg-[#D0337D]')
    })

    it('returns AI message classes with persona accent', () => {
      const classes = getPersonaMessageClasses('elev', false)
      expect(classes).toContain('rounded-lg px-4 py-2')
      expect(classes).toContain('bg-white border')
      expect(classes).toContain('border-[#D0337D]')
    })
  })

  describe('getPersonaAccentClasses', () => {
    it('applies persona accent classes', () => {
      const classes = getPersonaAccentClasses('elev', 'base-class')
      expect(classes).toContain('base-class')
      expect(classes).toContain('border-[#D0337D]')
    })
  })

  describe('getPersonaBackgroundClasses', () => {
    it('applies persona background and text classes', () => {
      const classes = getPersonaBackgroundClasses('elev', 'base-class')
      expect(classes).toContain('base-class')
      expect(classes).toContain('bg-[#FEEFF7]')
      expect(classes).toContain('text-[#07050a]')
    })
  })

  describe('getPersonaCSSProperties', () => {
    it('returns empty object for null persona', () => {
      const props = getPersonaCSSProperties(null)
      expect(props).toEqual({})
    })

    it('extracts CSS custom properties from persona theme', () => {
      const props = getPersonaCSSProperties('elev')
      expect(props['--persona-primary']).toBe('#D0337D')
      expect(props['--persona-user-bubble']).toBe('#D0337D')
    })

    it('handles gray colors for incognito persona', () => {
      const props = getPersonaCSSProperties('incognito')
      expect(props['--persona-primary']).toBe('#4B5563')
    })
  })

  describe('createPersonaThemeUtils', () => {
    it('returns all utility functions for a persona', () => {
      const utils = createPersonaThemeUtils('elev')
      
      expect(utils.theme).toBeDefined()
      expect(utils.applyTheme).toBeInstanceOf(Function)
      expect(utils.buttonClasses).toBeInstanceOf(Function)
      expect(utils.messageClasses).toBeInstanceOf(Function)
      expect(utils.accentClasses).toBeInstanceOf(Function)
      expect(utils.backgroundClasses).toBeInstanceOf(Function)
      expect(utils.cssProperties).toBeDefined()
    })

    it('utility functions work correctly', () => {
      const utils = createPersonaThemeUtils('elev')
      
      const buttonClasses = utils.buttonClasses('primary')
      expect(buttonClasses).toContain('bg-[#D0337D]')
      
      const messageClasses = utils.messageClasses(true)
      expect(messageClasses).toContain('bg-[#D0337D]')
    })
  })
})