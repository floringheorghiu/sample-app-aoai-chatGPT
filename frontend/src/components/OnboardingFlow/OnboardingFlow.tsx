import React, { useState, useContext } from 'react'
import { PersonaSelection } from './PersonaSelection'
import { InterestSelection } from './InterestSelection'
import { PageTransition } from './PageTransition'
import { OnboardingErrorBoundary } from './OnboardingErrorBoundary'
import { OnboardingData, Persona, InterestArea } from '../../types/persona'
import { AppStateContext } from '../../state/AppProvider'

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void
}

type OnboardingStep = 'persona' | 'interest' | 'complete'

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('persona')
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [selectedInterest, setSelectedInterest] = useState<InterestArea | null>(null)
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward')
  const appStateContext = useContext(AppStateContext)

  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona)
    
    // Update app state immediately
    appStateContext?.dispatch({ type: 'SET_PERSONA', payload: persona })
    
    // If incognito, skip interest selection and complete onboarding
    if (persona === 'incognito') {
      const onboardingData: OnboardingData = {
        persona,
        interest: null,
        selectedTopicLabel: null
      }
      
      appStateContext?.dispatch({ type: 'COMPLETE_ONBOARDING' })
      onComplete(onboardingData)
    } else {
      // Move to interest selection for other personas
      setTransitionDirection('forward')
      setCurrentStep('interest')
    }
  }

  const handleInterestSelect = (interest: InterestArea, topicLabel: string) => {
    setSelectedInterest(interest)
    
    // Update app state
    appStateContext?.dispatch({ type: 'SET_INTEREST', payload: interest })
    
    const onboardingData: OnboardingData = {
      persona: selectedPersona,
      interest,
      selectedTopicLabel: topicLabel
    }
    
    appStateContext?.dispatch({ type: 'COMPLETE_ONBOARDING' })
    onComplete(onboardingData)
  }

  const handleBack = () => {
    if (currentStep === 'interest') {
      setTransitionDirection('backward')
      setCurrentStep('persona')
      setSelectedInterest(null)
    }
  }

  return (
    <OnboardingErrorBoundary 
      persona={selectedPersona || undefined}
      onError={(error, errorInfo) => {
        console.error('OnboardingFlow Error:', error, errorInfo)
        // Could send to error reporting service here
      }}
    >
      <div className="min-h-screen">
        <PageTransition 
          transitionKey={currentStep} 
          direction={transitionDirection}
        >
          {currentStep === 'persona' && (
            <OnboardingErrorBoundary persona={undefined}>
              <PersonaSelection onSelect={handlePersonaSelect} />
            </OnboardingErrorBoundary>
          )}
          
          {currentStep === 'interest' && selectedPersona && (
            <OnboardingErrorBoundary persona={selectedPersona}>
              <InterestSelection
                persona={selectedPersona}
                onSelect={handleInterestSelect}
                onBack={handleBack}
              />
            </OnboardingErrorBoundary>
          )}
        </PageTransition>
      </div>
    </OnboardingErrorBoundary>
  )
}