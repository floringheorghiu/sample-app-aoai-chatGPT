import React, { useEffect, useState } from 'react'
import { CitationPanel } from './CitationPanel'
import { Citation, ChatMessage, Conversation } from '../../api/models'
import { historyList, historyRead } from '../../api/api'


export const CitationPanelExample: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [citations, setCitations] = useState<Citation[] | null>(null)
  const [messagePreview, setMessagePreview] = useState<string>("")

  useEffect(() => {
    const fetchCitations = async () => {
      setLoading(true)
      setError(null)
      try {
        const conversations = await historyList(0)
        if (!conversations || conversations.length === 0) {
          setError("No conversations found.")
          setLoading(false)
          return
        }
        // Try to find a message with citations
        for (const conv of conversations) {
          const messages = conv.messages && conv.messages.length > 0 ? conv.messages : await historyRead(conv.id)
          for (const msg of messages) {
            // Try to parse citations from content if present
            if (typeof msg.content === 'object') continue
            try {
              const parsed = JSON.parse(msg.content as string)
              if (parsed && parsed.citations && Array.isArray(parsed.citations) && parsed.citations.length > 0) {
                setCitations(parsed.citations)
                setMessagePreview(parsed.answer ? parsed.answer.substring(0, 200) : "")
                setLoading(false)
                return
              }
            } catch {
              // Not JSON, skip
            }
          }
        }
        setError("No messages with citations found.")
      } catch (err: any) {
        setError("Error fetching data: " + (err.message || err.toString()))
      } finally {
        setLoading(false)
      }
    }
    fetchCitations()
  }, [])

  const handleCitationClick = (citation: Citation) => {
    alert(`Citation clicked: ${citation.title || citation.filepath || 'Untitled'}\nContent: ${citation.content.substring(0, 100)}...`)
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          CitationPanel Real Data Example
        </h1>
        {loading && <div className="text-gray-600">Loading real citations from backend...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && citations && citations.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Real Citations from Backend
            </h2>
            <div className="bg-gray-50 p-4 rounded-md">
              {messagePreview && (
                <p className="text-gray-700 mb-2">
                  <span className="font-semibold">Message preview:</span> {messagePreview}...
                </p>
              )}
              <CitationPanel 
                citations={citations}
                onCitationClick={handleCitationClick}
              />
            </div>
          </div>
        )}
        {!loading && !error && (!citations || citations.length === 0) && (
          <div className="text-gray-500">No citations found in any message.</div>
        )}
      </div>
    </div>
  )
}

export default CitationPanelExample