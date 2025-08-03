# Chat Interface Modernization Design

## Overview

This design document outlines the modernization of the FEv1 chat interface by creating a new Chat component that uses FEv2 design patterns while maintaining 100% compatibility with the existing Azure backend services. The approach focuses on component replacement rather than modification to minimize risk and ensure clean separation of concerns.

## Architecture

### High-Level Component Structure

```
ModernChat (new)
├── ChatHeader (new)
│   ├── PersonaDisplay
│   ├── ConversationTitle
│   └── ActionButtons (history, settings)
├── ChatMessages (new)
│   ├── MessageList
│   │   ├── UserMessage (with persona avatar)
│   │   ├── AssistantMessage (with AI avatar)
│   │   ├── CitationPanel (expandable)
│   │   └── MessageFeedback
│   └── LoadingIndicator
├── ChatInput (new)
│   ├── InputArea (auto-resizing)
│   ├── ImageUpload
│   ├── QuickQuestions (persona-based)
│   └── SendButton
└── ConversationHistoryPanel (new)
    ├── ConversationList
    ├── ConversationItem
    └── ConversationActions
```

### Backend Integration Layer

The design maintains the existing backend integration by creating a service layer that wraps the current API calls:

```typescript
// Existing API functions remain unchanged
import {
  conversationApi,
  historyGenerate,
  historyUpdate,
  historyMessageFeedback,
  // ... other existing imports
} from "../../api"

// New service layer provides clean interface
class ChatService {
  // Wraps existing streaming logic
  async streamConversation(messages: ChatMessage[]): AsyncGenerator<ChatMessage>
  
  // Wraps existing history management
  async createConversation(messages: ChatMessage[]): Promise<Conversation>
  async updateConversation(conversation: Conversation): Promise<void>
  
  // Wraps existing feedback system
  async submitFeedback(messageId: string, feedback: string): Promise<void>
}
```

## Components and Interfaces

### 1. ModernChat Component

**Purpose:** Main container that replaces the current Chat.tsx
**Technology:** React + TypeScript + Tailwind CSS
**State Management:** Uses existing AppStateContext

```typescript
interface ModernChatProps {
  // No props needed - uses context
}

interface ModernChatState {
  messages: ChatMessage[]
  isLoading: boolean
  showLoadingMessage: boolean
  activeCitation: Citation | null
  isCitationPanelOpen: boolean
  isHistoryPanelOpen: boolean
  errorMessage: ErrorMessage | null
}
```

**Key Features:**
- Maintains all existing state management patterns
- Uses existing AppStateContext for persona and conversation data
- Preserves all current error handling logic
- Implements FEv2 visual design with Tailwind CSS

### 2. ChatHeader Component

**Purpose:** Modern header with persona display and actions
**Design Pattern:** Based on FEv2 header components

```typescript
interface ChatHeaderProps {
  persona: Persona | null
  conversationTitle: string
  onHistoryToggle: () => void
  onNewChat: () => void
}
```

**Features:**
- Persona avatar and name display
- Current conversation title
- History panel toggle button
- New chat button
- Settings/info dropdown

### 3. ChatMessages Component

**Purpose:** Message display area with modern styling
**Design Pattern:** Based on FEv2 message components

```typescript
interface ChatMessagesProps {
  messages: ChatMessage[]
  isLoading: boolean
  showLoadingMessage: boolean
  onCitationClick: (citation: Citation) => void
  onFeedbackSubmit: (messageId: string, feedback: string) => void
}
```

**Features:**
- Persona-based message styling using existing theme system
- Avatar integration from FEv2 avatar component
- Citation panels with expandable design
- Message feedback buttons
- Streaming message indicators
- Auto-scroll to latest message

### 4. UserMessage Component

**Purpose:** Display user messages with persona styling
**Design Pattern:** FEv2 message bubble design

```typescript
interface UserMessageProps {
  message: ChatMessage
  persona: Persona | null
}
```

**Features:**
- Uses persona avatar from FEv2 avatar system
- Applies persona theme colors
- Supports multimodal content (text + images)
- Proper timestamp display

### 5. AssistantMessage Component

**Purpose:** Display AI responses with citations and feedback
**Design Pattern:** FEv2 assistant message design

```typescript
interface AssistantMessageProps {
  message: ChatMessage
  citations: Citation[]
  onCitationClick: (citation: Citation) => void
  onFeedbackSubmit: (feedback: string) => void
}
```

**Features:**
- AI avatar from FEv2 system
- Markdown rendering with syntax highlighting
- Inline citation references
- Feedback buttons (thumbs up/down)
- Streaming text animation

### 6. CitationPanel Component

**Purpose:** Modern citation display
**Design Pattern:** FEv2 citation panel design

```typescript
interface CitationPanelProps {
  citations: Citation[]
  activeCitation: Citation | null
  isOpen: boolean
  onClose: () => void
  onCitationSelect: (citation: Citation) => void
}
```

**Features:**
- Expandable card design
- Document preview
- Source link handling
- File path truncation
- Copy citation functionality

### 7. MessageFeedback Component

**Purpose:** Feedback collection interface
**Design Pattern:** FEv2 feedback system

```typescript
interface MessageFeedbackProps {
  messageId: string
  currentFeedback?: string
  onFeedbackSubmit: (feedback: string) => void
}
```

**Features:**
- Thumbs up/down buttons
- Detailed feedback categories
- Inappropriate content reporting
- Visual feedback state indication

### 8. ChatInput Component

**Purpose:** Modern input area with enhanced features
**Design Pattern:** FEv2 input design

```typescript
interface ChatInputProps {
  onSendMessage: (content: ChatMessage["content"]) => void
  isLoading: boolean
  disabled: boolean
  persona: Persona | null
  selectedInterest: InterestArea | null
}
```

**Features:**
- Auto-resizing textarea
- Image upload with drag & drop
- Quick questions based on persona/interest
- Send button with proper states
- Character counter
- Keyboard shortcuts

### 9. QuickQuestions Component

**Purpose:** Persona-based question suggestions
**Design Pattern:** FEv2 quick questions

```typescript
interface QuickQuestionsProps {
  persona: Persona | null
  selectedInterest: InterestArea | null
  onQuestionSelect: (question: string) => void
}
```

**Features:**
- Loads questions from existing onboardingQuickQuestions.json
- Filters by persona and interest
- Prevents question repetition
- Modern button styling

### 10. ConversationHistoryPanel Component

**Purpose:** Modern sidebar for conversation management
**Design Pattern:** FEv2 conversation history panel

```typescript
interface ConversationHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  currentConversationId: string | null
  onConversationSelect: (id: string) => void
  onConversationRename: (id: string, title: string) => void
  onConversationDelete: (id: string) => void
}
```

**Features:**
- Responsive sidebar design
- Conversation search and filter
- Context menu for actions
- Persona indicators
- Mobile-friendly layout

## Data Models

### Enhanced ChatMessage Interface

```typescript
// Extends existing ChatMessage interface
interface EnhancedChatMessage extends ChatMessage {
  feedback?: string
  citations?: Citation[]
  isStreaming?: boolean
  streamingContent?: string
}
```

### UI State Interfaces

```typescript
interface ChatUIState {
  showQuickQuestions: boolean
  selectedImage: File | null
  imagePreview: string | null
  inputValue: string
  isInputFocused: boolean
}

interface FeedbackState {
  [messageId: string]: {
    type: 'positive' | 'negative' | null
    categories: string[]
    submitted: boolean
  }
}
```

## Error Handling

### Error Display Strategy

1. **Network Errors:** Toast notifications with retry options
2. **Service Errors:** Inline error messages in chat
3. **Content Filtering:** Educational explanations
4. **Rate Limiting:** Clear countdown timers
5. **Parsing Errors:** Graceful fallbacks

### Error Component Design

```typescript
interface ErrorDisplayProps {
  error: ErrorMessage
  onRetry?: () => void
  onDismiss: () => void
}
```

## Testing Strategy

### Unit Testing

1. **Component Testing:** Each new component with React Testing Library
2. **Service Layer Testing:** Mock backend responses
3. **State Management Testing:** Context and reducer logic
4. **Utility Function Testing:** Citation parsing, error handling

### Integration Testing

1. **Backend Compatibility:** Verify all existing API calls work
2. **Streaming Response:** Test real-time message updates
3. **Persona Integration:** Verify theme application
4. **History Management:** Test conversation persistence

### Visual Testing

1. **Component Snapshots:** Ensure consistent rendering
2. **Responsive Design:** Test on multiple screen sizes
3. **Persona Themes:** Verify all persona styles
4. **Accessibility:** Screen reader and keyboard navigation

## Performance Considerations

### Optimization Strategies

1. **Component Memoization:** React.memo for expensive components
2. **Virtual Scrolling:** For large conversation histories
3. **Image Optimization:** Resize and compress uploads
4. **Lazy Loading:** Load conversation history on demand
5. **Debounced Input:** Prevent excessive API calls

### Bundle Size Management

1. **Code Splitting:** Separate chunks for history panel
2. **Tree Shaking:** Remove unused Radix UI components
3. **Dynamic Imports:** Load heavy components on demand

## Migration Strategy

### Phase 1: Component Creation
- Create new components alongside existing Chat.tsx
- Implement service layer wrapper
- Set up new routing

### Phase 2: Feature Parity
- Implement all existing functionality
- Maintain state management compatibility
- Preserve error handling behavior

### Phase 3: Testing and Validation
- Comprehensive testing with Azure backend
- Performance benchmarking
- Accessibility validation

### Phase 4: Deployment
- Feature flag for new vs old chat
- Gradual rollout
- Monitoring and rollback capability

## Accessibility Implementation

### ARIA Labels and Roles

```typescript
// Message list
<div role="log" aria-live="polite" aria-label="Chat messages">

// Input area
<textarea 
  aria-label="Type your message"
  aria-describedby="input-help"
/>

// Feedback buttons
<button 
  aria-label="Rate this response positively"
  aria-pressed={feedback === 'positive'}
/>
```

### Keyboard Navigation

1. **Tab Order:** Logical flow through interface
2. **Focus Management:** Proper focus trapping in modals
3. **Shortcuts:** Enter to send, Escape to close panels
4. **Screen Reader:** Announce message updates

### Color Contrast

- All persona themes maintain WCAG 2.1 AA compliance
- High contrast mode support
- Focus indicators with sufficient contrast

## Security Considerations

### Input Sanitization

- Maintain existing XSS protection
- Image upload validation
- File type restrictions

### Content Security

- Preserve existing content filtering
- Maintain educational scope limitations
- Secure citation link handling

This design ensures a smooth transition from the current FluentUI-based interface to a modern, accessible, and performant chat experience while maintaining complete compatibility with the existing Azure backend infrastructure.