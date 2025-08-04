"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Send,
  GraduationCap,
  Users,
  BookOpen,
  Info,
  Zap,
  Clock,
  MessageSquareIcon,
  Settings,
  UserX,
  Plus,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar } from "@/components/avatar"
import { ConversationHistoryPanel } from "@/components/conversation-history-panel"
import { CitationPanel } from "@/components/citation-panel"
import { MessageFeedback } from "@/components/message-feedback"
import {
  apiService,
  parseCitationFromMessage,
  type ChatMessage,
  type Citation,
  type FrontendSettings,
} from "@/lib/api-service"
import onboardingQuickQuestions from "@/admin/onboardingQuickQuestions.json"

type Persona = "elev" | "părinte" | "profesor" | "incognito" // Add 'incognito' to Persona type
type InterestArea =
  | "smart_learning"
  | "emotional_wellbeing"
  | "online_safety"
  | "student_voice"
  | "help_with_school"
  | "school_communication"
  | "child_mental_health"
  | "community_involvement"
  | "student_autonomy"
  | "positive_classroom"
  | "family_community"
  | "teacher_development"

interface Message extends ChatMessage {
  citations?: Citation[]
  rating?: "up" | "down" | null
  flagged?: boolean
  isStreaming?: boolean
}

interface OnboardingData {
  persona: Persona | null
  interest: InterestArea | null
  selectedTopicLabel: string | null // New field to store the selected topic label
}

interface SessionStats {
  sessionId: string
  startTime: Date
  totalMessages: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  averageResponseTime: number
  persona: Persona
  interest: InterestArea | null
}

export interface Conversation {
  // Exported for use in ConversationHistoryPanel
  id: string
  persona: Persona
  interest: InterestArea | null
  summary: string
  messages: Message[]
  name: string // Add a name for the conversation
  archived: boolean // Add archived status
}

const personaConfig = {
  elev: {
    name: "Elev",
    icon: GraduationCap,
    theme: {
      bg: "bg-[#FEEFF7]",
      text: "text-[#07050a]",
      primary: "bg-[#D0337D] hover:bg-[#B02A6B] text-white",
      secondary: "bg-[#ff4773]/10 text-[#07050a]",
      userBubble: "bg-[#D0337D]",
      accent: "border-[#D0337D]",
    },
  },
  părinte: {
    name: "Părinte",
    icon: Users,
    theme: {
      bg: "bg-[#FEEFF7]",
      text: "text-[#07050a]",
      primary: "bg-[#ff4773] hover:bg-[#E63E66] text-white",
      secondary: "bg-[#ff4773]/10 text-[#07050a]",
      userBubble: "bg-[#ff4773]",
      accent: "border-[#ff4773]",
    },
  },
  profesor: {
    name: "Profesor",
    icon: BookOpen,
    theme: {
      bg: "bg-[#FEEFF7]",
      text: "text-[#07050a]",
      primary: "bg-[#9a6ae1] hover:bg-[#8A5DD1] text-white",
      secondary: "bg-[#9a6ae1]/10 text-[#07050a]",
      userBubble: "bg-[#9a6ae1]",
      accent: "border-[#9a6ae1]",
    },
  },
  incognito: {
    // New Incognito persona configuration
    name: "Incognito",
    icon: UserX,
    theme: {
      bg: "bg-[#FEEFF7]",
      text: "text-[#07050a]",
      primary: "bg-gray-600 hover:bg-gray-700 text-white",
      secondary: "bg-gray-600/10 text-[#07050a]",
      userBubble: "bg-gray-600",
      accent: "border-gray-600",
    },
  },
}

const personaOptions = [
  {
    id: "elev" as Persona,
    label: "Elev",
    description: "elev de gimnaziu",
    icon: GraduationCap,
  },
  {
    id: "părinte" as Persona,
    label: "Părinte",
    description: "părinte de elev",
    icon: Users,
  },
  {
    id: "profesor" as Persona,
    label: "Profesor",
    description: "învățător, profesor",
    icon: BookOpen,
  },
  {
    id: "incognito" as Persona, // New Incognito option
    label: "Incognito",
    description: "preferi să nu spui",
    icon: UserX,
  },
]

// The interest options will now be derived from onboardingQuickQuestions.json
// This structure is kept for type safety and initial display, but actual questions come from JSON
const interestOptionsByPersona = {
  elev: onboardingQuickQuestions.elev.topics.map((topic) => ({
    id: topic.label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() as InterestArea,
    label: topic.label,
  })),
  părinte: onboardingQuickQuestions["parinte"].topics.map((topic) => ({
    id: topic.label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() as InterestArea,
    label: topic.label,
  })),
  profesor: onboardingQuickQuestions.profesor.topics.map((topic) => ({
    id: topic.label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() as InterestArea,
    label: topic.label,
  })),
  incognito: [], // No interest options for incognito
}

// Token cost per 1K tokens (example pricing)
const TOKEN_COST_PER_1K = 0.002

export default function NGOAIAssistant() {
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    persona: null,
    interest: null,
    selectedTopicLabel: null, // Initialize new field
  })
  const [currentPersona, setCurrentPersona] = useState<Persona>("elev")
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState(() => Math.random().toString(36).substr(2, 9)) // Make sessionId mutable
  const [sessionStartTime, setSessionStartTime] = useState(() => new Date()) // Make sessionStartTime mutable
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    sessionId,
    startTime: sessionStartTime,
    totalMessages: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    averageResponseTime: 1.5,
    persona: "elev",
    interest: null,
  })
  const [pastConversations, setPastConversations] = useState<Conversation[]>([])
  const [currentQuickQuestions, setCurrentQuickQuestions] = useState<string[]>([]) // New state for quick questions
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false) // New state for history panel
  const [usedQuickQuestions, setUsedQuickQuestions] = useState<Set<string>>(new Set()) // New state for used questions
  const [frontendSettings, setFrontendSettings] = useState<FrontendSettings>()
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null) // Declare currentConversationId

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await apiService.getFrontendSettings()
        setFrontendSettings(settings)
      } catch (error) {
        console.error("Error loading frontend settings:", error)
      }
    }
    loadSettings()
  }, [])

  // Calculate token usage from messages
  const calculateTokenUsage = (content: string, type: "input" | "output") => {
    // Rough estimation: 1 token ≈ 4 characters for Romanian text
    const estimatedTokens = Math.ceil(content.length / 4)
    return estimatedTokens
  }

  const updateSessionStats = (newMessage: Message) => {
    setSessionStats((prev) => {
      const messageTokens = newMessage.tokens || {
        input: newMessage.type === "user" ? calculateTokenUsage(newMessage.content, "input") : 0,
        output: newMessage.type === "ai" ? calculateTokenUsage(newMessage.content, "output") : 0,
        total: calculateTokenUsage(newMessage.content, newMessage.type === "user" ? "input" : "output"),
      }

      const newInputTokens = prev.inputTokens + messageTokens.input
      const newOutputTokens = prev.outputTokens + messageTokens.output
      const newTotalTokens = newInputTokens + newOutputTokens
      const newEstimatedCost = (newTotalTokens / 1000) * TOKEN_COST_PER_1K

      return {
        ...prev,
        totalMessages: prev.totalMessages + 1,
        totalTokens: newTotalTokens,
        inputTokens: newInputTokens,
        outputTokens: newOutputTokens,
        estimatedCost: newEstimatedCost,
        persona: currentPersona,
        interest: onboardingData.interest,
      }
    })
  }

  const handleRating = (messageId: string, newRating: "up" | "down") => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.id === messageId && msg.type === "ai") {
          let updatedRating: "up" | "down" | null = null
          if (msg.rating === newRating) {
            // If clicking the same filled icon, revoke rating
            updatedRating = null
          } else {
            // If clicking a different icon or an unfilled icon, set new rating
            updatedRating = newRating
          }
          return { ...msg, rating: updatedRating }
        }
        return msg
      }),
    )
  }

  const handleFlag = (messageId: string) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.id === messageId && msg.type === "ai") {
          return { ...msg, flagged: !msg.flagged } // Toggle flagged status
        }
        return msg
      }),
    )
    // In a real application, you would send this flag to your backend
    console.log(`Message ${messageId} flagged/unflagged.`)
  }

  const completeOnboarding = () => {
    if (onboardingData.persona) {
      setCurrentPersona(onboardingData.persona)
    }

    let welcomeMessageContent: string
    let conversationSummary: string
    let selectedInterest: InterestArea | null = null
    let questionsForChat: string[] = []

    if (onboardingData.persona === "incognito") {
      setOnboardingComplete(true)
      welcomeMessageContent = `Bun venit! Sunt asistentul tău AI Narada. Cum te pot ajuta astăzi?`
      conversationSummary = `Conversație incognito`
      // For incognito, provide some general questions
      questionsForChat = ["Ce este Narada?", "Cum funcționează acest asistent?", "Pot să pun orice întrebare?"]
    } else {
      setOnboardingComplete(true)
      selectedInterest = onboardingData.interest

      // Fix the persona data access using bracket notation for "parinte"
      const personaKey = onboardingData.persona === "părinte" ? "parinte" : onboardingData.persona
      const selectedPersonaData = onboardingQuickQuestions[personaKey as keyof typeof onboardingQuickQuestions]

      const selectedTopic = selectedPersonaData?.topics.find(
        (topic) => topic.label === onboardingData.selectedTopicLabel,
      )
      questionsForChat = selectedTopic ? selectedTopic.questions : []

      const selectedInterestLabel = onboardingData.selectedTopicLabel || "our programs"
      welcomeMessageContent = `Bun venit! Sunt asistentul tău AI Narada. Văd că ești un ${onboardingData.persona} interesat ${selectedInterestLabel}. Cum te pot ajuta astăzi?`
      conversationSummary = `Conversație cu un ${personaConfig[onboardingData.persona!].name}`
    }

    setCurrentQuickQuestions(questionsForChat) // Set the quick questions for the chat interface

    // Add welcome message
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: welcomeMessageContent,
      date: new Date().toISOString(),
      flagged: false, // Initialize flagged status
    }
    setMessages([welcomeMessage])
    // updateSessionStats(welcomeMessage)

    // Create a new conversation
    const newConversation: Conversation = {
      id: sessionId,
      persona: onboardingData.persona!,
      interest: selectedInterest,
      summary: conversationSummary,
      messages: [welcomeMessage],
      name: conversationSummary, // Default name
      archived: false,
    }
    setPastConversations([newConversation])
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    setError(null)
    setIsLoading(true)

    // Prepare message content
    const messageContent: string = content.trim()

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      date: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")

    try {
      // Create conversation messages for API
      const apiMessages: ChatMessage[] = [...messages, userMessage].map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        date: msg.date,
        feedback: msg.rating || undefined,
      }))

      // Generate or update conversation history
      if (!currentConversationId) {
        const historyResponse = await apiService.generateHistory({ messages: apiMessages })
        setCurrentConversationId(historyResponse.conversation_id)
      }

      let currentAssistantMessage: Message | null = null
      let accumulatedContent = ""

      // Stream the response
      for await (const chunk of apiService.streamConversation(apiMessages)) {
        if (chunk.role === "assistant") {
          accumulatedContent += typeof chunk.content === "string" ? chunk.content : ""

          if (!currentAssistantMessage) {
            // Create new assistant message
            currentAssistantMessage = {
              id: chunk.id,
              role: "assistant",
              content: accumulatedContent,
              date: chunk.date,
              isStreaming: true,
              rating: null,
              flagged: false,
            }
            setMessages((prev) => [...prev, currentAssistantMessage!])
          } else {
            // Update existing message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === currentAssistantMessage!.id ? { ...msg, content: accumulatedContent } : msg,
              ),
            )
          }
        } else if (chunk.role === "tool") {
          // Parse citations from tool message
          const citations = parseCitationFromMessage(chunk)
          if (currentAssistantMessage && citations.length > 0) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === currentAssistantMessage!.id ? { ...msg, citations } : msg)),
            )
          }
        } else if (chunk.role === "error") {
          // Handle error messages
          const errorMessage: Message = {
            id: chunk.id,
            role: "error",
            content: chunk.content,
            date: chunk.date,
          }
          setMessages((prev) => [...prev, errorMessage])
          setError(typeof chunk.content === "string" ? chunk.content : "A apărut o eroare")
        }
      }

      // Mark streaming as complete
      if (currentAssistantMessage) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === currentAssistantMessage!.id ? { ...msg, isStreaming: false } : msg)),
        )

        // Update conversation history
        if (currentConversationId) {
          const updatedMessages = [
            ...apiMessages,
            {
              id: currentAssistantMessage.id,
              role: currentAssistantMessage.role,
              content: currentAssistantMessage.content,
              date: currentAssistantMessage.date,
            },
          ] as ChatMessage[]

          await apiService.updateHistory({
            conversation_id: currentConversationId,
            messages: updatedMessages,
          })
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Nu s-a putut trimite mesajul. Vă rugăm să încercați din nou.")

      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "error",
        content: "Eroare de conexiune. Vă rugăm să încercați din nou.",
        date: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickReply = (reply: string) => {
    setInputValue(reply)
    sendMessage(reply)
    // Add the question to used questions set
    setUsedQuickQuestions((prev) => new Set([...prev, reply]))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  const formatDuration = (startTime: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - startTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffSecs = Math.floor((diffMs % 60000) / 1000)
    return `${diffMins}m ${diffSecs}s`
  }

  const startNewConversation = () => {
    // Reset the state to start a new conversation
    setMessages([])
    setInputValue("")
    setIsLoading(false)
    setError(null)

    // Generate a new session ID and start time
    const newSessionId = Math.random().toString(36).substr(2, 9)
    const newSessionStartTime = new Date()

    setSessionId(newSessionId)
    setSessionStartTime(newSessionStartTime)

    // Update the session stats with the new session ID and start time
    setSessionStats({
      sessionId: newSessionId,
      startTime: newSessionStartTime,
      totalMessages: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      averageResponseTime: 1.5,
      persona: currentPersona,
      interest: onboardingData.interest,
    })

    // Reset quick questions for new conversation
    setCurrentQuickQuestions([])
    setUsedQuickQuestions(new Set()) // Reset used questions
    setCurrentConversationId(null) // Reset current conversation ID
  }

  const loadConversation = (conversationId: string) => {
    // Find the conversation with the given ID
    const conversation = pastConversations.find((conv) => conv.id === conversationId)

    if (conversation) {
      // Set current session to the loaded conversation
      setSessionId(conversation.id)
      setSessionStartTime(conversation.messages[0]?.date ? new Date(conversation.messages[0].date) : new Date()) // Use first message timestamp or current time

      // Load the messages from the conversation
      setMessages(conversation.messages)

      // Set the current persona to the persona of the conversation
      setCurrentPersona(conversation.persona)

      // Update the session stats with the conversation data
      setSessionStats({
        sessionId: conversation.id,
        startTime: conversation.messages[0]?.date ? new Date(conversation.messages[0].date) : new Date(),
        totalMessages: conversation.messages.length,
        totalTokens: conversation.messages.reduce((total, msg) => total + (msg.tokens?.total || 0), 0),
        inputTokens: conversation.messages.reduce((total, msg) => total + (msg.tokens?.input || 0), 0),
        outputTokens: conversation.messages.reduce((total, msg) => total + (msg.tokens?.output || 0), 0),
        estimatedCost:
          (conversation.messages.reduce((total, msg) => total + (msg.tokens?.total || 0), 0) / 1000) *
          TOKEN_COST_PER_1K,
        averageResponseTime: 1.5, // You might want to calculate this based on the conversation
        persona: conversation.persona,
        interest: conversation.interest,
      })

      // Load quick questions for the loaded conversation's persona and interest
      if (conversation.persona !== "incognito" && conversation.interest) {
        // Fix the persona data access using bracket notation for "parinte"
        const personaKey = conversation.persona === "părinte" ? "parinte" : conversation.persona
        const selectedPersonaData = onboardingQuickQuestions[personaKey as keyof typeof onboardingQuickQuestions]

        const selectedTopic = selectedPersonaData?.topics.find(
          (topic) =>
            topic.label ===
            interestOptionsByPersona[conversation.persona].find((opt) => opt.id === conversation.interest)?.label,
        )
        setCurrentQuickQuestions(selectedTopic ? selectedTopic.questions : [])
      } else if (conversation.persona === "incognito") {
        setCurrentQuickQuestions(["Ce este Narada?", "Cum funcționează acest asistent?", "Pot să pun orice întrebare?"])
      } else {
        setCurrentQuickQuestions([])
      }
      setUsedQuickQuestions(new Set()) // Reset used questions for loaded conversation
      setIsHistoryPanelOpen(false) // Close panel after loading
    }
  }

  const handleEditConversationName = (id: string, newName: string) => {
    setPastConversations((prev) => prev.map((conv) => (conv.id === id ? { ...conv, name: newName } : conv)))
  }

  const handleArchiveConversation = (id: string) => {
    setPastConversations((prev) => prev.map((conv) => (conv.id === id ? { ...conv, archived: !conv.archived } : conv)))
  }

  const config = personaConfig[currentPersona]

  if (!onboardingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEEFF7] to-[#FEEFF7]/80 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg border-[#D0337D]/20">
          <CardContent className="p-6 sm:p-8 border-none">
            <div className="text-center mb-6">
              <img src="/narada-logo.svg" alt="Narada Logo" className="w-24 h-24 mx-auto mb-auto text-[#D0337D]" />
              <h1 className="text-xl sm:text-2xl text-[#07050a] mb-2 font-semibold">Bună, eu sunt asistentul tău!</h1>
              <p className="text-sm sm:text-base text-[#07050a]/70 text-slate-500 font-light">
                Te rog selectează o opțiune de mai jos pentru a te putea cunoaște mai bine.
              </p>
            </div>

            {onboardingStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#07050a] mb-4">Aș dori să știu dacă ești:</h2>
                <div className="grid grid-cols-2 gap-3">
                  {" "}
                  {/* Changed to grid for 2x2 layout */}
                  {personaOptions.map((option) => {
                    const IconComponent = option.icon
                    return (
                      <Button
                        key={option.id}
                        variant={onboardingData.persona === option.id ? "default" : "outline"}
                        className={`w-full justify-start text-left h-auto p-4 rounded-medium ${
                          onboardingData.persona === option.id
                            ? "bg-[#D0337D] hover:bg-[#B02A6B] text-white border-[#D0337D]"
                            : "border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5"
                        }`}
                        onClick={() => setOnboardingData((prev) => ({ ...prev, persona: option.id }))}
                      >
                        <div className="flex items-center space-x-3">
                          <IconComponent className="w-5 h-5 text-[rgba(208,51,125,1)]" />
                          <div className="flex flex-col items-start">
                            <span className="text-sm sm:text-base font-bold">{option.label}</span>
                            <span
                              className={`text-xs ${onboardingData.persona === option.id ? "text-white/80" : "text-[#07050a]/60"}`}
                            >
                              {option.description}
                            </span>
                          </div>
                        </div>
                      </Button>
                    )
                  })}
                </div>
                <Button
                  className="w-full mt-6 bg-[#D0337D] hover:bg-[#B02A6B] text-white rounded-full"
                  disabled={!onboardingData.persona}
                  onClick={() => {
                    if (onboardingData.persona === "incognito") {
                      completeOnboarding()
                    } else {
                      setOnboardingStep(2)
                    }
                  }}
                >
                  {onboardingData.persona === "incognito" ? "Începe Chat-ul" : "Continuă"}
                </Button>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[#07050a] mb-6">Ce te interesează cel mai mult?</h2>
                <div className="space-y-4">
                  {onboardingData.persona &&
                    interestOptionsByPersona[onboardingData.persona].map((option) => (
                      <Button
                        key={option.id}
                        variant={onboardingData.interest === option.id ? "default" : "outline"}
                        className={`w-full h-auto p-6 flex items-start justify-start text-left leading-relaxed rounded-medium ${
                          onboardingData.interest === option.id
                            ? "bg-[#D0337D] hover:bg-[#B02A6B] text-white border-[#D0337D]"
                            : "border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5"
                        }`}
                        onClick={() =>
                          setOnboardingData((prev) => ({
                            ...prev,
                            interest: option.id,
                            selectedTopicLabel: option.label,
                          }))
                        }
                      >
                        <span className="text-sm font-medium whitespace-normal">{option.label}</span>
                      </Button>
                    ))}
                </div>
                <div className="flex space-x-3 mt-8">
                  <Button
                    variant="outline"
                    className="flex-1 border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-transparent rounded-full"
                    onClick={() => setOnboardingStep(1)}
                  >
                    Înapoi
                  </Button>
                  <Button
                    className="flex-1 bg-[#D0337D] hover:bg-[#B02A6B] text-white rounded-full"
                    disabled={!onboardingData.interest}
                    onClick={completeOnboarding}
                  >
                    Începe Chat-ul
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`min-h-screen ${config.theme.bg} ${config.theme.text} transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto h-screen flex flex-col">
          {/* Header with Persona Selection */}
          <div className="bg-white shadow-sm border-[#D0337D]/10 p-4 border-b-0 rounded-none">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg sm:text-xl font-bold text-[#07050a]">Asistent AI Narada</h1>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-[#07050a]/70 hover:text-[#07050a] hover:bg-[#D0337D]/5 rounded-full"
                  >
                    <Info className="w-4 h-4 mr-1" />
                    Statistică
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border-[#D0337D]/20">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-[#07050a] flex items-center gap-2">
                        <Zap className="w-5 h-5 text-[#D0337D]" />
                        Statistici Sesiune
                      </DialogTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#07050a]/50 hover:text-[#07050a] hover:bg-[#D0337D]/5 p-1 rounded-full"
                        onClick={() => window.open("/admin", "_blank")}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                    <DialogDescription className="text-[#07050a]/70">
                      Informații despre sesiunea curentă
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Session Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-[#07050a]">ID Sesiune:</span>
                        <p className="text-[#07050a]/70 font-mono text-xs">{sessionStats.sessionId}</p>
                      </div>
                      <div>
                        <span className="font-medium text-[#07050a]">Durată:</span>
                        <p className="text-[#07050a]/70">{formatDuration(sessionStats.startTime)}</p>
                      </div>
                    </div>

                    <Separator className="bg-[#D0337D]/20" />

                    {/* Token Usage */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-[#07050a] flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#D0337D]" />
                        Utilizare Token-uri
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <Card className="p-3 border-[#D0337D]/20">
                          <div className="text-center">
                            <div className="text-lg font-bold text-[#D0337D]">
                              {sessionStats.inputTokens.toLocaleString()}
                            </div>
                            <div className="text-xs text-[#07050a]/70">Token-uri Input</div>
                          </div>
                        </Card>
                        <Card className="p-3 border-[#D0337D]/20">
                          <div className="text-center">
                            <div className="text-lg font-bold text-[#ff4773]">
                              {sessionStats.outputTokens.toLocaleString()}
                            </div>
                            <div className="text-xs text-[#07050a]/70">Token-uri Output</div>
                          </div>
                        </Card>
                      </div>

                      <Card className="p-3 border-[#D0337D]/20 bg-[#D0337D]/5">
                        <div className="text-center">
                          <div className="text-xl font-bold text-[#07050a]">
                            {sessionStats.totalTokens.toLocaleString()}
                          </div>
                          <div className="text-sm text-[#07050a]/70">Total Token-uri</div>
                        </div>
                      </Card>
                    </div>

                    <Separator className="bg-[#D0337D]/20" />

                    {/* Cost and Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#07050a]">Cost Estimat:</span>
                        <Badge variant="outline" className="border-[#D0337D]/30 text-[#D0337D]">
                          ${sessionStats.estimatedCost.toFixed(4)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#07050a]">Mesaje Totale:</span>
                        <div className="flex items-center gap-1">
                          <MessageSquareIcon className="w-4 h-4 text-[#07050a]/70" />
                          <span className="text-sm text-[#07050a]">{sessionStats.totalMessages}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#07050a]">Timp Mediu Răspuns:</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-[#07050a]/70" />
                          <span className="text-sm text-[#07050a]">{sessionStats.averageResponseTime}s</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#07050a]">Persona:</span>
                        <Badge
                          className={
                            sessionStats.persona === "elev"
                              ? "bg-[#D0337D]/10 text-[#D0337D] border-[#D0337D]/20"
                              : sessionStats.persona === "părinte"
                                ? "bg-[#ff4773]/10 text-[#ff4773] border-[#ff4773]/20"
                                : sessionStats.persona === "profesor"
                                  ? "bg-[#9a6ae1]/10 text-[#9a6ae1] border-[#9a6ae1]/20"
                                  : "bg-gray-600/10 text-gray-600 border-gray-600/20" // Incognito color
                          }
                        >
                          {personaConfig[sessionStats.persona].name}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="bg-[#D0337D]/20" />

                    {/* Additional Info */}
                    <div className="text-xs text-[#07050a]/60 space-y-1">
                      <p>• Token-urile sunt estimate pe baza lungimii textului</p>
                      <p>• Costul este calculat la ${TOKEN_COST_PER_1K.toFixed(3)} per 1K token-uri</p>
                      <p>• Statisticile se resetează la începutul unei noi sesiuni</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Conversation Action Buttons */}
            <div className="flex flex-row flex-wrap gap-2 overflow-x-auto pb-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 text-xs sm:text-sm border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-white/50 rounded-medium px-3 sm:px-4"
                onClick={startNewConversation}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Conversație nouă</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 text-xs sm:text-sm border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-white/50 rounded-medium px-3 sm:px-4"
                onClick={() => setIsHistoryPanelOpen(true)}
              >
                <History className="w-4 h-4 mr-2" />
                <span>Istoric conversații</span>
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white pb-32">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} gap-3`}
              >
                {/* Avatar for user messages (left side) */}
                {message.role === "user" && <Avatar persona={currentPersona} type="user" className="mt-1" />}

                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 ${
                    message.role === "user"
                      ? `${config.theme.userBubble} text-white`
                      : `${config.theme.secondary} ${config.theme.text}`
                  }`}
                >
                  <p className="text-sm sm:text-base whitespace-pre-wrap">
                    {typeof message.content === "string"
                      ? message.content
                      : message.content.map((item) => {
                          if (item.type === "text") {
                            return item.text
                          }
                          return ""
                        })}
                  </p>

                  {/* In the message rendering loop, replace the existing message feedback section with: */}
                  {message.role === "assistant" && (
                    <div className="mt-3">
                      <CitationPanel citations={message.citations || []} />
                      <MessageFeedback
                        messageId={message.id}
                        currentRating={message.rating}
                        flagged={message.flagged}
                        onRatingChange={(rating) => {
                          setMessages((prev) => prev.map((msg) => (msg.id === message.id ? { ...msg, rating } : msg)))
                        }}
                        onFlagChange={(flagged) => {
                          setMessages((prev) => prev.map((msg) => (msg.id === message.id ? { ...msg, flagged } : msg)))
                        }}
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>

                {/* Avatar for AI messages (right side) */}
                {message.role === "assistant" && <Avatar persona={currentPersona} type="ai" className="mt-1" />}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start gap-3">
                <div className="w-8 h-8"></div> {/* Spacer for alignment */}
                <div
                  className={`${config.theme.secondary} ${config.theme.text} rounded-lg p-3 max-w-[85%] sm:max-w-[70%]`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm">Mă gândesc...</span>
                  </div>
                </div>
                <Avatar persona={currentPersona} type="ai" className="mt-1" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Buttons */}
          <div className="relative px-4 pb-2 bg-white pb-24">
            <div className="flex flex-wrap gap-2 pb-2">
              {currentQuickQuestions
                .filter((question) => !usedQuickQuestions.has(question))
                .map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto p-2 text-xs sm:text-sm border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-white/50 rounded-medium whitespace-normal text-left transition-opacity duration-300 ease-out max-w-[calc(50%-0.25rem)] flex-shrink-0"
                    onClick={() => handleQuickReply(question)}
                    disabled={isLoading}
                  >
                    {question}
                  </Button>
                ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-[#D0337D]/10 border-t max-w-4xl mx-auto z-10">
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
            )}

            <div className="flex space-x-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Întreabă-mă orice ca ${config.name.toLowerCase()}...`}
                className="flex-1 min-h-[44px] max-h-32 resize-none text-sm sm:text-base border-[#D0337D]/20 focus:border-[#D0337D] text-[#07050a]"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className={`${config.theme.primary} px-4 py-2 w-12 sm:w-40 h-auto rounded-medium`}
              >
                {isLoading ? (
                  <span className="text-xs sm:text-sm">Mă gândesc...</span>
                ) : (
                  <>
                    <Send className="w-6 h-6 sm:mr-2" />
                    <span className="hidden sm:inline text-xl">Trimite</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ConversationHistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        conversations={pastConversations}
        onLoadConversation={loadConversation}
        onEditConversationName={handleEditConversationName}
        onArchiveConversation={handleArchiveConversation}
      />
    </TooltipProvider>
  )
}
