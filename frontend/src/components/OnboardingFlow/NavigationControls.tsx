import React from 'react'
import { Persona } from '../../types/persona'
import { 
  getPrimaryButtonStyle, 
  getSecondaryButtonStyle, 
  createButtonHoverHandlers 
} from '../../utils/buttonStyles'

interface NavigationControlsProps {
  onBack: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  persona: Persona
  showNext?: boolean
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  onBack,
  onNext,
  nextLabel = 'Continuă',
  nextDisabled = false,
  persona,
  showNext = true
}) => {
  const primaryButtonStyle = getPrimaryButtonStyle(persona, nextDisabled)
  const secondaryButtonStyle = getSecondaryButtonStyle(persona)
  const primaryHoverHandlers = createButtonHoverHandlers(primaryButtonStyle, nextDisabled)
  const secondaryHoverHandlers = createButtonHoverHandlers(secondaryButtonStyle)

  // Handle keyboard navigation between buttons
  const handleKeyDown = (e: React.KeyboardEvent, isBackButton: boolean) => {
    if (e.key === 'Tab') {
      // Let default tab behavior work
      return
    }
    
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const buttons = document.querySelectorAll('button:not([disabled])')
      const currentIndex = Array.from(buttons).indexOf(e.currentTarget as Element)
      
      let nextIndex = currentIndex
      if (e.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1
      } else if (e.key === 'ArrowRight') {
        nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0
      }
      
      (buttons[nextIndex] as HTMLElement)?.focus()
    }
  }

  return (
    <nav 
      role="navigation" 
      aria-label="Onboarding navigation"
      style={{ 
        display: 'flex', 
        justifyContent: showNext ? 'space-between' : 'flex-start', 
        alignItems: 'center', 
        gap: '16px' 
      }}
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        onKeyDown={(e) => handleKeyDown(e, true)}
        aria-label="Go back to previous step"
        style={{
          ...secondaryButtonStyle.base,
          flex: showNext ? 1 : 'none',
          // Enhanced focus styles
          outline: 'none'
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)'
          e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
        }}
        {...secondaryHoverHandlers}
      >
        Înapoi
      </button>

      {/* Next/Continue Button */}
      {showNext && onNext && (
        <button
          onClick={onNext}
          onKeyDown={(e) => handleKeyDown(e, false)}
          disabled={nextDisabled}
          aria-label={nextDisabled ? `${nextLabel} - Please select a topic first` : nextLabel}
          aria-describedby={nextDisabled ? 'next-button-help' : undefined}
          style={{
            ...primaryButtonStyle.base,
            flex: 1,
            // Enhanced focus styles
            outline: 'none'
          }}
          onFocus={(e) => {
            if (!nextDisabled) {
              const focusColor = persona === 'elev' ? 'rgba(208, 51, 125, 0.5)' :
                                persona === 'părinte' ? 'rgba(255, 71, 115, 0.5)' :
                                persona === 'profesor' ? 'rgba(154, 106, 225, 0.5)' :
                                'rgba(59, 130, 246, 0.5)'
              e.currentTarget.style.boxShadow = `0 0 0 3px ${focusColor}`
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)'
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
          }}
          {...primaryHoverHandlers}
        >
          {nextLabel}
        </button>
      )}
      
      {/* Hidden help text for disabled button */}
      {nextDisabled && (
        <div 
          id="next-button-help" 
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0
          }}
        >
          Please select a topic before continuing
        </div>
      )}
    </nav>
  )
}