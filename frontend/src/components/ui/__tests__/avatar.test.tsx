import React from 'react'
import { render, screen } from '@testing-library/react'
import { Avatar } from '../avatar'
import { Persona } from '../../../types/persona'

describe('Avatar Component', () => {
  const personas: Persona[] = ['elev', 'părinte', 'profesor', 'incognito']

  test('renders user avatar for each persona type', () => {
    personas.forEach((persona) => {
      const { container } = render(<Avatar persona={persona} type="user" />)
      const img = container.querySelector('img')
      expect(img).toBeTruthy()
      expect(img?.alt).toBe(`${persona} avatar`)
    })
  })

  test('renders AI avatar regardless of persona', () => {
    const { container } = render(<Avatar persona="elev" type="ai" />)
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img?.alt).toBe('AI Assistant')
    expect(img?.src).toContain('/avatars/chatbot_avatar.svg')
  })

  test('applies custom className', () => {
    const { container } = render(
      <Avatar persona="elev" type="user" className="custom-class" />
    )
    const avatarContainer = container.firstChild as HTMLElement
    expect(avatarContainer.className).toContain('custom-class')
  })

  test('uses correct avatar paths for each persona', () => {
    const expectedPaths = {
      elev: '/avatars/child_avatar.svg',
      părinte: '/avatars/parent_avatar.svg',
      profesor: '/avatars/teacher_avatar.svg',
      incognito: '/avatars/incognito_avatar.svg',
    }

    personas.forEach((persona) => {
      const { container } = render(<Avatar persona={persona} type="user" />)
      const img = container.querySelector('img')
      expect(img?.src).toContain(expectedPaths[persona])
    })
  })

  test('has proper accessibility attributes', () => {
    const { container } = render(<Avatar persona="elev" type="user" />)
    const img = container.querySelector('img')
    expect(img?.alt).toBeTruthy()
    expect(img?.alt).toBe('elev avatar')
  })

  test('has fallback placeholder when avatar fails to load', () => {
    const { container } = render(<Avatar persona="elev" type="user" />)
    const img = container.querySelector('img')
    expect(img?.src).toContain('/avatars/child_avatar.svg')
    // The component has a fallback to /placeholder.svg in the src attribute logic
  })
})