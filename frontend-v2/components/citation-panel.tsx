"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ExternalLink, Copy, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "@/components/ui/use-toast"
import type { Citation } from "@/lib/api-service"
import { formatFilePath } from "@/lib/api-service"

interface CitationPanelProps {
  citations: Citation[]
  className?: string
}

export function CitationPanel({ citations, className = "" }: CitationPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!citations || citations.length === 0) {
    return null
  }

  const handleCopyCitation = (citation: Citation) => {
    const text = `${citation.title || citation.filepath || "Document"}: ${citation.content}`
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Citare copiată",
        description: "Textul citării a fost copiat în clipboard",
      })
    })
  }

  const handleOpenLink = (citation: Citation) => {
    if (citation.url) {
      window.open(citation.url, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-2 text-xs opacity-70 hover:opacity-100 text-[#07050a]/70 rounded-full"
          >
            {isOpen ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            <FileText className="w-3 h-3 mr-1" />
            Surse folosite ({citations.length})
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="space-y-2">
            {citations.map((citation, index) => (
              <Card key={index} className="border-[#D0337D]/20">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        {citation.title && (
                          <h4 className="text-sm font-medium text-[#07050a] truncate">{citation.title}</h4>
                        )}
                      </div>
                      {citation.filepath && (
                        <p className="text-xs text-[#07050a]/60 mb-1 font-mono">{formatFilePath(citation.filepath)}</p>
                      )}
                      <p className="text-xs text-[#07050a]/80 line-clamp-3">{citation.content}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-[#07050a]/60 hover:text-[#07050a] rounded-full"
                        onClick={() => handleCopyCitation(citation)}
                        title="Copiază citarea"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {citation.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-[#07050a]/60 hover:text-[#07050a] rounded-full"
                          onClick={() => handleOpenLink(citation)}
                          title="Deschide sursa"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {citation.chunk_id && (
                    <div className="text-xs text-[#07050a]/50">
                      Chunk ID: {citation.chunk_id}
                      {citation.part_index !== undefined && ` (Part ${citation.part_index})`}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
