import React from 'react'
import { render, screen } from '@testing-library/react'
import { Avatar } from '../avatar'
import { getPersonaConfig } from '../../../config/personas'
import { getPersonaTheme } from '../../../utils/personaTheme'
import { Persona } from '../../../types/persona'

describe('Avatar Integration with Persona Theme System', () => {
  const personas: Persona[] = ['elev', 'părinte', 'profesor', 'incognito']

  test('Avatar component works with all configured personas', () => {
    personas.forEach((persona) => {
      const config = getPersonaConfig(persona)
      expect(config).toBeTruthy()
      expect(config?.name).toBeTruthy()
      
      // Test that Avatar renders without errors for each persona
      const { container } = render(<Avatar persona={persona} type="user" />)
      const img = container.querySelector('img')
      expect(img).toBeTruthy()
      expect(img?.alt).toBe(`${persona} avatar`)
    })
  })

  test('Avatar integrates with persona theme system', () => {
    personas.forEach((persona) => {
      const theme = getPersonaTheme(persona)
      expect(theme).toBeTruthy()
      expect(theme.primary).toBeTruthy()
      expect(theme.userBubble).toBeTruthy()
      
      // Test that Avatar can be used alongside theme classes
      const { container } = render(
        <div className={`${theme.bg} ${theme.text}`}>
          <Avatar persona={persona} type="user" />
          <div className={theme.userBubble}>Message bubble</div>
        </div>
      )
      
      const avatar = container.querySelector('img')
      expect(avatar).toBeTruthy()
    })
  })

  test('Avatar paths match expected persona avatars', () => {
    const expectedAvatarPaths = {
      elev: '/avatars/child_avatar.svg',
      părinte: '/avatars/parent_avatar.svg',
      profesor: '/avatars/teacher_avatar.svg',
      incognito: '/avatars/incognito_avatar.svg'
    }

    personas.forEach((persona) => {
      const { container } = render(<Avatar persona={persona} type="user" />)
      const img = container.querySelector('img')
      expect(img?.src).toContain(expectedAvatarPaths[persona])
    })
  })

  test('AI avatar is consistent across all personas', () => {
    personas.forEach((persona) => {
      const { container } = render(<Avatar persona={persona} type="ai" />)
      const img = container.querySelector('img')
      expect(img?.src).toContain('/avatars/chatbot_avatar.svg')
      expect(img?.alt).toBe('AI Assistant')
    })
  })

  test('Avatar component maintains accessibility with persona themes', () => {
    personas.forEach((persona) => {
      const { container } = render(<Avatar persona={persona} type="user" />)
      const img = container.querySelector('img')
      
      // Check accessibility attributes
      expect(img?.alt).toBeTruthy()
      expect(img?.alt).toBe(`${persona} avatar`)
      
      // Check that the avatar container has proper structure
      const avatarContainer = container.firstChild as HTMLElement
      expect(avatarContainer.className).toContain('flex-shrink-0')
      
      const avatarCircle = avatarContainer.firstChild as HTMLElement
      expect(avatarCircle.className).toContain('rounded-full')
      expect(avatarCircle.className).toContain('bg-white')
    })
  })

  test('Avatar component can be styled with custom classes while maintaining persona compatibility', () => {
    const customClass = 'custom-avatar-size'
    const { container } = render(
      <Avatar persona="elev" type="user" className={customClass} />
    )
    
    const avatarContainer = container.firstChild as HTMLElement
    expect(avatarContainer.className).toContain(customClass)
    expect(avatarContainer.className).toContain('flex-shrink-0')
  })
})