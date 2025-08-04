import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import supersub from 'remark-supersub'
import DOMPurify from 'dompurify'
import { Clock, User, Bot, Loader2 } from 'lucide-react'
import { ChatMessage as ChatMessageType, Citation, AskResponse } from '../../api/models'
import { useAppPersonaTheme } from '../../hooks/usePersonaTheme'
import { MessageFeedback } from './MessageFeedback'
import { CitationPanel } from './CitationPanel'
import { parseAnswer } from '../Answer/AnswerParser'
import { XSSAllowTags, XSSAllowAttributes } from '../../constants/sanatizeAllowables'
import { cn } from '../../lib/utils'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
  onCitationClick?: (citation: Citation) => void
  className?: string
  sanitizeAnswer?: boolean
}

interface UserMessageProps {
  message: ChatMessageType
  className?: string
}

interface AssistantMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
  onCitationClick?: (citation: Citation) => void
  className?: string
  sanitizeAnswer?: boolean
}

// User message component with persona theming
const UserMessage: React.FC<UserMessageProps> = ({ message, className }) => {
  const { persona, messageClasses } = useAppPersonaTheme()
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={cn("flex justify-end mb-4", className)}>
      <div className="flex items-end gap-2 max-w-[80%]">
        <div className="flex flex-col items-end">
          <div className={cn(
            messageClasses(true, "max-w-full break-words"),
            "shadow-sm"
          )}>
            <div className="text-sm font-medium">
              {typeof message.content === 'string' ? message.content : message.content[0]?.text}
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatTime(message.date)}</span>
          </div>
        </div>
        <div className="flex-shrink-0 mb-6">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Assistant message component with citation toggle
const AssistantMessage: React.FC<AssistantMessageProps> = ({ 
  message, 
  isStreaming = false, 
  onCitationClick,
  className,
  sanitizeAnswer = false
}) => {
  const { persona, accentClasses } = useAppPersonaTheme()
  const [feedbackState, setFeedbackState] = useState<'up' | 'down' | null>(null)
  const [flagged, setFlagged] = useState(false)
  // Remove local citation panel state

  // Parse the message content as an AskResponse for citations
  const parsedAnswer = useMemo(() => {
    try {
      const askResponse: AskResponse = {
        answer: message.content as string,
        citations: [],
        generated_chart: null,
        message_id: message.id
      }
      return parseAnswer(askResponse)
    } catch {
      return null
    }
  }, [message])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const components = {
    code({ node, ...props }: { node: any; [key: string]: any }) {
      let language
      if (props.className) {
        const match = props.className.match(/language-(\w+)/)
        language = match ? match[1] : undefined
      }
      const codeString = node.children[0].value ?? ''
      return (
        <SyntaxHighlighter style={nord} language={language} PreTag="div" {...props}>
          {codeString}
        </SyntaxHighlighter>
      )
    }
  }

  const handleFeedbackChange = (rating: 'up' | 'down' | null) => {
    setFeedbackState(rating)
    // TODO: Integrate with existing feedback API
  }

  const handleFlagChange = (flagged: boolean) => {
    setFlagged(flagged)
    // TODO: Integrate with existing feedback API
  }

  // Safely get citations from message (for compatibility with Chat.tsx logic)
  const citations = (message as any).citations || (parsedAnswer?.citations ?? []);

  return (
    <div className={cn("flex justify-start mb-4", className)}>
      <div className="flex items-start gap-3 max-w-[85%]">
        {/* Robot icon removed */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg px-4 py-3 shadow-sm">
            {isStreaming && (
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Se scrie răspunsul...</span>
              </div>
            )}

            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                linkTarget="_blank"
                remarkPlugins={[remarkGfm, supersub]}
                components={components}
              >
                {sanitizeAnswer 
                  ? DOMPurify.sanitize(
                      typeof message.content === 'string' ? message.content : '',
                      { ALLOWED_TAGS: XSSAllowTags, ALLOWED_ATTR: XSSAllowAttributes }
                    )
                  : typeof message.content === 'string' ? message.content : ''
                }
              </ReactMarkdown>
            </div>

            {/* Citation Button - always visible, triggers modal in Chat.tsx */}
            <button
              className="mt-3 px-3 py-1 text-xs rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
              onClick={() => onCitationClick && onCitationClick(citations)}
              type="button"
            >
              Arată citările
            </button>
          </div>

          {/* Message Footer */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatTime(message.date)}</span>
              {isStreaming && (
                <span className="ml-2 text-blue-500">● În curs de scriere</span>
              )}
            </div>
            {!isStreaming && (
              <MessageFeedback
                messageId={message.id}
                currentRating={feedbackState}
                flagged={flagged}
                onRatingChange={handleFeedbackChange}
                onFlagChange={handleFlagChange}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            Conținutul generat de AI poate fi incorect
          </div>
        </div>
      </div>
    </div>
  )
}

// Error message component
const ErrorMessage: React.FC<{ message: ChatMessageType; className?: string }> = ({ 
  message, 
  className 
}) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={cn("flex justify-start mb-4", className)}>
      <div className="flex items-start gap-3 max-w-[85%]">
        {/* Robot icon removed */}
        <div className="flex-1 min-w-0">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="text-sm text-red-800">
              {typeof message.content === 'string' ? message.content : ''}
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatTime(message.date)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main ChatMessage component
export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isStreaming = false, 
  onCitationClick,
  className,
  sanitizeAnswer = false
}) => {
  const containerClass = cn("group", className)
  switch (message.role) {
    case 'user':
      return <UserMessage message={message} className={containerClass} />
    case 'assistant':
      return (
        <AssistantMessage 
          message={message} 
          isStreaming={isStreaming}
          onCitationClick={onCitationClick}
          className={containerClass}
          sanitizeAnswer={sanitizeAnswer}
        />
      )
    case 'error':
      return <ErrorMessage message={message} className={containerClass} />
    default:
      return null
  }
}

export default ChatMessage