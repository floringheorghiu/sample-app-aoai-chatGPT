import React, { useContext } from 'react'
import { AppStateContext } from '../state/AppProvider'
import { OnboardingFlow } from './OnboardingFlow'
import { OnboardingData } from '../types/persona'
import { PersonaThemeProvider } from './PersonaThemeProvider'
import Chat from '../pages/chat/Chat'

export const ChatWithOnboarding: React.FC = () => {
  const appStateContext = useContext(AppStateContext)
  
  if (!appStateContext) {
    return <div>Loading...</div>
  }

  const { onboardingCompleted, currentPersona } = appStateContext.state

  const handleOnboardingComplete = (data: OnboardingData) => {
    // The onboarding flow already updates the app state
    // This handler is called when onboarding is complete
    console.log('Onboarding completed with data:', data)
  }

  // Show onboarding flow if not completed
  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  // Show chat interface with persona theme if onboarding is completed
  return (
    <PersonaThemeProvider persona={currentPersona}>
      <Chat />
    </PersonaThemeProvider>
  )
}