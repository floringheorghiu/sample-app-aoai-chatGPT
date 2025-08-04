import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { OnboardingErrorBoundary } from '../OnboardingErrorBoundary'

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('OnboardingErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <OnboardingErrorBoundary>
        <ThrowError shouldThrow={false} />
      </OnboardingErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <OnboardingErrorBoundary>
        <ThrowError shouldThrow={true} />
      </OnboardingErrorBoundary>
    )

    expect(screen.getByText('Oops! Ceva nu a mers bine')).toBeInTheDocument()
    expect(screen.getByText(/Ne pare rău, dar a apărut o problemă tehnică/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /încearcă din nou/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /treci la chat/i })).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()
    
    render(
      <OnboardingErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </OnboardingErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('applies persona-specific styling', () => {
    render(
      <OnboardingErrorBoundary persona="elev">
        <ThrowError shouldThrow={true} />
      </OnboardingErrorBoundary>
    )

    const retryButton = screen.getByRole('button', { name: /încearcă din nou/i })
    expect(retryButton).toHaveStyle({ backgroundColor: '#D0337D' })
  })

  it('has functional retry button', () => {
    render(
      <OnboardingErrorBoundary>
        <ThrowError shouldThrow={true} />
      </OnboardingErrorBoundary>
    )

    expect(screen.getByText('Oops! Ceva nu a mers bine')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /încearcă din nou/i })
    expect(retryButton).toBeInTheDocument()
    
    // Should be clickable without throwing
    expect(() => fireEvent.click(retryButton)).not.toThrow()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <OnboardingErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </OnboardingErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Oops! Ceva nu a mers bine')).not.toBeInTheDocument()
  })

  it('handles skip to chat functionality', () => {
    // Mock window.location.hash
    delete (window as any).location
    ;(window as any).location = { hash: '' }

    render(
      <OnboardingErrorBoundary>
        <ThrowError shouldThrow={true} />
      </OnboardingErrorBoundary>
    )

    const skipButton = screen.getByRole('button', { name: /treci la chat/i })
    fireEvent.click(skipButton)

    expect(window.location.hash).toBe('#/chat')
  })
})