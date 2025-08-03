# Implementation Plan

- [x] 1. Create backend service wrapper layer
  - Create ChatService class that wraps existing API functions (conversationApi, historyGenerate, etc.)
  - Implement streaming response handler that maintains exact NDJSON parsing logic from current Chat.tsx
  - Add citation parsing wrapper that uses existing parseCitationFromMessage function
  - Write unit tests to verify service layer maintains 100% API compatibility
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Import and adapt FEv2 Avatar component
  - Copy Avatar component from frontend-v2/components/avatar.tsx to frontend/src/components/ui/
  - Verify avatar assets exist in frontend/public/avatars/ directory (child_avatar.svg, parent_avatar.svg, etc.)
  - Test avatar rendering with existing persona types (elev, părinte, profesor, incognito) and AI assistant
  - Ensure Avatar component works with existing persona theme system
  - _Requirements: 2.2, 3.3_

- [x] 3. Create UserMessage component using existing systems
  - Build UserMessage component that uses existing persona theme utilities (useAppPersonaTheme)
  - Integrate FEv2 Avatar component for user messages
  - Use existing persona styling system (getPersonaMessageClasses) for message bubbles
  - Add support for multimodal content (text + images) display using existing format
  - Test with all existing persona themes without breaking onboarding
  - _Requirements: 2.1, 2.3, 3.1, 3.2_

- [x] 4. Create AssistantMessage component with streaming support
  - Build AssistantMessage component with AI avatar from FEv2
  - Implement streaming text animation that updates content in real-time
  - Use existing markdown rendering libraries (ReactMarkdown, remarkGfm, rehypeRaw)
  - Maintain existing syntax highlighting with Prism (already configured)
  - Create loading indicator for streaming responses
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 5. Build CitationPanel component using FEv2 patterns
  - Copy and adapt CitationPanel from frontend-v2/components/citation-panel.tsx
  - Integrate with existing parseCitationFromMessage function (no changes to parsing logic)
  - Maintain existing citation data structure and URL handling
  - Add FEv2 styling while preserving existing citation functionality
  - Test with existing Azure AI Search citation format
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Create MessageFeedback component using existing API
  - Copy and adapt MessageFeedback from frontend-v2/components/message-feedback.tsx
  - Integrate with existing historyMessageFeedback API endpoint (no API changes)
  - Use existing feedback categories and data format
  - Apply persona theming to feedback buttons using existing theme system
  - Test feedback submission with existing backend
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Build ChatMessages container component
  - Create ChatMessages component that renders message list using existing message data structure
  - Implement auto-scroll functionality (copy from existing Chat.tsx chatMessageStreamEnd logic)
  - Integrate UserMessage, AssistantMessage, and CitationPanel components
  - Maintain existing loading states and error handling patterns
  - Use existing message processing logic without modifications
  - _Requirements: 2.1, 9.4_

- [ ] 8. Create ChatInput component with existing image upload logic
  - Build modern input area with auto-resizing textarea using FEv2 patterns
  - Copy existing image upload logic from current Chat.tsx (resizing, base64 conversion)
  - Maintain existing multimodal content format for backend compatibility
  - Use existing persona theme system for input styling
  - Preserve existing send button states and keyboard shortcuts
  - _Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 9. Integrate existing QuickQuestions system
  - Use existing getQuickQuestionsForTopic function from onboarding enhancement
  - Display questions from existing onboardingQuickQuestions.json structure
  - Apply existing persona theming to question buttons
  - Integrate with existing selectedInterest from AppStateContext
  - Test with existing persona and topic combinations
  - _Requirements: 3.4_

- [x] 10. Build ChatHeader component using existing state
  - Create header with persona display using existing currentPersona from AppStateContext
  - Use existing persona theme utilities for header styling
  - Add conversation title from existing currentChat state
  - Implement action buttons (history toggle, new chat) with existing functionality
  - Test with existing persona switching and conversation management
  - _Requirements: 2.1, 3.1, 6.6_

- [x] 11. Adapt FEv2 ConversationHistoryPanel
  - Copy and adapt ConversationHistoryPanel from frontend-v2/components/conversation-history-panel.tsx
  - Integrate with existing chat history API endpoints (no backend changes)
  - Use existing conversation data structure from AppStateContext
  - Maintain existing conversation management functions (rename, delete, clear)
  - Test with existing Cosmos DB integration
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 12. Build main ModernChat container component
  - Create ModernChat component that replaces current Chat.tsx
  - Use existing AppStateContext for all state management (no state changes)
  - Integrate all sub-components while maintaining existing data flow
  - Copy existing streaming response handling logic exactly
  - Preserve existing error handling and abort controller logic
  - _Requirements: 1.1, 2.1, 8.1, 8.2, 8.3_

- [ ] 13. Implement modern error handling UI
  - Create modern error display components using FEv2 patterns
  - Use existing error parsing logic (tryGetRaiPrettyError, parseErrorMessage)
  - Maintain existing error message structure and content filtering handling
  - Apply persona theming to error displays
  - Test with existing Azure OpenAI error scenarios
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. Ensure accessibility compliance
  - Copy accessibility patterns from existing onboarding components (already WCAG 2.1 AA compliant)
  - Apply existing ARIA labels and keyboard navigation patterns
  - Use existing screen reader support from onboarding enhancement
  - Maintain existing focus management and color contrast
  - Test with existing accessibility validation tools
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 15. Update ChatWithOnboarding integration
  - Modify ChatWithOnboarding.tsx to conditionally render ModernChat vs existing Chat
  - Add feature flag to switch between old and new chat interfaces
  - Ensure existing onboarding to chat transition works with ModernChat
  - Test persona theme application from onboarding to chat
  - Verify existing state persistence works correctly
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 16. Add performance optimizations
  - Apply React.memo to expensive components (following existing patterns)
  - Use existing message processing optimization patterns
  - Maintain existing abort controller and cleanup logic
  - Add debounced input handling for better UX
  - Test performance with existing large conversation scenarios
  - _Requirements: 9.1, 9.2, 9.4, 9.5_

- [ ] 17. Create comprehensive test suite
  - Write unit tests for all new components using existing test patterns
  - Test backend integration with existing API endpoints (no API changes)
  - Verify streaming response handling maintains exact behavior
  - Test persona theming integration with existing theme system
  - Validate accessibility features match existing onboarding standards
  - _Requirements: 1.1, 1.2, 1.3, 9.1_

- [ ] 18. Validate backend compatibility thoroughly
  - Test streaming conversation responses with existing Azure OpenAI integration
  - Verify citation parsing with existing Azure AI Search results format
  - Test conversation history with existing Cosmos DB structure
  - Validate image upload with existing multimodal content format
  - Test feedback submission with existing backend endpoint
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 19. Ensure responsive design compatibility
  - Apply existing responsive patterns from onboarding components
  - Test mobile compatibility with existing viewport and touch handling
  - Use existing Tailwind responsive classes and breakpoints
  - Verify conversation history panel works on mobile (like existing onboarding)
  - Test image upload on mobile devices with existing logic
  - _Requirements: 6.6, 9.3_

- [ ] 20. Prepare for safe deployment
  - Implement feature flag in ChatWithOnboarding for A/B testing
  - Create rollback mechanism to existing Chat.tsx if needed
  - Test production build with both old and new chat interfaces
  - Verify no breaking changes to existing onboarding or backend
  - Document migration path and any configuration changes needed
  - _Requirements: 9.1, 9.2_
