import React from 'react'
import { Persona } from '../../types/persona'
import { QuickQuestionTopic } from '../../config/quickQuestions'
import { createPersonaThemeUtils } from '../../utils/personaTheme'
import styles from './TopicCard.module.css'

interface TopicCardProps {
  topic: QuickQuestionTopic
  persona: Persona
  isSelected: boolean
  onSelect: (topicLabel: string) => void
  className?: string
}

export const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  persona,
  isSelected,
  onSelect,
  className = ''
}) => {
  // Use persona theme utilities
  const themeUtils = createPersonaThemeUtils(persona)
  
  // Map persona names to CSS class names (handle diacritic differences)
  const getPersonaClass = (persona: Persona): string => {
    switch (persona) {
      case 'elev':
        return 'elev'
      case 'părinte':
        return 'parinte'
      case 'profesor':
        return 'profesor'
      default:
        return 'elev'
    }
  }

  const personaClass = getPersonaClass(persona)
  
  const cardClasses = [
    styles.topicCard,
    isSelected ? styles.selected : '',
    isSelected ? styles[personaClass] : '',
    className
  ].filter(Boolean).join(' ')

  const radioClasses = [
    styles.radioButton,
    isSelected ? styles.selected : '',
    isSelected ? styles[personaClass] : ''
  ].filter(Boolean).join(' ')

  // Generate unique IDs for accessibility
  const topicId = `topic-${topic.label.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`
  const descriptionId = `${topicId}-description`

  return (
    <div
      className={cardClasses}
      style={themeUtils.cssProperties}
      onClick={() => onSelect(topic.label)}
      tabIndex={0}
      role="radio"
      aria-checked={isSelected}
      aria-labelledby={topicId}
      aria-describedby={descriptionId}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(topic.label)
        }
        // Arrow key navigation support
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
      }}
    >
      {/* Radio button in top-right corner */}
      <div 
        className={radioClasses}
        aria-hidden="true"
      >
        {isSelected && (
          <div className={styles.radioButtonInner}></div>
        )}
      </div>

      {/* Topic content */}
      <div className={styles.topicContent}>
        <div 
          id={topicId}
          className={styles.topicLabel}
        >
          {topic.label}
        </div>
        {/* Hidden description for screen readers */}
        <div 
          id={descriptionId}
          className={styles.srOnly}
        >
          {isSelected ? 'Selected topic' : 'Topic option'}. Press Enter or Space to select this topic.
        </div>
      </div>
    </div>
  )
}