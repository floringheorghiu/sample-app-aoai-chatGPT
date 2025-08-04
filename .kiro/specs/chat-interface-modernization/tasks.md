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

- [x] 6. Message feedback functionality
  - MessageFeedback component already exists and integrated in ChatMessage component
  - Feedback functionality working with existing historyMessageFeedback API
  - Persona theming already applied through existing theme system
  - Feedback submission tested and working with existing backend
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Build ChatMessages container component
  - Create ChatMessages component that renders message list using existing message data structure
  - Implement auto-scroll functionality (copy from existing Chat.tsx chatMessageStreamEnd logic)
  - Integrate UserMessage, AssistantMessage, and CitationPanel components
  - Maintain existing loading states and error handling patterns
  - Use existing message processing logic without modifications
  - _Requirements: 2.1, 9.4_

- [x] 8. Chat input functionality and positioning
  - QuestionInput component already exists with full functionality
  - Image upload logic already implemented (resizing, base64 conversion)
  - Multimodal content format maintained for backend compatibility
  - Fixed positioning issue that was causing input to appear at top
  - Send button states and keyboard shortcuts preserved
  - _Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Quick questions integration
  - Quick questions already displayed in welcome state
  - Questions properly styled and positioned with animations
  - Click handlers integrated with existing API functions
  - Persona theming applied through existing background classes
  - Working with current onboarding integration
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

- [x] 13. Modern error handling UI
  - Error messages properly styled with modern design patterns
  - Existing error parsing logic maintained (tryGetRaiPrettyError, parseErrorMessage)
  - Error message structure and content filtering preserved
  - Error displays styled with appropriate colors and spacing
  - Tested with existing Azure OpenAI error scenarios
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. Ensure accessibility compliance
  - Copy accessibility patterns from existing onboarding components (already WCAG 2.1 AA compliant)
  - Apply existing ARIA labels and keyboard navigation patterns
  - Use existing screen reader support from onboarding enhancement
  - Maintain existing focus management and color contrast
  - Test with existing accessibility validation tools
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 15. ChatWithOnboarding integration
  - ChatWithOnboarding.tsx already properly integrated with improved Chat component
  - Onboarding to chat transition working correctly
  - Persona theme application working from onboarding to chat
  - State persistence verified and working correctly
  - No feature flag needed as improvements are backward compatible
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 16. Add performance optimizations
  - Apply React.memo to expensive components (following existing patterns)
  - Use existing message processing optimization patterns
  - Maintain existing abort controller and cleanup logic
  - Add debounced input handling for better UX
  - Test performance with existing large conversation scenarios
  - _Requirements: 9.1, 9.2, 9.4, 9.5_

- [ ] 17. Functional validation and testing
  - Test all chat functionality works correctly (send messages, receive responses)
  - Verify streaming responses display properly with new layout
  - Test citation panel opens and displays citations correctly
  - Validate chat history panel functionality
  - Test image upload and multimodal content display
  - Verify all existing backend integrations remain functional
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1_

- [x] 19. Ensure responsive design compatibility
  - Apply existing responsive patterns from onboarding components
  - Test mobile compatibility with existing viewport and touch handling
  - Use existing Tailwind responsive classes and breakpoints
  - Verify conversation history panel works on mobile (like existing onboarding)
  - Test image upload on mobile devices with existing logic
  - _Requirements: 6.6, 9.3_

- [ ] 20. Polish and refinement
  - Fine-tune spacing, padding, and visual consistency
  - Optimize animations and transitions for smooth user experience
  - Test and refine responsive behavior across different screen sizes
  - Validate all interactive elements work correctly (buttons, inputs, panels)
  - Ensure consistent styling across all chat states (empty, with messages, loading)
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 21. Prepare for safe deployment
  - Create comprehensive testing checklist for all chat functionality
  - Test production build with improved chat interface
  - Verify no breaking changes to existing onboarding or backend
  - Document the layout fix and key improvements made
  - Create rollback plan using chat-layout-working branch if needed
  - _Requirements: 9.1, 9.2_
