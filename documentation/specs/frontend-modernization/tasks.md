# Implementation Plan

- [x] 1. Set up modern design system foundation
  - Install Radix UI, Tailwind CSS, and supporting dependencies in FEv1
  - Configure Tailwind with FEv2's color palette and theme system
  - Create base component library (Button, Input, Card, Dialog) using Radix primitives
  - Set up persona configuration system with TypeScript interfaces
  - _Requirements: 1.1, 1.2, 7.1_

- [x] 2. Create persona theming system
  - Implement PersonaConfig interface and theme definitions from FEv2
  - Create theme provider component for persona-based styling
  - Add persona state management to existing AppStateContext
  - Write utility functions for dynamic theme application
  - _Requirements: 1.3, 2.2, 7.2_

- [x] 3. Build onboarding flow components
  - Create OnboardingFlow component with step-based navigation
  - Implement persona selection interface with 2x2 grid layout
  - Add interest area selection component for non-incognito personas
  - Create onboarding completion handler that integrates with existing chat initialization
  - _Requirements: 2.1, 2.3, 6.1_

- [ ] 4. Integrate Romanian localization system
  - Extract all Romanian text from FEv2 into localization constants
  - Replace hardcoded English text in FEv1 with Romanian equivalents
  - Implement localization for onboarding flow, chat interface, and error messages
  - Create localization utility functions for dynamic text generation
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 5. Modernize chat message components
  - Rebuild ChatMessage component using Radix UI and Tailwind styling
  - Implement persona-based message bubble theming
  - Add streaming message indicator and enhanced message formatting
  - Create message timestamp and status indicators matching FEv2 design
  - _Requirements: 3.1, 3.2, 7.1_

- [ ] 6. Implement enhanced feedback system
  - Create MessageFeedback component with thumbs up/down and flag functionality
  - Add rating state management to message objects
  - Implement feedback submission integration with existing backend
  - Create feedback UI that matches FEv2's design and behavior
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 7. Build citation panel functionality
  - Create CitationPanel component matching FEv2's design
  - Implement citation parsing and display logic
  - Add citation source viewing and interaction features
  - Integrate citation panel with existing citation data from backend
  - _Requirements: 3.3, 5.4_

- [ ] 8. Create quick questions system
  - Implement QuickQuestions component with persona-based question loading
  - Create question configuration system using FEv2's onboardingQuickQuestions.json structure
  - Add used questions tracking to prevent repetition
  - Integrate quick question selection with existing message sending logic
  - _Requirements: 2.2, 2.4, 3.1_

- [ ] 9. Build conversation history panel
  - Create ConversationHistoryPanel component matching FEv2's design
  - Implement conversation list display with persona indicators
  - Add conversation management features (rename, archive, delete)
  - Create conversation loading and switching functionality
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 10. Implement conversation management system
  - Extend existing conversation data model with persona and interest fields
  - Create conversation creation and initialization logic
  - Implement conversation persistence integration with existing CosmosDB system
  - Add new conversation functionality that resets chat state properly
  - _Requirements: 4.1, 4.4, 7.3_

- [ ] 11. Create enhanced chat header
  - Build chat header component with persona display and statistics dialog
  - Implement session statistics tracking and display
  - Add persona switching functionality within active chat
  - Create settings and information dialogs matching FEv2's design
  - _Requirements: 2.2, 3.1, 8.1_

- [ ] 12. Implement mobile responsiveness
  - Update all new components with responsive Tailwind classes
  - Test and optimize onboarding flow for mobile devices
  - Ensure chat interface works properly on small screens
  - Implement mobile-specific navigation and interaction patterns
  - _Requirements: 8.1, 8.3, 8.4_

- [ ] 13. Add accessibility enhancements
  - Implement proper ARIA labels and roles for all new components
  - Ensure keyboard navigation works throughout the application
  - Add screen reader support for persona information and chat features
  - Test and verify color contrast compliance for all persona themes
  - _Requirements: 8.2, 8.4_

- [ ] 14. Integrate with existing Azure backend
  - Verify all API calls continue working with new UI components
  - Test authentication flows with new onboarding and chat interface
  - Ensure streaming chat responses work properly with enhanced message components
  - Validate conversation history integration with CosmosDB
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 15. Create comprehensive test suite
  - Write unit tests for all new components (onboarding, chat, history)
  - Create integration tests for persona theming and state management
  - Add visual regression tests comparing old vs new component appearance
  - Implement accessibility tests for keyboard navigation and screen readers
  - _Requirements: 1.4, 3.4, 5.4, 8.2_

- [ ] 16. Optimize performance and bundle size
  - Analyze bundle size impact of new dependencies
  - Implement code splitting for onboarding and chat components
  - Optimize persona theme switching performance
  - Ensure conversation history loading doesn't impact chat performance
  - _Requirements: 7.4, 8.3_

- [ ] 17. Update build and deployment configuration
  - Verify Vite build process works with new Tailwind CSS setup
  - Test static file generation for deployment to ../static directory
  - Ensure all new assets and fonts are properly included in build
  - Validate deployment pipeline continues working without changes
  - _Requirements: 7.4, 1.4_

- [ ] 18. Conduct end-to-end testing
  - Test complete user journey from onboarding through chat interaction
  - Verify all persona themes work correctly across different browsers
  - Test conversation history management and persistence
  - Validate Romanian localization displays properly in all components
  - _Requirements: 2.4, 4.4, 6.4, 8.4_

- [ ] 19. Create migration documentation
  - Document new component architecture and usage patterns
  - Create developer guide for persona theming system
  - Write user guide for new onboarding and chat features
  - Document any breaking changes or migration considerations
  - _Requirements: 1.4, 2.4, 4.4_

- [ ] 20. Final validation and cleanup
  - Remove unused FluentUI dependencies and components
  - Clean up old CSS modules that have been replaced
  - Verify all features work correctly in production build
  - Conduct final accessibility and performance audit
  - _Requirements: 1.4, 7.4, 8.4_
