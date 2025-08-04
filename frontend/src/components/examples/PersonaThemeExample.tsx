import React from 'react'
import { PersonaThemeProvider, usePersonaTheme } from '../PersonaThemeProvider'
import { useAppPersonaTheme } from '../../hooks/usePersonaTheme'
import { Persona } from '../../types/persona'

// Example component that uses the persona theme context
const ThemedButton: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ 
  children, 
  onClick 
}) => {
  const { theme } = usePersonaTheme()
  
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md font-medium transition-colors text-white ${theme.primary}`}
    >
      {children}
    </button>
  )
}

// Example component that uses the app state persona theme
const AppThemedMessage: React.FC<{ message: string; isUser?: boolean }> = ({ 
  message, 
  isUser = false 
}) => {
  const { messageClasses } = useAppPersonaTheme()
  
  return (
    <div className={messageClasses(isUser)}>
      {message}
    </div>
  )
}

// Example component showing different personas
const PersonaShowcase: React.FC = () => {
  const personas: Persona[] = ['elev', 'părinte', 'profesor', 'incognito']
  
  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-bold mb-6">Persona Theme System Examples</h2>
      
      {personas.map(persona => (
        <PersonaThemeProvider key={persona} persona={persona}>
          <div className="p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">
              Persona: {persona}
            </h3>
            
            <div className="space-y-4">
              {/* Themed Button Example */}
              <div>
                <h4 className="font-medium mb-2">Themed Button:</h4>
                <ThemedButton>
                  Click me ({persona})
                </ThemedButton>
              </div>
              
              {/* Message Examples */}
              <div>
                <h4 className="font-medium mb-2">Message Examples:</h4>
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <AppThemedMessage message="This is a user message" isUser={true} />
                  </div>
                  <div className="flex justify-start">
                    <AppThemedMessage message="This is an AI response message" isUser={false} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PersonaThemeProvider>
      ))}
    </div>
  )
}

export default PersonaShowcase