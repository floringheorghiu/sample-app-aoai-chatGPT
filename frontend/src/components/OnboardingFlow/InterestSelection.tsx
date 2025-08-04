import React, { useState, useEffect } from 'react'
import { personaConfigs } from '../../config/personas'
import { Persona, InterestArea } from '../../types/persona'
import { getTopicsForPersona } from '../../config/quickQuestions'
import { OnboardingContainer } from './OnboardingContainer'
import { TopicCard } from './TopicCard'
import { NavigationControls } from './NavigationControls'
import { SkeletonGrid } from './LoadingStates'
import { TopicErrorFallback, EmptyTopicsFallback } from './TopicErrorFallback'
import { useErrorHandler } from './OnboardingErrorBoundary'
import styles from './InterestSelection.module.css'

interface InterestSelectionProps {
  persona: Persona
  onSelect: (interest: InterestArea, topicLabel: string) => void
  onBack: () => void
}

export const InterestSelection: React.FC<InterestSelectionProps> = ({ 
  persona, 
  onSelect, 
  onBack 
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [topicsVisible, setTopicsVisible] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasRetried, setHasRetried] = useState(false)
  
  const config = personaConfigs[persona]
  const { handleError: handleComponentError } = useErrorHandler()
  
  // Get topics from configuration using the helper function
  const topics = getTopicsForPersona(persona)

  useEffect(() => {
    // Simulate loading time for smooth transition and validate topics
    const loadingTimer = setTimeout(() => {
      try {
        if (!topics || topics.length === 0) {
          throw new Error(`No topics found for persona: ${persona}`)
        }

        // Validate topic structure
        const invalidTopics = topics.filter(topic => 
          !topic.label || 
          !topic.questions || 
          !Array.isArray(topic.questions) || 
          topic.questions.length === 0
        )

        if (invalidTopics.length > 0) {
          throw new Error(`Invalid topic structure found for persona: ${persona}`)
        }

        setIsLoading(false)
        setError(null)
        
        // Stagger the appearance of topics
        const visibilityTimer = setTimeout(() => {
          setTopicsVisible(true)
        }, 100)
        return () => clearTimeout(visibilityTimer)
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Unknown error occurred')
        setError(errorObj)
        setIsLoading(false)
        console.error('Topic loading error:', errorObj)
      }
    }, 300)

    return () => clearTimeout(loadingTimer)
  }, [persona, topics, hasRetried])

  const handleTopicSelect = (topicLabel: string) => {
    setSelectedTopic(topicLabel)
  }

  const handleStartChat = () => {
    if (selectedTopic) {
      try {
        // Create an InterestArea object from the topic
        const interest: InterestArea = {
          label: selectedTopic,
          value: selectedTopic.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
        }
        
        onSelect(interest, selectedTopic)
      } catch (error) {
        handleComponentError(error instanceof Error ? error : new Error('Failed to start chat'))
      }
    }
  }

  const handleRetry = () => {
    setSelectedTopic(null)
    setTopicsVisible(false)
    setIsLoading(true)
    setError(null)
    setHasRetried(true)
  }

  const handleSkipToChat = () => {
    try {
      // Skip topic selection and go directly to chat
      const defaultInterest: InterestArea = {
        label: 'General',
        value: 'general'
      }
      onSelect(defaultInterest, 'General')
    } catch (error) {
      handleComponentError(error instanceof Error ? error : new Error('Failed to skip to chat'))
    }
  }



  return (
    <OnboardingContainer persona={persona}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <img 
            src="/narada-logo.svg" 
            alt="Narada AI Assistant Logo" 
            style={{ height: '32px', width: 'auto' }}
          />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', marginBottom: '12px', lineHeight: '1.3', fontFamily: 'Poppins, sans-serif' }}>
          Perfect! Ești {config.name.toLowerCase()}
        </h1>
        <p style={{ fontSize: '15px', color: '#666', marginBottom: '24px', lineHeight: '1.5', fontFamily: 'Poppins, sans-serif' }}>
          Acum să vedem cu ce te putem ajuta. Alege subiectul care te interesează cel mai mult:
        </p>
        <h2 
          id="topic-selection-heading"
          style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', textAlign: 'left', fontFamily: 'Poppins, sans-serif' }}
        >
          Ce te interesează cel mai mult?
        </h2>
      </header>

      {/* Topics Grid - 2x2 layout matching persona selection */}
      <main>
        {/* Error State */}
        {error && !isLoading && (
          <TopicErrorFallback
            persona={persona}
            error={error}
            onRetry={handleRetry}
            onSkip={handleSkipToChat}
            isRetrying={isLoading}
            hasRetried={hasRetried}
          />
        )}

        {/* Empty State */}
        {!error && !isLoading && topics.length === 0 && (
          <EmptyTopicsFallback
            persona={persona}
            onRetry={handleRetry}
            onSkip={handleSkipToChat}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className={styles.srOnly}>Loading topics for your profile</legend>
            <SkeletonGrid persona={persona} count={4} />
          </fieldset>
        )}

        {/* Success State - Topics Grid */}
        {!error && !isLoading && topics.length > 0 && (
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className={styles.srOnly}>Select your area of interest</legend>
            
            <div 
              role="radiogroup"
              aria-labelledby="topic-selection-heading"
              aria-describedby="topic-selection-instructions"
              className={`${styles.topicsGrid} ${topicsVisible ? styles.topicsVisible : ''}`}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}
            >
              {topics.map((topic, index) => (
                <div
                  key={index}
                  className={styles.topicCardWrapper}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <TopicCard
                    topic={topic}
                    persona={persona}
                    isSelected={selectedTopic === topic.label}
                    onSelect={handleTopicSelect}
                  />
                </div>
              ))}
            </div>
            
            {/* Hidden instructions for screen readers */}
            <div 
              id="topic-selection-instructions"
              className={styles.srOnly}
            >
              Use arrow keys to navigate between topics. Press Enter or Space to select a topic.
            </div>
          </fieldset>
        )}
      </main>

      {/* Footer Navigation - Only show when topics are loaded successfully */}
      {!error && !isLoading && topics.length > 0 && (
        <NavigationControls
          onBack={onBack}
          onNext={handleStartChat}
          nextLabel="Start Chat"
          nextDisabled={!selectedTopic}
          persona={persona}
        />
      )}
    </OnboardingContainer>
  )
}