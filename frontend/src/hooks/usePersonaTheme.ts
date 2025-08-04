import { useContext } from 'react'
import { AppStateContext } from '../state/AppProvider'
import { createPersonaThemeUtils } from '../utils/personaTheme'

/**
 * Hook to get the current persona and theme utilities from app state
 */
export const useAppPersonaTheme = () => {
  const context = useContext(AppStateContext)
  
  if (!context) {
    throw new Error('useAppPersonaTheme must be used within an AppStateProvider')
  }
  
  const { state } = context
  const { currentPersona } = state
  
  return {
    persona: currentPersona,
    ...createPersonaThemeUtils(currentPersona)
  }
}

/**
 * Hook to get persona theme utilities for a specific persona
 */
export const usePersonaThemeFor = (persona: string | null) => {
  return createPersonaThemeUtils(persona as any)
}