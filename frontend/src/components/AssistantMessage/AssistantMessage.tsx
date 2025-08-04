import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import DOMPurify from 'dompurify'
import { Loader2, Clock } from 'lucide-react'
import { ChatMessage, Citation } from '../../api/models'
import { Avatar } from '../ui/avatar'
import { CitationPanel } from '../CitationPanel'
import { XSSAllowTags, XSSAllowAttributes } from '../../constants/sanatizeAllowables'
import { cn } from '../../lib/utils'

interface AssistantMessageProps {
  message: ChatMessage
  isStreaming?: boolean
  streamingContent?: string
  citations?: Citation[]
  onCitationClick?: (citation: Citation) => void
  className?: string
  sanitizeAnswer?: boolean
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  isStreaming = false,
  streamingContent = '',
  citations = [],
  onCitationClick,
  className,
  sanitizeAnswer = false
}) => {
  const [displayedContent, setDisplayedContent] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Handle streaming text animation
  useEffect(() => {
    if (isStreaming && streamingContent) {
      setIsAnimating(true)
      setDisplayedContent(streamingContent)
    } else if (!isStreaming) {
      setIsAnimating(false)
      const finalContent = typeof message.content === 'string' ? message.content : ''
      setDisplayedContent(finalContent)
    }
  }, [isStreaming, streamingContent, message.content])

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [displayedContent, isStreaming])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Custom components for ReactMarkdown with syntax highlighting
  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : undefined
      
      if (!inline && language) {
        return (
          <SyntaxHighlighter
            style={nord}
            language={language}
            PreTag="div"
            className="rounded-md"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        )
      }
      
      return (
        <code className={cn("bg-gray-100 px-1 py-0.5 rounded text-sm", className)} {...props}>
          {children}
        </code>
      )
    },
    pre({ children, ...props }: any) {
      return (
        <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto my-4" {...props}>
          {children}
        </pre>
      )
    },
    blockquote({ children, ...props }: any) {
      return (
        <blockquote className="border-l-4 border-blue-200 pl-4 py-2 my-4 bg-blue-50 italic" {...props}>
          {children}
        </blockquote>
      )
    },
    table({ children, ...props }: any) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse border border-gray-300" {...props}>
            {children}
          </table>
        </div>
      )
    },
    th({ children, ...props }: any) {
      return (
        <th className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold" {...props}>
          {children}
        </th>
      )
    },
    td({ children, ...props }: any) {
      return (
        <td className="border border-gray-300 px-4 py-2" {...props}>
          {children}
        </td>
      )
    }
  }

  // Prepare content for rendering
  const contentToRender = sanitizeAnswer 
    ? DOMPurify.sanitize(displayedContent, { 
        ALLOWED_TAGS: XSSAllowTags, 
        ALLOWED_ATTR: XSSAllowAttributes 
      })
    : displayedContent

  return (
    <div className={cn("flex justify-start mb-4 group", className)}>
      <div className="flex items-start gap-3 max-w-[85%]">
        {/* AI Avatar */}
        <div className="flex-shrink-0 mt-1">
          <Avatar persona="elev" type="ai" className="w-8 h-8" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Message Content */}
          <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
            {/* Streaming Indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 mb-3 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Se scrie răspunsul...</span>
              </div>
            )}

            {/* Main Content */}
            <div 
              ref={contentRef}
              className={cn(
                "prose prose-sm max-w-none",
                "prose-headings:text-gray-900 prose-headings:font-semibold",
                "prose-p:text-gray-700 prose-p:leading-relaxed",
                "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
                "prose-strong:text-gray-900 prose-strong:font-semibold",
                "prose-ul:text-gray-700 prose-ol:text-gray-700",
                "prose-li:text-gray-700",
                isAnimating && "animate-pulse"
              )}
            >
              {contentToRender ? (
                <ReactMarkdown
                  linkTarget="_blank"
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={markdownComponents}
                >
                  {contentToRender}
                </ReactMarkdown>
              ) : (
                <div className="text-gray-500 italic">Aștept răspuns...</div>
              )}
            </div>

            {/* Streaming cursor effect */}
            {isStreaming && displayedContent && (
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
            )}

            {/* Citations */}
            {citations.length > 0 && !isStreaming && (
              <CitationPanel 
                citations={citations}
                onCitationClick={onCitationClick}
                className="mt-4 pt-3 border-t border-gray-100"
              />
            )}
          </div>

          {/* Message Footer */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatTime(message.date)}</span>
              {isStreaming && (
                <span className="ml-2 text-blue-500 flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  În curs de scriere
                </span>
              )}
            </div>
          </div>

          {/* AI Disclaimer */}
          {!isStreaming && (
            <div className="text-xs text-gray-400 mt-1">
              Conținutul generat de AI poate fi incorect
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AssistantMessage