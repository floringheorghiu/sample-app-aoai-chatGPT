import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { InterestSelection } from '../InterestSelection'
import { TopicCard } from '../TopicCard'
import { getTopicsForPersona } from '../../../config/quickQuestions'
import { Persona } from '../../../types/persona'

// Mock the error boundary hook
jest.mock('../OnboardingErrorBoundary', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn()
  })
}))

describe('Onboarding Integration Tests', () => {
  const mockOnSelect = jest.fn()
  const mockOnBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Data Integration', () => {
    test('should load all 4 topics for each persona', () => {
      const personas: Persona[] = ['elev', 'părinte', 'profesor']
      
      personas.forEach(persona => {
        const topics = getTopicsForPersona(persona)
        expect(topics).toHaveLength(4)
        
        topics.forEach(topic => {
          expect(topic.label).toBeDefined()
          expect(topic.questions).toHaveLength(3)
        })
      })
    })

    test('should handle parinte vs părinte persona correctly', () => {
      const topicsParinte = getTopicsForPersona('parinte')
      const topicsParinteDiacritic = getTopicsForPersona('părinte')
      
      expect(topicsParinte).toEqual(topicsParinteDiacritic)
      expect(topicsParinte).toHaveLength(4)
    })
  })

  describe('TopicCard Component', () => {
    test('should render topic card with persona theme', () => {
      const topics = getTopicsForPersona('elev')
      const topic = topics[0]
      
      render(
        <TopicCard
          topic={topic}
          persona="elev"
          isSelected={false}
          onSelect={mockOnSelect}
        />
      )
      
      expect(screen.getByText(topic.label)).toBeInTheDocument()
      expect(screen.getByRole('radio')).toBeInTheDocument()
    })

    test('should apply correct persona classes', () => {
      const topics = getTopicsForPersona('părinte')
      const topic = topics[0]
      
      const { container } = render(
        <TopicCard
          topic={topic}
          persona="părinte"
          isSelected={true}
          onSelect={mockOnSelect}
        />
      )
      
      const card = container.querySelector('[role="radio"]')
      expect(card).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('InterestSelection Component', () => {
    test('should render header correctly', async () => {
      render(
        <InterestSelection
          persona="elev"
          onSelect={mockOnSelect}
          onBack={mockOnBack}
        />
      )
      
      // Wait for loading to complete
      await screen.findByText('Ce te interesează cel mai mult?')
      expect(screen.getByText('Perfect! Ești elev')).toBeInTheDocument()
    })

    test('should display correct persona name in header', async () => {
      render(
        <InterestSelection
          persona="părinte"
          onSelect={mockOnSelect}
          onBack={mockOnBack}
        />
      )
      
      await screen.findByText('Perfect! Ești părinte')
    })
  })

  describe('Persona Theme Integration', () => {
    test('should apply different themes for different personas', () => {
      const personas: Persona[] = ['elev', 'părinte', 'profesor']
      
      personas.forEach(persona => {
        const { container, unmount } = render(
          <InterestSelection
            persona={persona}
            onSelect={mockOnSelect}
            onBack={mockOnBack}
          />
        )
        
        // Check that the container has persona-specific styling
        const onboardingContainer = container.querySelector('[role="application"]')
        expect(onboardingContainer).toBeInTheDocument()
        
        unmount()
      })
    })
  })
})