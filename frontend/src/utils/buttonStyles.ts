import { Persona } from '../types/persona'

// Persona color utilities
export const getPersonaButtonColor = (persona: Persona): string => {
  switch (persona) {
    case 'elev':
      return '#D0337D'
    case 'părinte':
      return '#ff4773'
    case 'profesor':
      return '#9a6ae1'
    default:
      return '#e91e63'
  }
}

export const getPersonaButtonHoverColor = (persona: Persona): string => {
  switch (persona) {
    case 'elev':
      return '#B02A6B'
    case 'părinte':
      return '#E63E66'
    case 'profesor':
      return '#8A5DD1'
    default:
      return '#d81b60'
  }
}

// Primary button styling (filled with persona color)
export const getPrimaryButtonStyle = (persona: Persona, disabled: boolean = false) => {
  const personaColor = getPersonaButtonColor(persona)
  const personaHoverColor = getPersonaButtonHoverColor(persona)
  
  return {
    base: {
      fontWeight: '500',
      padding: '12px 24px',
      borderRadius: '25px',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      backgroundColor: disabled ? '#e0e0e0' : personaColor,
      color: disabled ? '#4a4a4a' : 'white',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      fontSize: '16px',
      fontFamily: 'Poppins, sans-serif',
      transform: 'translateY(0) scale(1)',
      willChange: 'transform, background-color, box-shadow'
    },
    hover: disabled ? {} : {
      backgroundColor: personaHoverColor,
      transform: 'translateY(-1px) scale(1.02)',
      boxShadow: `0 4px 12px ${personaColor}40`
    },
    normal: {
      backgroundColor: disabled ? '#e0e0e0' : personaColor,
      transform: 'translateY(0) scale(1)',
      boxShadow: 'none'
    }
  }
}

// Secondary button styling (outline style with persona accent)
export const getSecondaryButtonStyle = (persona: Persona) => {
  const personaColor = getPersonaButtonColor(persona)
  const personaHoverColor = getPersonaButtonHoverColor(persona)
  
  return {
    base: {
      fontWeight: '500',
      padding: '12px 24px',
      borderRadius: '25px',
      border: `2px solid ${personaColor}`,
      cursor: 'pointer',
      backgroundColor: 'white',
      color: '#1a1a1a',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      fontSize: '16px',
      fontFamily: 'Poppins, sans-serif',
      transform: 'translateY(0) scale(1)',
      willChange: 'transform, background-color, border-color'
    },
    hover: {
      backgroundColor: '#f9fafb',
      borderColor: personaHoverColor,
      transform: 'translateY(-1px) scale(1.02)',
      boxShadow: `0 2px 8px ${personaColor}30`
    },
    normal: {
      backgroundColor: 'white',
      borderColor: personaColor,
      transform: 'translateY(0) scale(1)',
      boxShadow: 'none'
    }
  }
}

// Utility function to apply hover handlers
export const createButtonHoverHandlers = (
  style: { hover: any; normal: any },
  disabled: boolean = false
) => ({
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      Object.assign(e.currentTarget.style, style.hover)
    }
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      Object.assign(e.currentTarget.style, style.normal)
    }
  }
})