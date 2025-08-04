import React, { useState, useEffect } from 'react'
import { personaConfigs } from '../../config/personas'
import { Persona } from '../../types/persona'
import styles from './PersonaSelection.module.css'

interface PersonaSelectionProps {
  onSelect: (persona: Persona) => void
}

export const PersonaSelection: React.FC<PersonaSelectionProps> = ({ onSelect }) => {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [personasVisible, setPersonasVisible] = useState(false)
  const personas: Persona[] = ['elev', 'părinte', 'profesor', 'incognito']

  useEffect(() => {
    // Trigger staggered appearance animation
    const timer = setTimeout(() => {
      setPersonasVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handlePersonaClick = (persona: Persona) => {
    setSelectedPersona(persona)
  }

  const handleContinue = () => {
    if (selectedPersona) {
      onSelect(selectedPersona)
    }
  }

  // Handle keyboard navigation between persona cards
  const handleKeyDown = (e: React.KeyboardEvent, persona: Persona) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handlePersonaClick(persona)
    }
    
    // Arrow key navigation
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const cards = document.querySelectorAll('[role="radio"]')
      const currentIndex = Array.from(cards).indexOf(e.currentTarget as Element)
      let nextIndex = currentIndex
      
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0
      }
      
      (cards[nextIndex] as HTMLElement)?.focus()
    }
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      margin: '0',
      padding: '40px 24px',
      background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '480px', width: '100%', backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
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
            Bună, eu sunt asistentul tău!
          </h1>
          <p style={{ fontSize: '15px', color: '#666', marginBottom: '24px', lineHeight: '1.5', fontFamily: 'Poppins, sans-serif' }}>
            Te rog selectează o opțiune de mai jos pentru a te putea cunoaște mai bine.
          </p>
          <h2 
            id="persona-selection-heading"
            style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', textAlign: 'left', fontFamily: 'Poppins, sans-serif' }}
          >
            Aș dori să știu dacă ești:
          </h2>
        </header>

        {/* Persona Grid */}
        <main>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className={styles.srOnly}>
              Select your role
            </legend>
            <div 
              role="radiogroup"
              aria-labelledby="persona-selection-heading"
              className={`${styles.personasGrid} ${personasVisible ? styles.personasVisible : ''}`}
            >
              {personas.map((persona, index) => {
                const config = personaConfigs[persona]
                const IconComponent = config.icon
                const isSelected = selectedPersona === persona
                const personaId = `persona-${persona}`

                return (
                  <div
                    key={persona}
                    className={styles.personaCardWrapper}
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    <div
                      role="radio"
                      tabIndex={0}
                      aria-checked={isSelected}
                      aria-labelledby={personaId}
                      className={`${styles.personaCard} ${isSelected ? styles.selected : ''}`}
                      onClick={() => handlePersonaClick(persona)}
                      onKeyDown={(e) => handleKeyDown(e, persona)}
                    >
                      {/* Radio button in top-right corner */}
                      <div 
                        aria-hidden="true"
                        className={`${styles.radioButton} ${isSelected ? styles.selected : ''}`}
                      >
                        {isSelected && (
                          <div className={styles.radioButtonInner}></div>
                        )}
                      </div>

                      {/* Icon and content */}
                      <div className={styles.personaContent}>
                        <div className={styles.personaIcon}>
                          <IconComponent 
                            style={{ width: '24px', height: '24px', color: '#e91e63' }} 
                            aria-hidden="true"
                          />
                        </div>
                        <div className={styles.personaText}>
                          <div 
                            id={personaId}
                            className={styles.personaName}
                          >
                            {config.name}
                          </div>
                          <div className={styles.personaDescription}>
                            {persona === 'elev' && 'elev de gimnaziu'}
                            {persona === 'părinte' && 'părinte de elev'}
                            {persona === 'profesor' && 'învățător sau profesor'}
                            {persona === 'incognito' && 'prefer să nu spun'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </fieldset>
        </main>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedPersona}
          aria-label={!selectedPersona ? 'Continue - Please select your role first' : 'Continue to next step'}
          style={{
            width: '100%',
            fontWeight: '500',
            padding: '16px 32px',
            borderRadius: '25px',
            border: 'none',
            cursor: selectedPersona ? 'pointer' : 'not-allowed',
            backgroundColor: selectedPersona ? '#e91e63' : '#e0e0e0',
            color: selectedPersona ? 'white' : '#4a4a4a',
            transition: 'all 0.2s',
            fontSize: '16px',
            marginTop: '20px',
            fontFamily: 'Poppins, sans-serif',
            outline: 'none'
          }}
          onFocus={(e) => {
            if (selectedPersona) {
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(233, 30, 99, 0.5)'
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none'
          }}
          onMouseEnter={(e) => {
            if (selectedPersona) {
              e.currentTarget.style.backgroundColor = '#d81b60'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedPersona) {
              e.currentTarget.style.backgroundColor = '#e91e63'
            }
          }}
        >
          Continuă
        </button>
      </div>
    </div>
  )
}