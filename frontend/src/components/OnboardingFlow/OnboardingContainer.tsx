import React from 'react'
import { Persona } from '../../types/persona'
import { createPersonaThemeUtils } from '../../utils/personaTheme'
import { getPersonaConfig } from '../../config/personas'
import styles from './OnboardingContainer.module.css'

interface OnboardingContainerProps {
  persona: Persona
  children: React.ReactNode
  className?: string
}

export const OnboardingContainer: React.FC<OnboardingContainerProps> = ({
  persona,
  children,
  className = ''
}) => {
  // Use persona theme utilities
  const themeUtils = createPersonaThemeUtils(persona)
  const personaConfig = getPersonaConfig(persona)
  
  // Get persona-specific background from theme config
  const getPersonaBackground = (persona: Persona): string => {
    if (personaConfig?.theme?.bg) {
      // Convert Tailwind bg class to CSS gradient
      switch (persona) {
        case 'elev':
          return 'linear-gradient(135deg, #FEEFF7 0%, #F8D7E7 100%)'
        case 'părinte':
          return 'linear-gradient(135deg, #FFF0F3 0%, #FFD6E1 100%)'
        case 'profesor':
          return 'linear-gradient(135deg, #F5F0FF 0%, #E6D9FF 100%)'
        case 'incognito':
          return 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
        default:
          return 'linear-gradient(135deg, #FEEFF7 0%, #F8D7E7 100%)'
      }
    }
    
    // Fallback to original gradients
    switch (persona) {
      case 'elev':
        return 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)'
      case 'părinte':
        return 'linear-gradient(135deg, #fff0f3 0%, #ffcdd2 100%)'
      case 'profesor':
        return 'linear-gradient(135deg, #f5f0ff 0%, #e1bee7 100%)'
      case 'incognito':
        return 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)'
      default:
        return 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)'
    }
  }

  return (
    <div 
      className={className}
      role="application"
      aria-label="Onboarding interface"
      style={{ 
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        margin: '0',
        padding: '40px 24px',
        background: getPersonaBackground(persona),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        className={styles.container}
        style={{ 
          maxWidth: '480px', 
          width: '100%', 
          backgroundColor: 'white', 
          padding: '40px', 
          borderRadius: '16px', 
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          // Ensure sufficient color contrast
          color: '#1a1a1a'
        }}
      >
        {children}
      </div>
    </div>
  )
}