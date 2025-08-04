import { Persona, PersonaTheme } from '../types/persona'
import { getPersonaConfig } from '../config/personas'
import { cn } from '../lib/utils'

/**
 * Get theme classes for a specific persona
 */
export const getPersonaTheme = (persona: Persona | null): PersonaTheme => {
  const config = persona ? getPersonaConfig(persona) : null
  
  return config?.theme || {
    bg: "bg-background",
    text: "text-foreground", 
    primary: "bg-primary hover:bg-primary/90",
    secondary: "bg-secondary",
    userBubble: "bg-primary",
    accent: "border-primary"
  }
}

/**
 * Apply persona-specific styling to a component
 */
export const applyPersonaTheme = (
  persona: Persona | null,
  baseClasses: string = "",
  themeProperty: keyof PersonaTheme = "primary"
): string => {
  const theme = getPersonaTheme(persona)
  return cn(baseClasses, theme[themeProperty])
}

/**
 * Get persona-specific button classes
 */
export const getPersonaButtonClasses = (
  persona: Persona | null,
  variant: 'primary' | 'secondary' = 'primary',
  baseClasses: string = ""
): string => {
  const theme = getPersonaTheme(persona)
  
  const variantClasses = variant === 'primary' 
    ? theme.primary 
    : theme.secondary
    
  return cn(
    "px-4 py-2 rounded-md font-medium transition-colors",
    baseClasses,
    variantClasses,
    variant === 'primary' ? "text-white" : theme.text
  )
}

/**
 * Get persona-specific message bubble classes
 */
export const getPersonaMessageClasses = (
  persona: Persona | null,
  isUser: boolean = false,
  baseClasses: string = ""
): string => {
  const theme = getPersonaTheme(persona)
  
  if (isUser) {
    return cn(
      "rounded-lg px-4 py-2 text-white",
      baseClasses,
      theme.userBubble
    )
  }
  
  return cn(
    "rounded-lg px-4 py-2 bg-white border",
    baseClasses,
    theme.accent
  )
}

/**
 * Get persona-specific accent classes (borders, focus states, etc.)
 */
export const getPersonaAccentClasses = (
  persona: Persona | null,
  baseClasses: string = ""
): string => {
  const theme = getPersonaTheme(persona)
  return cn(baseClasses, theme.accent)
}

/**
 * Get persona-specific background classes
 */
export const getPersonaBackgroundClasses = (
  persona: Persona | null,
  baseClasses: string = ""
): string => {
  const theme = getPersonaTheme(persona)
  return cn(baseClasses, theme.bg, theme.text)
}

/**
 * Generate CSS custom properties for persona theme
 * Useful for dynamic styling that can't be handled by Tailwind classes
 */
export const getPersonaCSSProperties = (persona: Persona | null): Record<string, string> => {
  const config = persona ? getPersonaConfig(persona) : null
  
  if (!config) {
    return {}
  }
  
  // Extract color values from Tailwind classes
  const extractColor = (className: string): string => {
    // Handle hex colors in brackets like bg-[#D0337D]
    const hexMatch = className.match(/\[#([A-Fa-f0-9]{6})\]/)
    if (hexMatch) {
      return `#${hexMatch[1]}`
    }
    
    // Handle standard Tailwind colors (would need more comprehensive mapping)
    if (className.includes('gray-600')) return '#4B5563'
    if (className.includes('gray-700')) return '#374151'
    
    return ''
  }
  
  return {
    '--persona-primary': extractColor(config.theme.primary),
    '--persona-secondary': extractColor(config.theme.secondary),
    '--persona-accent': extractColor(config.theme.accent),
    '--persona-user-bubble': extractColor(config.theme.userBubble)
  }
}

/**
 * Factory function to get all persona theme utilities
 */
export const createPersonaThemeUtils = (persona: Persona | null) => {
  return {
    theme: getPersonaTheme(persona),
    applyTheme: (baseClasses?: string, property?: keyof PersonaTheme) => 
      applyPersonaTheme(persona, baseClasses, property),
    buttonClasses: (variant?: 'primary' | 'secondary', baseClasses?: string) =>
      getPersonaButtonClasses(persona, variant, baseClasses),
    messageClasses: (isUser?: boolean, baseClasses?: string) =>
      getPersonaMessageClasses(persona, isUser, baseClasses),
    accentClasses: (baseClasses?: string) =>
      getPersonaAccentClasses(persona, baseClasses),
    backgroundClasses: (baseClasses?: string) =>
      getPersonaBackgroundClasses(persona, baseClasses),
    cssProperties: getPersonaCSSProperties(persona)
  }
}
/**

 * Custom hook to get persona theme utilities
 * This should be used within a PersonaThemeProvider context
 */
export const usePersonaThemeUtils = () => {
  // This will be implemented to use the PersonaThemeProvider context
  // For now, return a factory function that can be used with any persona
  return createPersonaThemeUtils
}