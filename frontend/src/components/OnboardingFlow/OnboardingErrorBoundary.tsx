import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Persona } from '../../types/persona'
import { personaConfigs } from '../../config/personas'
import styles from './OnboardingErrorBoundary.module.css'

interface Props {
  children: ReactNode
  persona?: Persona
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error for debugging
    console.error('OnboardingErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleSkip = () => {
    // Navigate to chat without completing onboarding
    window.location.hash = '#/chat'
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      const persona = this.props.persona
      const config = persona ? personaConfigs[persona] : null
      
      // Extract color from theme primary class
      const getPersonaColor = (config: any): string => {
        if (!config?.theme?.primary) return '#e91e63'
        
        // Extract hex color from Tailwind class
        if (config.theme.primary.includes('#D0337D')) return '#D0337D'
        if (config.theme.primary.includes('#ff4773')) return '#ff4773'
        if (config.theme.primary.includes('#9a6ae1')) return '#9a6ae1'
        return '#e91e63'
      }
      
      const personaColor = getPersonaColor(config)

      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorContent}>
            {/* Logo */}
            <div className={styles.logoContainer}>
              <img 
                src="/narada-logo.svg" 
                alt="Narada AI Assistant Logo" 
                className={styles.logo}
              />
            </div>

            {/* Error Icon */}
            <div 
              className={styles.errorIcon}
              style={{ color: personaColor }}
              aria-hidden="true"
            >
              ⚠️
            </div>

            {/* Error Message */}
            <h1 className={styles.errorTitle}>
              Oops! Ceva nu a mers bine
            </h1>
            
            <p className={styles.errorMessage}>
              Ne pare rău, dar a apărut o problemă tehnică. Poți încerca din nou sau să treci direct la chat.
            </p>



            {/* Action Buttons */}
            <div className={styles.errorActions}>
              <button
                onClick={this.handleRetry}
                className={styles.retryButton}
                style={{ backgroundColor: personaColor }}
                type="button"
              >
                Încearcă din nou
              </button>
              
              <button
                onClick={this.handleSkip}
                className={styles.skipButton}
                type="button"
              >
                Treci la chat
              </button>
            </div>

            {/* Help Text */}
            <p className={styles.helpText}>
              Dacă problema persistă, poți reîncărca pagina sau să contactezi suportul.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleError = React.useCallback((error: Error) => {
    setError(error)
    console.error('Error caught by useErrorHandler:', error)
  }, [])

  // Throw error to be caught by error boundary
  if (error) {
    throw error
  }

  return { handleError, resetError }
}