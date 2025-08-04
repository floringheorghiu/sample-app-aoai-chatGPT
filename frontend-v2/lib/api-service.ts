// API Service Layer for Azure Backend Integration
export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "tool" | "error"
  content: string | MultimodalContent[]
  date: string
  feedback?: string
}

export interface MultimodalContent {
  type: "text" | "image_url"
  text?: string
  image_url?: { url: string }
}

export interface Citation {
  filepath?: string
  url?: string
  chunk_id?: string
  part_index?: number
  title?: string
  content: string
}

export interface ConversationRequest {
  messages: ChatMessage[]
}

export interface FrontendSettings {
  auth_enabled: boolean
  feedback_enabled: boolean
  ui: {
    title: string
    logo?: string
    chat_logo?: string
    chat_title: string
    chat_description: string
    show_share_button: boolean
    show_chat_history_button: boolean
  }
  sanitize_answer: boolean
  oyd_enabled: boolean
}

export interface ConversationListItem {
  id: string
  title: string
  createdAt: string
}

export interface HistoryGenerateRequest {
  messages: ChatMessage[]
  conversation_id?: string
}

export interface HistoryUpdateRequest {
  conversation_id: string
  messages: ChatMessage[]
}

export interface HistoryReadRequest {
  conversation_id: string
}

export interface HistoryRenameRequest {
  conversation_id: string
}

export interface HistoryDeleteRequest {
  conversation_id: string
}

export interface MessageFeedbackRequest {
  message_id: string
  message_feedback: string
}

export enum Feedback {
  Positive = "positive",
  Negative = "negative",
  Neutral = "neutral",
  MissingCitation = "missing_citation",
  WrongCitation = "wrong_citation",
  OutOfScope = "out_of_scope",
  InaccurateOrIrrelevant = "inaccurate_or_irrelevant",
  OtherUnhelpful = "other_unhelpful",
  HateSpeech = "hate_speech",
  Violent = "violent",
  Sexual = "sexual",
  Manipulative = "manipulative",
  OtherHarmful = "other_harmful",
}

class ApiService {
  private baseUrl: string

  constructor() {
    // Use environment variable or default to current origin
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  }

  // Frontend Settings
  async getFrontendSettings(): Promise<FrontendSettings> {
    try {
      const response = await fetch(`${this.baseUrl}/frontend_settings`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error fetching frontend settings:", error)
      // Return default settings
      return {
        auth_enabled: false,
        feedback_enabled: true,
        ui: {
          title: "Asistent AI Narada",
          chat_title: "Asistent AI Narada",
          chat_description: "Asistent AI pentru organizația NGO",
          show_share_button: false,
          show_chat_history_button: true,
        },
        sanitize_answer: true,
        oyd_enabled: false, // Changed to false since image upload is disabled
      }
    }
  }

  // Streaming Chat
  async *streamConversation(messages: ChatMessage[]): AsyncGenerator<ChatMessage, void, unknown> {
    try {
      // Mock response instead of actual API call
      yield* this.generateMockResponse(messages)
    } catch (error) {
      console.error("Error in streaming conversation:", error)
      // Yield error message
      yield {
        id: Date.now().toString(),
        role: "error",
        content: "Eroare de conexiune. Vă rugăm să încercați din nou.",
        date: new Date().toISOString(),
      }
    }
  }

  // Add mock response generator
  private async *generateMockResponse(messages: ChatMessage[]): AsyncGenerator<ChatMessage, void, unknown> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const lastMessage = messages[messages.length - 1]
    const userContent = typeof lastMessage.content === "string" ? lastMessage.content : "mesaj"

    // Generate contextual mock responses based on user input
    let mockResponse = ""

    if (userContent.toLowerCase().includes("narada")) {
      mockResponse =
        "Narada este o organizație non-guvernamentală dedicată educației și dezvoltării personale. Suntem aici pentru a sprijini elevii, părinții și profesorii în călătoria lor educațională."
    } else if (userContent.toLowerCase().includes("anxietate") || userContent.toLowerCase().includes("stres")) {
      mockResponse =
        "Înțeleg că te confrunți cu anxietate. Este important să știi că aceste sentimente sunt normale. Iată câteva tehnici care pot ajuta:\n\n1. Respirația profundă - inspiră pe nas 4 secunde, ține 4 secunde, expiră pe gură 6 secunde\n2. Exercițiile de mindfulness\n3. Vorbește cu un adult de încredere\n\nDacă anxietatea persistă, este recomandat să discuți cu un specialist."
    } else if (userContent.toLowerCase().includes("teme") || userContent.toLowerCase().includes("școală")) {
      mockResponse =
        "Pentru a gestiona mai bine temele și activitățile școlare, îți recomand:\n\n• Creează un program zilnic structurat\n• Împarte sarcinile mari în pași mai mici\n• Fă pauze regulate în timpul învățării\n• Găsește un spațiu liniștit pentru studiu\n• Nu ezita să ceri ajutor când ai nevoie"
    } else if (userContent.toLowerCase().includes("profesor") || userContent.toLowerCase().includes("învățător")) {
      mockResponse =
        "Colaborarea între părinți și profesori este esențială pentru succesul educațional al copilului. Iată câteva sfaturi:\n\n• Participă activ la întâlnirile cu profesorii\n• Comunică deschis despre progresul copilului\n• Respectă metodele pedagogice ale profesorului\n• Oferă sprijin pentru activitățile școlare acasă"
    } else {
      mockResponse = `Mulțumesc pentru întrebarea ta. Ca asistent AI Narada, sunt aici să te ajut cu informații și sfaturi legate de educație, dezvoltare personală și bunăstare. Poți să-mi spui mai multe despre ce te preocupă sau ce ai dori să afli?`
    }

    // Simulate streaming by yielding chunks
    const words = mockResponse.split(" ")
    let accumulatedContent = ""

    for (let i = 0; i < words.length; i++) {
      accumulatedContent += (i > 0 ? " " : "") + words[i]

      yield {
        id: Date.now().toString(),
        role: "assistant",
        content: accumulatedContent,
        date: new Date().toISOString(),
      }

      // Small delay between words to simulate streaming
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    // Optionally add mock citations for some responses
    if (userContent.toLowerCase().includes("anxietate") || userContent.toLowerCase().includes("stres")) {
      yield {
        id: (Date.now() + 1).toString(),
        role: "tool",
        content: JSON.stringify({
          citations: [
            {
              title: "Ghidul Gestionării Anxietății pentru Elevi",
              content: "Tehnicile de respirație profundă pot ajuta la gestionarea anxietății în timpul examenelor...",
              filepath: "docs/anxiety-management-guide.pdf",
            },
          ],
        }),
        date: new Date().toISOString(),
      }
    }
  }

  // History Management - Mock implementations
  async generateHistory(request: HistoryGenerateRequest): Promise<{ conversation_id: string }> {
    // Generate a mock conversation ID
    const conversation_id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return { conversation_id }
  }

  async updateHistory(request: HistoryUpdateRequest): Promise<void> {
    // Mock implementation - in a real app this would save to backend
    console.log("Mock: Updated conversation history", request.conversation_id)
  }

  async getConversationList(offset = 0): Promise<ConversationListItem[]> {
    // Return empty list for mock implementation
    return []
  }

  async readConversation(request: HistoryReadRequest): Promise<{ messages: ChatMessage[] }> {
    // Return empty messages for mock implementation
    return { messages: [] }
  }

  async renameConversation(request: HistoryRenameRequest): Promise<void> {
    console.log("Mock: Renamed conversation", request.conversation_id, request.title)
  }

  async deleteConversation(request: HistoryDeleteRequest): Promise<void> {
    console.log("Mock: Deleted conversation", request.conversation_id)
  }

  async clearConversation(conversation_id: string): Promise<void> {
    console.log("Mock: Cleared conversation", conversation_id)
  }

  async deleteAllConversations(): Promise<void> {
    console.log("Mock: Deleted all conversations")
  }

  // Feedback System - Mock implementation
  async submitMessageFeedback(request: MessageFeedbackRequest): Promise<void> {
    console.log("Mock: Submitted feedback", request.message_id, request.message_feedback)
  }
}

// Utility functions
export const parseCitationFromMessage = (message: ChatMessage): Citation[] => {
  if (message?.role === "tool" && typeof message?.content === "string") {
    try {
      const toolMessage = JSON.parse(message.content) as { citations: Citation[] }
      return toolMessage.citations || []
    } catch {
      return []
    }
  }
  return []
}

export const formatFilePath = (filepath: string, maxLength = 50): string => {
  if (filepath.length <= maxLength) return filepath

  const parts = filepath.split("/")
  if (parts.length <= 2) return filepath

  return `${parts[0]}/.../${parts[parts.length - 1]}`
}

// Create singleton instance
export const apiService = new ApiService()
