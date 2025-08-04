/**
 * Example usage of useOnboardingState hook
 * This demonstrates how to use the enhanced onboarding state management
 */

import { useOnboardingState } from './useOnboardingState'

// Example component that uses the onboarding state
export const OnboardingExample = () => {
  const { state, actions } = useOnboardingState()

  // Example: Handle persona selection
  const handlePersonaSelection = (persona: 'elev' | 'părinte' | 'profesor' | 'incognito') => {
    actions.setPersona(persona)
    console.log('Available topics:', state.availableTopics)
    console.log('Persona greeting:', state.personaGreeting)
  }

  // Example: Handle topic selection
  const handleTopicSelection = (topicLabel: string) => {
    actions.setTopicByLabel(topicLabel)
    console.log('Selected topic:', state.selectedTopic)
    console.log('Quick questions:', state.quickQuestions)
    console.log('Warm-up prompt:', state.warmUpPrompt)
  }

  // Example: Complete onboarding and get context for chat
  const handleCompleteOnboarding = () => {
    if (actions.canCompleteOnboarding()) {
      const context = actions.generateContext()
      actions.completeOnboarding()
      
      // This context would be passed to the chat interface
      console.log('Onboarding context for OpenAI:', context)
      
      // Example of what gets passed to chat:
      if (context) {
        // Send warm-up prompt to OpenAI to set conversation context
        console.log('Warm-up prompt for OpenAI:', context.warmUpPrompt)
        
        // Display quick questions in chat UI
        console.log('Quick questions for chat UI:', context.quickQuestions)
        
        // Apply persona theming
        console.log('Persona for theming:', context.persona)
      }
    }
  }

  // Example: Reset onboarding
  const handleResetOnboarding = () => {
    actions.resetOnboarding()
    console.log('Onboarding reset')
  }

  return {
    // State
    currentPersona: state.currentPersona,
    selectedTopic: state.selectedTopic,
    availableTopics: state.availableTopics,
    onboardingCompleted: state.onboardingCompleted,
    warmUpPrompt: state.warmUpPrompt,
    quickQuestions: state.quickQuestions,
    personaGreeting: state.personaGreeting,
    
    // Actions
    handlePersonaSelection,
    handleTopicSelection,
    handleCompleteOnboarding,
    handleResetOnboarding,
    
    // Utility checks
    canComplete: actions.canCompleteOnboarding(),
    isPersonaSelected: actions.isPersonaSelected(),
    isTopicSelected: actions.isTopicSelected()
  }
}

// Example usage in a React component:
/*
const OnboardingComponent = () => {
  const {
    currentPersona,
    selectedTopic,
    availableTopics,
    warmUpPrompt,
    quickQuestions,
    handlePersonaSelection,
    handleTopicSelection,
    handleCompleteOnboarding,
    canComplete
  } = OnboardingExample()

  return (
    <div>
      {!currentPersona && (
        <div>
          <h2>Select your persona:</h2>
          <button onClick={() => handlePersonaSelection('elev')}>Student</button>
          <button onClick={() => handlePersonaSelection('părinte')}>Parent</button>
          <button onClick={() => handlePersonaSelection('profesor')}>Teacher</button>
        </div>
      )}
      
      {currentPersona && !selectedTopic && (
        <div>
          <h2>Select your interest:</h2>
          {availableTopics.map(topic => (
            <button 
              key={topic.label} 
              onClick={() => handleTopicSelection(topic.label)}
            >
              {topic.label}
            </button>
          ))}
        </div>
      )}
      
      {canComplete && (
        <button onClick={handleCompleteOnboarding}>
          Start Chat
        </button>
      )}
      
      {warmUpPrompt && (
        <div>
          <h3>Generated Context:</h3>
          <p>{warmUpPrompt}</p>
        </div>
      )}
      
      {quickQuestions.length > 0 && (
        <div>
          <h3>Quick Questions:</h3>
          <ul>
            {quickQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
*/