import React from 'react'
import { ChatMessage } from '../../api/models'
import { useAppPersonaTheme } from '../../hooks/usePersonaTheme'
import { Avatar } from '../ui/avatar'
import { cn } from '../../lib/utils'

interface UserMessageProps {
  message: ChatMessage
  className?: string
}

/**
 * UserMessage component that displays user messages with persona theming and avatar
 * Supports both text-only and multimodal content (text + images)
 */
export const UserMessage: React.FC<UserMessageProps> = ({ message, className }) => {
  const { persona, messageClasses } = useAppPersonaTheme()

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Extract text and image content from multimodal message
  const getMessageContent = () => {
    if (typeof message.content === 'string') {
      return { text: message.content, imageUrl: null }
    }

    // Handle multimodal content array
    if (Array.isArray(message.content)) {
      const textContent = message.content.find(item => item.type === 'text') as { type: string; text: string } | undefined
      const imageContent = message.content.find(item => item.type === 'image_url') as { type: string; image_url: { url: string } } | undefined
      
      return {
        text: textContent?.text || '',
        imageUrl: imageContent?.image_url?.url || null
      }
    }

    return { text: '', imageUrl: null }
  }

  const { text, imageUrl } = getMessageContent()

  return (
    <div className={cn("flex justify-end mb-4", className)}>
      <div className="flex items-end gap-3">
        <div className="flex flex-col items-end">
          {/* Message bubble with persona theming */}
          <div className={cn(
            messageClasses(true, "max-w-full break-words"),
            "shadow-sm",
            "!text-white"
          )}>
            {/* Text content */}
            {text && (
              <div className="text-sm font-medium whitespace-pre-wrap !text-white">
                {text}
              </div>
            )}
            
            {/* Image content */}
            {imageUrl && (
              <div className={cn("mt-2", text ? "border-t border-white/20 pt-2" : "")}>
                <img
                  src={imageUrl}
                  alt="Uploaded content"
                  className="max-w-full h-auto rounded-md shadow-sm"
                  style={{ maxHeight: '200px', objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          <div className="flex items-center gap-1 mt-1 text-xs !text-white">
            <span>{formatTime(message.date)}</span>
          </div>
        </div>
        
        {/* User avatar with persona theming */}
        <div className="flex-shrink-0 mb-6">
          <Avatar 
            persona={persona || 'incognito'} 
            type="user" 
            className="ring-2 ring-white shadow-sm"
          />
        </div>
      </div>
    </div>
  )
}

export default UserMessage