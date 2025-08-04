import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Copy, FileText } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Citation } from '../../api/models'
import { useAppPersonaTheme } from '../../hooks/usePersonaTheme'
import { cn } from '../../lib/utils'

interface CitationPanelProps {
  citations: Citation[]
  onCitationClick?: (citation: Citation) => void
  className?: string
}

export const CitationPanel: React.FC<CitationPanelProps> = ({
  citations,
  onCitationClick,
  className
}) => {
  const { accentClasses } = useAppPersonaTheme()
  const [isOpen, setIsOpen] = useState(false)

  if (!citations || citations.length === 0) {
    return null
  }

  const createCitationFilepath = (citation: Citation, index: number, truncate: boolean = false) => {
    let citationFilename = ''
    const filePathTruncationLimit = 50

    if (citation.filepath) {
      const part_i = citation.part_index ?? (citation.chunk_id ? parseInt(citation.chunk_id) + 1 : '')
      if (truncate && citation.filepath.length > filePathTruncationLimit) {
        const citationLength = citation.filepath.length
        citationFilename = `${citation.filepath.substring(0, 20)}...${citation.filepath.substring(citationLength - 20)} - Part ${part_i}`
      } else {
        citationFilename = `${citation.filepath} - Part ${part_i}`
      }
    } else if (citation.filepath && citation.reindex_id) {
      citationFilename = `${citation.filepath} - Part ${citation.reindex_id}`
    } else {
      citationFilename = `Citare ${index + 1}`
    }
    return citationFilename
  }

  const handleCopyCitation = async (citation: Citation, index: number) => {
    const text = `${createCitationFilepath(citation, index)}: ${citation.content}`
    try {
      await navigator.clipboard.writeText(text)
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy citation:', error)
    }
  }

  const handleOpenLink = (citation: Citation) => {
    if (citation.url && !citation.url.includes('blob.core')) {
      window.open(citation.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCitationClick = (citation: Citation) => {
    if (onCitationClick) {
      onCitationClick(citation)
    }
  }

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-2 text-xs text-gray-600 hover:text-gray-800 rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronUp className="w-3 h-3 mr-1" />
        ) : (
          <ChevronDown className="w-3 h-3 mr-1" />
        )}
        <FileText className="w-3 h-3 mr-1" />
        {citations.length > 1 
          ? `${citations.length} referințe` 
          : '1 referință'
        }
      </Button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {citations.map((citation, index) => (
            <Card 
              key={index} 
              className={cn(
                "border border-l-4 transition-colors hover:shadow-sm cursor-pointer",
                accentClasses()
              )}
              onClick={() => handleCitationClick(citation)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "flex items-center justify-center w-5 h-5 rounded text-xs font-medium border border-current text-current",
                        accentClasses()
                      )}>
                        {index + 1}
                      </div>
                      {citation.title && (
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {citation.title}
                        </h4>
                      )}
                    </div>
                    
                    {citation.filepath && (
                      <p className="text-xs text-gray-500 mb-1 font-mono">
                        {createCitationFilepath(citation, index, true)}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-700 line-clamp-3">
                      {citation.content}
                    </p>
                    
                    {citation.chunk_id && (
                      <div className="text-xs text-gray-400 mt-1">
                        Chunk ID: {citation.chunk_id}
                        {citation.part_index !== undefined && ` (Part ${citation.part_index})`}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyCitation(citation, index)
                      }}
                      title="Copiază citarea"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    
                    {citation.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenLink(citation)
                        }}
                        title="Deschide sursa"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default CitationPanel