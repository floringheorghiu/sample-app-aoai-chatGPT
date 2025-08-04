"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown, Flag, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { apiService, Feedback } from "@/lib/api-service"

interface MessageFeedbackProps {
  messageId: string
  currentRating?: "up" | "down" | null
  flagged?: boolean
  onRatingChange: (rating: "up" | "down" | null) => void
  onFlagChange: (flagged: boolean) => void
  className?: string
}

export function MessageFeedback({
  messageId,
  currentRating,
  flagged = false,
  onRatingChange,
  onFlagChange,
  className = "",
}: MessageFeedbackProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRating = async (newRating: "up" | "down") => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      let finalRating: "up" | "down" | null = null

      if (currentRating === newRating) {
        // If clicking the same rating, remove it
        finalRating = null
      } else {
        // Set new rating
        finalRating = newRating
      }

      // Submit to backend
      if (finalRating) {
        await apiService.submitMessageFeedback({
          message_id: messageId,
          message_feedback: finalRating === "up" ? Feedback.Positive : Feedback.Negative,
        })
      }

      onRatingChange(finalRating)

      toast({
        title: finalRating ? "Feedback trimis" : "Feedback anulat",
        description: finalRating
          ? `Ai evaluat acest răspuns ca ${finalRating === "up" ? "util" : "neutil"}`
          : "Evaluarea a fost anulată",
      })
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite feedback-ul",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFlag = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const newFlaggedState = !flagged

      if (newFlaggedState) {
        await apiService.submitMessageFeedback({
          message_id: messageId,
          message_feedback: Feedback.OtherHarmful,
        })
      }

      onFlagChange(newFlaggedState)

      toast({
        title: newFlaggedState ? "Mesaj marcat" : "Marcare anulată",
        description: newFlaggedState ? "Mesajul a fost marcat pentru revizuire" : "Marcarea a fost anulată",
      })
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut marca mesajul",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDetailedFeedback = async (feedbackType: Feedback) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await apiService.submitMessageFeedback({
        message_id: messageId,
        message_feedback: feedbackType,
      })

      toast({
        title: "Feedback detaliat trimis",
        description: "Mulțumim pentru feedback-ul tău detaliat",
      })
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite feedback-ul",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className={`h-auto p-1 text-xs opacity-70 hover:opacity-100 rounded-full ${
          currentRating === "up" ? "text-[#D0337D]" : "text-[#07050a]/70"
        }`}
        onClick={() => handleRating("up")}
        disabled={isSubmitting}
      >
        <ThumbsUp className={`w-4 h-4 ${currentRating === "up" ? "fill-current" : ""}`} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={`h-auto p-1 text-xs opacity-70 hover:opacity-100 rounded-full ${
          currentRating === "down" ? "text-[#ff4773]" : "text-[#07050a]/70"
        }`}
        onClick={() => handleRating("down")}
        disabled={isSubmitting}
      >
        <ThumbsDown className={`w-4 h-4 ${currentRating === "down" ? "fill-current" : ""}`} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={`h-auto p-1 text-xs opacity-70 hover:opacity-100 rounded-full ${
          flagged ? "text-[#ff4773]" : "text-[#07050a]/70"
        }`}
        onClick={handleFlag}
        disabled={isSubmitting}
      >
        <Flag className={`w-4 h-4 ${flagged ? "fill-current" : ""}`} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-xs opacity-70 hover:opacity-100 rounded-full text-[#07050a]/70"
            disabled={isSubmitting}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleDetailedFeedback(Feedback.MissingCitation)}>
            Lipsesc citări
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDetailedFeedback(Feedback.WrongCitation)}>
            Citări greșite
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDetailedFeedback(Feedback.OutOfScope)}>
            În afara domeniului
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDetailedFeedback(Feedback.InaccurateOrIrrelevant)}>
            Inexact sau irelevant
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleDetailedFeedback(Feedback.HateSpeech)}>
            Discurs de ură
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDetailedFeedback(Feedback.Violent)}>Conținut violent</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDetailedFeedback(Feedback.Sexual)}>Conținut sexual</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDetailedFeedback(Feedback.Manipulative)}>Manipulativ</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
