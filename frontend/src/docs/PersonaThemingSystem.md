# Persona Theming System

The persona theming system provides a comprehensive way to apply persona-specific styling throughout the application. It consists of several components and utilities that work together to create a cohesive, persona-based user experience.

## Core Components

### 1. PersonaConfig Interface

Defines the structure for persona configurations including theme colors, icons, and metadata.

```typescript
interface PersonaConfig {
  name: string
  icon: LucideIcon
  theme: PersonaTheme
  description: string
  interests?: InterestArea[]
}
```

### 2. PersonaTheme Interface

Defines the color scheme for each persona:

```typescript
interface PersonaTheme {
  bg: string          // Background color
  text: string        // Text color
  primary: string     // Primary action color (buttons, etc.)
  secondary: string   // Secondary background color
  userBubble: string  // User message bubble color
  accent: string      // Accent color (borders, focus states)
}
```

## Available Personas

### Elev (Student)
- **Primary Color**: `#D0337D` (Pink)
- **Background**: `#FEEFF7` (Light pink)
- **Use Case**: Student-focused interface

### Părinte (Parent)
- **Primary Color**: `#ff4773` (Red-pink)
- **Background**: `#FFF0F3` (Light red-pink)
- **Use Case**: Parent-focused interface

### Profesor (Teacher)
- **Primary Color**: `#9a6ae1` (Purple)
- **Background**: `#F5F0FF` (Light purple)
- **Use Case**: Teacher/educator interface

### Incognito
- **Primary Color**: `#4B5563` (Gray)
- **Background**: `#F9FAFB` (Light gray)
- **Use Case**: Anonymous/neutral interface

## Usage

### 1. PersonaThemeProvider

Wrap your components with the PersonaThemeProvider to provide persona context:

```tsx
import { PersonaThemeProvider } from '../components/PersonaThemeProvider'

<PersonaThemeProvider persona="elev">
  <YourComponent />
</PersonaThemeProvider>
```

### 2. usePersonaTheme Hook

Access the current persona theme within components:

```tsx
import { usePersonaTheme } from '../components/PersonaThemeProvider'

const MyComponent = () => {
  const { persona, theme, cssProperties } = usePersonaTheme()
  
  return (
    <div className={theme.bg}>
      <button className={theme.primary}>
        Themed Button
      </button>
    </div>
  )
}
```

### 3. useAppPersonaTheme Hook

Access the current persona from app state with theme utilities:

```tsx
import { useAppPersonaTheme } from '../hooks/usePersonaTheme'

const MyComponent = () => {
  const { persona, buttonClasses, messageClasses } = useAppPersonaTheme()
  
  return (
    <div>
      <button className={buttonClasses('primary')}>
        App State Button
      </button>
      <div className={messageClasses(true)}>
        User message
      </div>
    </div>
  )
}
```

### 4. Utility Functions

Use utility functions for specific styling needs:

```tsx
import { 
  getPersonaButtonClasses,
  getPersonaMessageClasses,
  applyPersonaTheme 
} from '../utils/personaTheme'

// Get button classes for a specific persona
const buttonClasses = getPersonaButtonClasses('elev', 'primary')

// Get message classes
const userMessageClasses = getPersonaMessageClasses('elev', true)
const aiMessageClasses = getPersonaMessageClasses('elev', false)

// Apply any theme property
const customClasses = applyPersonaTheme('elev', 'base-class', 'secondary')
```

## State Management Integration

The persona theming system integrates with the app's state management:

### App State Structure
```typescript
interface AppState {
  // ... other state
  currentPersona: Persona | null
  selectedInterest: InterestArea | null
  onboardingCompleted: boolean
}
```

### Actions
```typescript
// Set the current persona
dispatch({ type: 'SET_PERSONA', payload: 'elev' })

// Set the selected interest
dispatch({ type: 'SET_INTEREST', payload: { label: 'Matematică', value: 'matematica' } })

// Complete onboarding
dispatch({ type: 'COMPLETE_ONBOARDING' })

// Reset onboarding state
dispatch({ type: 'RESET_ONBOARDING' })
```

## Best Practices

### 1. Component Design
- Always use the PersonaThemeProvider at the appropriate level
- Prefer utility functions over direct theme access for common patterns
- Use the `cn()` utility to merge classes properly

### 2. Styling Patterns
```tsx
// Good: Using utility functions
const buttonClasses = getPersonaButtonClasses(persona, 'primary', 'w-full')

// Good: Using theme context
const { theme } = usePersonaTheme()
const classes = cn('base-classes', theme.primary)

// Avoid: Direct color values
const classes = 'bg-[#D0337D]' // Hard to maintain
```

### 3. Responsive Design
```tsx
// Combine persona theming with responsive classes
const classes = cn(
  getPersonaButtonClasses(persona, 'primary'),
  'w-full md:w-auto',
  'text-sm md:text-base'
)
```

### 4. Accessibility
- All persona themes maintain WCAG 2.1 AA color contrast ratios
- Use semantic HTML elements alongside themed styling
- Ensure focus states are visible with persona accent colors

## Testing

The persona theming system includes comprehensive tests:

```bash
npm test -- --testPathPattern=personaTheme.test.ts
```

Tests cover:
- Theme retrieval for all personas
- Utility function behavior
- Edge cases (null persona, invalid inputs)
- CSS property extraction

## Examples

See `frontend/src/components/examples/PersonaThemeExample.tsx` for complete usage examples demonstrating:
- PersonaThemeProvider usage
- Themed components
- Message styling
- Button theming
- Integration with app state

## Migration Guide

When migrating existing components to use persona theming:

1. **Wrap with PersonaThemeProvider** (if not already in context)
2. **Replace hardcoded colors** with persona theme properties
3. **Use utility functions** for common patterns
4. **Test with all personas** to ensure proper theming
5. **Update tests** to account for persona-based styling

## Performance Considerations

- Theme calculations are memoized in the PersonaThemeProvider
- CSS custom properties are generated once per persona change
- Utility functions are pure and can be safely called in render methods
- Consider using `useMemo` for complex theme calculations in components