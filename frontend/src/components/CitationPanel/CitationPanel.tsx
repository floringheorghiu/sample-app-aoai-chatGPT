import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Copy, FileText } from 'lucide-react'
import DOMPurify from 'dompurify'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Citation } from '../../api/models'
import { XSSAllowTags } from '../../constants/sanatizeAllowables'
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
  const [isOpen, setIsOpen] = useState(false)

  if (!citations || citations.length === 0) {
    return null
  }

  const handleCopyCitation = async (citation: Citation) => {
    const text = `${citation.title || citation.filepath || "Document"}: ${citation.content}`
    try {
      await navigator.clipboard.writeText(text)
      // Could add toast notification here if needed
    } catch (error) {
      console.error('Failed to copy citation:', error)
    }
  }

  const handleOpenLink = (citation: Citation) => {
    if (citation.url && !citation.url.includes('blob.core')) {
      window.open(citation.url, '_blank', 'noopener,noreferrer')
    }
  }

  const formatFilePath = (filepath: string | null) => {
    if (!filepath) return ''
    const parts = filepath.split('/')
    return parts.length > 3 ? `.../${parts.slice(-2).join('/')}` : filepath
  }

  return (
    <div className={cn("mt-4", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors p-2 rounded-md hover:bg-gray-50"
      >
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <FileText className="w-3 h-3" />
        <span>Surse folosite ({citations.length})</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {citations.map((citation, index) => (
            <div
              key={citation.id || index}
              className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      #{index + 1}
                    </span>
                    {citation.title && (
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {citation.title}
                      </h4>
                    )}
                  </div>
                  
                  {citation.filepath && (
                    <p className="text-xs text-gray-500 mb-1 font-mono">
                      {formatFilePath(citation.filepath)}
                    </p>
                  )}
                  
                  <div className="text-xs text-gray-700 line-clamp-3">
                    <ReactMarkdown
                      linkTarget="_blank"
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      className="prose prose-xs max-w-none"
                    >
                      {DOMPurify.sanitize(citation.content, { ALLOWED_TAGS: XSSAllowTags })}
                    </ReactMarkdown>
                  </div>
                </div>
                
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => handleCopyCitation(citation)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    title="Copiază citarea"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  
                  {citation.url && !citation.url.includes('blob.core') && (
                    <button
                      onClick={() => handleOpenLink(citation)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                      title="Deschide sursa"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  
                  {onCitationClick && (
                    <button
                      onClick={() => onCitationClick(citation)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                      title="Vezi detalii"
                    >
                      <FileText className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              
              {(citation.chunk_id || citation.part_index !== undefined) && (
                <div className="text-xs text-gray-400 mt-2">
                  {citation.chunk_id && `Chunk ID: ${citation.chunk_id}`}
                  {citation.part_index !== undefined && citation.part_index !== null && 
                    ` (Part ${citation.part_index})`
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CitationPanel