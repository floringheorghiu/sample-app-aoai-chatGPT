import React, { useState } from 'react'
import { ThumbsUp, ThumbsDown, Flag, MoreHorizontal } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Feedback, historyMessageFeedback } from '../../api'
import { useAppPersonaTheme } from '../../hooks/usePersonaTheme'
import { cn } from '../../lib/utils'

interface MessageFeedbackProps {
  messageId: string
  currentRating?: 'up' | 'down' | null
  flagged?: boolean
  onRatingChange: (rating: 'up' | 'down' | null) => void
  onFlagChange: (flagged: boolean) => void
  className?: string
}

interface FeedbackOption {
  id: Feedback
  label: string
  category: 'unhelpful' | 'harmful'
}

const feedbackOptions: FeedbackOption[] = [
  // Unhelpful feedback
  { id: Feedback.MissingCitation, label: 'Lipsesc citări', category: 'unhelpful' },
  { id: Feedback.WrongCitation, label: 'Citări greșite', category: 'unhelpful' },
  { id: Feedback.OutOfScope, label: 'În afara domeniului', category: 'unhelpful' },
  { id: Feedback.InaccurateOrIrrelevant, label: 'Inexact sau irelevant', category: 'unhelpful' },
  { id: Feedback.OtherUnhelpful, label: 'Altele', category: 'unhelpful' },
  
  // Harmful feedback
  { id: Feedback.HateSpeech, label: 'Discurs de ură, stereotipuri', category: 'harmful' },
  { id: Feedback.Violent, label: 'Violent: glorificarea violenței', category: 'harmful' },
  { id: Feedback.Sexual, label: 'Sexual: conținut explicit', category: 'harmful' },
  { id: Feedback.Manipulative, label: 'Manipulativ: înșelător, emoțional', category: 'harmful' },
  { id: Feedback.OtherHarmful, label: 'Altele', category: 'harmful' },
]

export const MessageFeedback: React.FC<MessageFeedbackProps> = ({
  messageId,
  currentRating,
  flagged = false,
  onRatingChange,
  onFlagChange,
  className
}) => {
  const { persona, theme } = useAppPersonaTheme()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback[]>([])

  const handleRating = async (newRating: 'up' | 'down') => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      let finalRating: 'up' | 'down' | null = null

      if (currentRating === newRating) {
        // If clicking the same rating, remove it
        finalRating = null
        await historyMessageFeedback(messageId, Feedback.Neutral)
      } else {
        // Set new rating
        finalRating = newRating
        const feedbackValue = finalRating === 'up' ? Feedback.Positive : Feedback.Negative
        await historyMessageFeedback(messageId, feedbackValue)
        
        // Show detailed feedback dialog for negative ratings
        if (finalRating === 'down') {
          setShowDetailedFeedback(true)
        }
      }

      onRatingChange(finalRating)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFlag = async () => {
    if (isSubmitting) return

    const newFlaggedState = !flagged
    
    if (newFlaggedState) {
      setShowReportDialog(true)
    } else {
      setIsSubmitting(true)
      try {
        await historyMessageFeedback(messageId, Feedback.Neutral)
        onFlagChange(newFlaggedState)
      } catch (error) {
        console.error('Failed to remove flag:', error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleDetailedFeedback = async (feedbackTypes: Feedback[]) => {
    if (isSubmitting || feedbackTypes.length === 0) return

    setIsSubmitting(true)
    try {
      // Submit combined feedback
      const feedbackString = feedbackTypes.join(',')
      await historyMessageFeedback(messageId, feedbackString)
      setShowDetailedFeedback(false)
      setSelectedFeedback([])
    } catch (error) {
      console.error('Failed to submit detailed feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReportSubmit = async (feedbackTypes: Feedback[]) => {
    if (isSubmitting || feedbackTypes.length === 0) return

    setIsSubmitting(true)
    try {
      const feedbackString = feedbackTypes.join(',')
      await historyMessageFeedback(messageId, feedbackString)
      onFlagChange(true)
      setShowReportDialog(false)
      setSelectedFeedback([])
    } catch (error) {
      console.error('Failed to submit report:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleFeedbackOption = (option: Feedback) => {
    setSelectedFeedback(prev => 
      prev.includes(option) 
        ? prev.filter(f => f !== option)
        : [...prev, option]
    )
  }

  const getButtonColor = (type: 'up' | 'down' | 'flag', isActive: boolean) => {
    if (!isActive) return 'text-gray-400 hover:text-gray-600'
    
    switch (type) {
      case 'up':
        return `text-[${theme.primary.match(/\[([^\]]+)\]/)?.[1] || '#D0337D'}]`
      case 'down':
      case 'flag':
        return 'text-red-500'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto p-1 text-xs rounded-full transition-colors",
            getButtonColor('up', currentRating === 'up')
          )}
          onClick={() => handleRating('up')}
          disabled={isSubmitting}
          title="Răspuns util"
        >
          <ThumbsUp className={cn(
            "w-4 h-4",
            currentRating === 'up' && "fill-current"
          )} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto p-1 text-xs rounded-full transition-colors",
            getButtonColor('down', currentRating === 'down')
          )}
          onClick={() => handleRating('down')}
          disabled={isSubmitting}
          title="Răspuns neutil"
        >
          <ThumbsDown className={cn(
            "w-4 h-4",
            currentRating === 'down' && "fill-current"
          )} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto p-1 text-xs rounded-full transition-colors",
            getButtonColor('flag', flagged)
          )}
          onClick={handleFlag}
          disabled={isSubmitting}
          title="Marchează pentru revizuire"
        >
          <Flag className={cn(
            "w-4 h-4",
            flagged && "fill-current"
          )} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-xs text-gray-400 hover:text-gray-600 rounded-full"
          onClick={() => setShowDetailedFeedback(true)}
          disabled={isSubmitting}
          title="Feedback detaliat"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Detailed Feedback Dialog */}
      <Dialog open={showDetailedFeedback} onOpenChange={setShowDetailedFeedback}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>De ce nu a fost util acest răspuns?</DialogTitle>
            <DialogDescription>
              Selectează motivele pentru care răspunsul nu a fost util. Feedback-ul tău ne ajută să îmbunătățim experiența.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {feedbackOptions
              .filter(option => option.category === 'unhelpful')
              .map(option => (
                <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFeedback.includes(option.id)}
                    onChange={() => toggleFeedbackOption(option.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            
            <div className="pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowDetailedFeedback(false)
                  setShowReportDialog(true)
                }}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Raportează conținut inadecvat
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDetailedFeedback(false)
                setSelectedFeedback([])
              }}
            >
              Anulează
            </Button>
            <Button
              onClick={() => handleDetailedFeedback(selectedFeedback)}
              disabled={selectedFeedback.length === 0 || isSubmitting}
            >
              Trimite feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Content Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Raportează conținut inadecvat</DialogTitle>
            <DialogDescription>
              Conținutul este <span className="text-red-600">*</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {feedbackOptions
              .filter(option => option.category === 'harmful')
              .map(option => (
                <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFeedback.includes(option.id)}
                    onChange={() => toggleFeedbackOption(option.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReportDialog(false)
                setSelectedFeedback([])
              }}
            >
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReportSubmit(selectedFeedback)}
              disabled={selectedFeedback.length === 0 || isSubmitting}
            >
              Raportează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MessageFeedback