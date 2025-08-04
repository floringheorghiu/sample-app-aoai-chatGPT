import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import { Persona, PersonaTheme, PersonaConfig } from '../types/persona'
import { getPersonaConfig } from '../config/personas'
import { getPersonaTheme, getPersonaCSSProperties } from '../utils/personaTheme'

interface PersonaThemeContextType {
  persona: Persona | null
  config: PersonaConfig | null
  theme: PersonaTheme
  themeClasses: PersonaTheme
  cssProperties: Record<string, string>
}

const PersonaThemeContext = createContext<PersonaThemeContextType | undefined>(undefined)

interface PersonaThemeProviderProps {
  children: ReactNode
  persona: Persona | null
  className?: string
}

export const PersonaThemeProvider: React.FC<PersonaThemeProviderProps> = ({ 
  children, 
  persona,
  className = ""
}) => {
  const config = useMemo(() => persona ? getPersonaConfig(persona) : null, [persona])
  const theme = useMemo(() => getPersonaTheme(persona), [persona])
  const cssProperties = useMemo(() => getPersonaCSSProperties(persona), [persona])

  const contextValue = useMemo(() => ({
    persona,
    config,
    theme,
    themeClasses: theme, // Backward compatibility
    cssProperties
  }), [persona, config, theme, cssProperties])

  return (
    <PersonaThemeContext.Provider value={contextValue}>
      <div 
        className={`${theme.bg} ${theme.text} min-h-screen transition-colors duration-200 ${className}`}
        style={cssProperties}
      >
        {children}
      </div>
    </PersonaThemeContext.Provider>
  )
}

export const usePersonaTheme = () => {
  const context = useContext(PersonaThemeContext)
  if (context === undefined) {
    throw new Error('usePersonaTheme must be used within a PersonaThemeProvider')
  }
  return context
}