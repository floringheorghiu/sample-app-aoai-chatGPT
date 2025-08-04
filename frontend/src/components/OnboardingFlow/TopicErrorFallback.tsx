import React from 'react'
import { Persona } from '../../types/persona'
import { personaConfigs } from '../../config/personas'
import { LoadingSpinner } from './LoadingStates'
import styles from './TopicErrorFallback.module.css'

interface TopicErrorFallbackProps {
  persona: Persona
  error: Error
  onRetry: () => void
  onSkip: () => void
  isRetrying?: boolean
  hasRetried?: boolean
}

export const TopicErrorFallback: React.FC<TopicErrorFallbackProps> = ({
  persona,
  error,
  onRetry,
  onSkip,
  isRetrying = false,
  hasRetried = false
}) => {
  const config = personaConfigs[persona]
  
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

  const getErrorMessage = (error: Error): string => {
    if (error.message.includes('No topics found')) {
      return 'Nu am putut găsi subiectele pentru profilul tău. Poți încerca din nou sau să treci direct la chat.'
    }
    
    if (error.message.includes('Invalid topic structure')) {
      return 'Datele pentru subiectele tale nu sunt complete. Te rugăm să încerci din nou.'
    }
    
    if (error.message.includes('Network')) {
      return 'Verifică conexiunea la internet și încearcă din nou.'
    }
    
    return 'A apărut o problemă la încărcarea subiectelor. Poți încerca din nou sau să treci la chat.'
  }

  const getErrorTitle = (error: Error): string => {
    if (error.message.includes('No topics found')) {
      return 'Subiectele nu sunt disponibile'
    }
    
    if (error.message.includes('Network')) {
      return 'Problemă de conexiune'
    }
    
    return 'Eroare la încărcare'
  }

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        {/* Error Icon */}
        <div 
          className={styles.errorIcon}
          style={{ color: personaColor }}
          aria-hidden="true"
        >
          {error.message.includes('Network') ? '🌐' : '📋'}
        </div>

        {/* Error Title */}
        <h2 className={styles.errorTitle}>
          {getErrorTitle(error)}
        </h2>

        {/* Error Message */}
        <p className={styles.errorMessage}>
          {getErrorMessage(error)}
        </p>

        {/* Retry Information */}
        {hasRetried && (
          <p className={styles.retryInfo}>
            Am încercat să reîncărc datele, dar problema persistă.
          </p>
        )}

        {/* Action Buttons */}
        <div className={styles.errorActions}>
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className={styles.retryButton}
            style={{ 
              backgroundColor: isRetrying ? '#d1d5db' : personaColor,
              cursor: isRetrying ? 'not-allowed' : 'pointer'
            }}
            type="button"
            aria-describedby="retry-button-description"
          >
            {isRetrying ? (
              <>
                <LoadingSpinner size="small" />
                <span style={{ marginLeft: '8px' }}>Se încarcă...</span>
              </>
            ) : (
              'Încearcă din nou'
            )}
          </button>

          <button
            onClick={onSkip}
            className={styles.skipButton}
            type="button"
            aria-describedby="skip-button-description"
          >
            Treci la chat
          </button>
        </div>

        {/* Button Descriptions for Screen Readers */}
        <div className={styles.srOnly}>
          <div id="retry-button-description">
            Încearcă să reîncarci subiectele pentru profilul tău
          </div>
          <div id="skip-button-description">
            Sari peste selecția de subiecte și mergi direct la chat
          </div>
        </div>

        {/* Help Text */}
        <p className={styles.helpText}>
          Poți continua fără să alegi un subiect specific. Vei putea explora toate opțiunile în chat.
        </p>


      </div>
    </div>
  )
}

interface EmptyTopicsFallbackProps {
  persona: Persona
  onSkip: () => void
  onRetry: () => void
}

export const EmptyTopicsFallback: React.FC<EmptyTopicsFallbackProps> = ({
  persona,
  onSkip,
  onRetry
}) => {
  const config = personaConfigs[persona]
  
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
    <div className={styles.emptyContainer}>
      <div className={styles.emptyContent}>
        {/* Empty Icon */}
        <div 
          className={styles.emptyIcon}
          style={{ color: personaColor }}
          aria-hidden="true"
        >
          📝
        </div>

        {/* Empty Title */}
        <h2 className={styles.emptyTitle}>
          Nu sunt subiecte disponibile
        </h2>

        {/* Empty Message */}
        <p className={styles.emptyMessage}>
          Pentru profilul tău ({config?.name}) nu sunt configurate subiecte specifice în acest moment.
        </p>

        {/* Action Buttons */}
        <div className={styles.emptyActions}>
          <button
            onClick={onRetry}
            className={styles.retryButton}
            style={{ backgroundColor: personaColor }}
            type="button"
          >
            Verifică din nou
          </button>

          <button
            onClick={onSkip}
            className={styles.skipButton}
            type="button"
          >
            Continuă la chat
          </button>
        </div>

        {/* Help Text */}
        <p className={styles.helpText}>
          Poți continua direct la chat unde vei avea acces la toate funcționalitățile asistentului.
        </p>
      </div>
    </div>
  )
}