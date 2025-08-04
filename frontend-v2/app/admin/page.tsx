"use client"

import { useState } from "react"
import {
  Users,
  MessageSquare,
  Settings,
  Eye,
  Edit3,
  Download,
  Search,
  MoreHorizontal,
  Clock,
  BarChart3,
  Activity,
  MessageCircle,
  FileText,
  Star,
  Flag,
  Calendar,
  Filter,
  Tag,
  Target,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { AdminAuthDialog } from "@/components/admin-auth-dialog" // Import the new component

type ConversationStatus = "active" | "completed" | "needs_attention"
type Persona = "elev" | "părinte" | "profesor"

interface AdminConversation {
  id: string
  sessionId: string
  persona: Persona
  status: ConversationStatus
  messageCount: number
  lastActivity: Date
  userSatisfaction?: number
  flagged: boolean
  tags: string[]
  summary: string
  tokenUsage: number
  estimatedCost: number
}

interface AdminMessage {
  id: string
  conversationId: string
  type: "user" | "ai"
  content: string
  timestamp: Date
  confidence?: number
  responseTime?: number
  edited: boolean
  chunkIds?: string[]
}

interface ResponseTemplate {
  id: string
  title: string
  content: string
  persona: Persona[]
  category: string
  usage: number
  lastUpdated: Date
  active: boolean
}

interface ChunkCitation {
  id: string
  chunkId: string
  snippet: string
  documentOrigin: string
  citationCount: number
  avgRating: number
  personaBreakdown: Record<Persona, number>
  lastCited: Date
  flaggedCount: number
}

interface AnalyticsData {
  totalConversations: number
  activeConversations: number
  avgSatisfaction: number
  avgResponseTime: number
  personaDistribution: Record<Persona, number>
  topQuestions: Array<{ question: string; count: number; persona: Persona }>
  satisfactionTrend: Array<{ date: string; score: number }>
  resolutionRate: number
  userRetention: number
  avgConversationLength: number
  totalTokenUsage: number
  totalCost: number
}

// Mock data with enhanced structure
const mockConversations: AdminConversation[] = [
  {
    id: "1",
    sessionId: "abc123def",
    persona: "elev",
    status: "active",
    messageCount: 8,
    lastActivity: new Date(Date.now() - 5 * 60 * 1000),
    userSatisfaction: 4.5,
    flagged: false,
    tags: ["înscriere", "programe", "anxietate"],
    summary: "Elev întreabă despre procesul de înscriere și gestionarea anxietății",
    tokenUsage: 1250,
    estimatedCost: 0.0025,
  },
  {
    id: "2",
    sessionId: "xyz789ghi",
    persona: "părinte",
    status: "needs_attention",
    messageCount: 12,
    lastActivity: new Date(Date.now() - 15 * 60 * 1000),
    userSatisfaction: 2.5,
    flagged: true,
    tags: ["plângere", "taxe", "comunicare"],
    summary: "Părinte exprimă îngrijorări despre taxele programului și comunicarea cu școala",
    tokenUsage: 2100,
    estimatedCost: 0.0042,
  },
  {
    id: "3",
    sessionId: "mno456pqr",
    persona: "profesor",
    status: "completed",
    messageCount: 6,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    userSatisfaction: 5.0,
    flagged: false,
    tags: ["parteneriat", "curriculum", "dezvoltare"],
    summary: "Profesor întreabă despre oportunități de parteneriat și dezvoltare profesională",
    tokenUsage: 890,
    estimatedCost: 0.0018,
  },
]

const mockChunkCitations: ChunkCitation[] = [
  {
    id: "1",
    chunkId: "chunk_anxiety_management_001",
    snippet: "Tehnicile de respirație profundă pot ajuta la gestionarea anxietății în timpul examenelor...",
    documentOrigin: "Ghidul Gestionării Anxietății pentru Elevi",
    citationCount: 45,
    avgRating: 4.2,
    personaBreakdown: { elev: 35, părinte: 8, profesor: 2 },
    lastCited: new Date(Date.now() - 2 * 60 * 60 * 1000),
    flaggedCount: 2,
  },
  {
    id: "2",
    chunkId: "chunk_parent_communication_002",
    snippet: "Comunicarea eficientă cu profesorii necesită o abordare structurată și respectuoasă...",
    documentOrigin: "Manual de Comunicare Părinte-Școală",
    citationCount: 38,
    avgRating: 3.8,
    personaBreakdown: { elev: 5, părinte: 30, profesor: 3 },
    lastCited: new Date(Date.now() - 1 * 60 * 60 * 1000),
    flaggedCount: 5,
  },
  {
    id: "3",
    chunkId: "chunk_classroom_management_003",
    snippet: "Strategiile de management al clasei includ stabilirea de reguli clare și consecvente...",
    documentOrigin: "Ghidul Profesorului pentru Management Eficient",
    citationCount: 29,
    avgRating: 4.6,
    personaBreakdown: { elev: 2, părinte: 5, profesor: 22 },
    lastCited: new Date(Date.now() - 30 * 60 * 1000),
    flaggedCount: 1,
  },
]

const mockTemplates: ResponseTemplate[] = [
  {
    id: "1",
    title: "Procesul de Înscriere",
    content:
      "Pentru a te înscrie în programele noastre, te rugăm să urmezi acești pași: 1) Completează aplicația online...",
    persona: ["elev", "părinte"],
    category: "înscriere",
    usage: 45,
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    active: true,
  },
  {
    id: "2",
    title: "Gestionarea Anxietății",
    content: "Anxietatea este o reacție normală, dar poate fi gestionată prin tehnici de respirație și relaxare...",
    persona: ["elev"],
    category: "wellbeing",
    usage: 67,
    lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    active: true,
  },
  {
    id: "3",
    title: "Solicitare Parteneriat",
    content: "Mulțumim pentru interesul tău în parteneriatul cu noi. Oferim mai multe oportunități de colaborare...",
    persona: ["profesor"],
    category: "parteneriate",
    usage: 23,
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    active: true,
  },
]

const mockAnalytics: AnalyticsData = {
  totalConversations: 1247,
  activeConversations: 23,
  avgSatisfaction: 4.2,
  avgResponseTime: 1.8,
  personaDistribution: {
    elev: 45,
    părinte: 35,
    profesor: 20,
  },
  topQuestions: [
    { question: "Cum mă înscriu în program?", count: 89, persona: "elev" },
    { question: "Care sunt taxele programului?", count: 67, persona: "părinte" },
    { question: "Cum pot colabora cu școala?", count: 54, persona: "părinte" },
  ],
  satisfactionTrend: [
    { date: "Lun", score: 4.1 },
    { date: "Mar", score: 4.3 },
    { date: "Mie", score: 4.0 },
    { date: "Joi", score: 4.4 },
    { date: "Vin", score: 4.2 },
  ],
  resolutionRate: 87,
  userRetention: 73,
  avgConversationLength: 4.2,
  totalTokenUsage: 125000,
  totalCost: 250.0,
}

const personaConfig = {
  elev: {
    name: "Elev",
    quickReplies: [
      "Temă grea? Cum te motivezi?",
      "Școala: Ce vrei să schimbi?",
      "Stresat? Unde cauți ajutor?",
      "Nu înțelegi? Cere ajutor cui?",
    ],
  },
  părinte: {
    name: "Părinte",
    quickReplies: [
      "Copilul: Ce vă îngrijorează cel mai mult?",
      "Școală și familie: Cum colaborăm mai bine?",
      "Sprijin acasă: Ce informații vreți?",
      "Școala: Mai prietenoasă, cum?",
    ],
  },
  profesor: {
    name: "Profesor",
    quickReplies: [
      "Emoții, relații: Cum le dezvoltați?",
      "Elev nemotivat? Ce strategii folosiți?",
      "Predare: Adaptați nevoilor diverse cum?",
      "Profesori: Ce sprijin doriți?",
    ],
  },
}

export default function AdminDashboard() {
  const [conversations, setConversations] = useState<AdminConversation[]>(mockConversations)
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [templates, setTemplates] = useState<ResponseTemplate[]>(mockTemplates)
  const [chunkCitations, setChunkCitations] = useState<ChunkCitation[]>(mockChunkCitations)
  const [analytics] = useState<AnalyticsData>(mockAnalytics)
  const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all")
  const [personaFilter, setPersonaFilter] = useState<Persona | "all">("all")
  const [dateRange, setDateRange] = useState("7d")

  const getStatusColor = (status: ConversationStatus) => {
    switch (status) {
      case "active":
        return "bg-[#D0337D]/10 text-[#D0337D] border-[#D0337D]/20"
      case "completed":
        return "bg-[#9a6ae1]/10 text-[#9a6ae1] border-[#9a6ae1]/20"
      case "needs_attention":
        return "bg-[#ff4773]/10 text-[#ff4773] border-[#ff4773]/20"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPersonaColor = (persona: Persona) => {
    switch (persona) {
      case "elev":
        return "bg-[#D0337D]/10 text-[#D0337D] border-[#D0337D]/20"
      case "părinte":
        return "bg-[#ff4773]/10 text-[#ff4773] border-[#ff4773]/20"
      case "profesor":
        return "bg-[#9a6ae1]/10 text-[#9a6ae1] border-[#9a6ae1]/20"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter
    const matchesPersona = personaFilter === "all" || conv.persona === personaFilter
    return matchesSearch && matchesStatus && matchesPersona
  })

  return (
    <AdminAuthDialog>
      {" "}
      {/* Wrap the entire dashboard with the auth dialog */}
      <div className="min-h-screen bg-[#FEEFF7]">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-white">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <img src="/narada-logo.svg" alt="Narada Logo" className="h-8 w-auto" />
                <div className="h-8 w-px bg-[#D0337D]/20"></div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#07050a]">Panou de Administrare</h1>
              </div>
              <div className="flex items-center gap-2">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-32 border-[#D0337D]/20 text-[#07050a] rounded-medium">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">Ultima zi</SelectItem>
                    <SelectItem value="7d">Ultima săptămână</SelectItem>
                    <SelectItem value="30d">Ultima lună</SelectItem>
                    <SelectItem value="90d">Ultimele 3 luni</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-transparent rounded-medium"
                  onClick={() => (window.location.href = "/")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Înapoi la Chat
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:grid-cols-6 bg-white border-[#D0337D]/20 rounded-medium">
              <TabsTrigger
                value="dashboard"
                className="flex items-center gap-2 data-[state=active]:bg-[#D0337D] data-[state=active]:text-white text-[#07050a]"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Tablou de Bord</span>
              </TabsTrigger>
              <TabsTrigger
                value="conversations"
                className="flex items-center gap-2 data-[state=active]:bg-[#D0337D] data-[state=active]:text-white text-[#07050a]"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Conversații</span>
              </TabsTrigger>
              <TabsTrigger
                value="responses"
                className="flex items-center gap-2 data-[state=active]:bg-[#D0337D] data-[state=active]:text-white text-[#07050a]"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Răspunsuri</span>
              </TabsTrigger>
              <TabsTrigger
                value="chunks"
                className="flex items-center gap-2 data-[state=active]:bg-[#D0337D] data-[state=active]:text-white text-[#07050a]"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Citări Conținut</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center gap-2 data-[state=active]:bg-[#D0337D] data-[state=active]:text-white text-[#07050a]"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Setări</span>
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Overview */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-[#D0337D]/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[#07050a]">Total Conversații</CardTitle>
                    <MessageSquare className="h-4 w-4 text-[#D0337D]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#07050a]">
                      {analytics.totalConversations.toLocaleString()}
                    </div>
                    <p className="text-xs text-[#07050a]/60">+12% față de perioada anterioară</p>
                  </CardContent>
                </Card>

                <Card className="border-[#D0337D]/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[#07050a]">Sesiuni Active</CardTitle>
                    <Activity className="h-4 w-4 text-[#ff4773]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#07050a]">{analytics.activeConversations}</div>
                    <p className="text-xs text-[#07050a]/60">Conversații în desfășurare</p>
                  </CardContent>
                </Card>

                <Card className="border-[#D0337D]/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[#07050a]">Satisfacție Medie</CardTitle>
                    <Star className="h-4 w-4 text-[#9a6ae1]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#07050a]">{analytics.avgSatisfaction}/5</div>
                    <p className="text-xs text-[#07050a]/60">+0.3 față de perioada anterioară</p>
                  </CardContent>
                </Card>

                <Card className="border-[#D0337D]/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[#07050a]">Timp de Răspuns</CardTitle>
                    <Clock className="h-4 w-4 text-[#D0337D]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#07050a]">{analytics.avgResponseTime}s</div>
                    <p className="text-xs text-[#07050a]/60">Timp mediu de răspuns</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-[#D0337D]/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[#07050a]">Token-uri Totale</CardTitle>
                    <Zap className="h-4 w-4 text-[#D0337D]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#07050a]">
                      {analytics.totalTokenUsage.toLocaleString()}
                    </div>
                    <p className="text-xs text-[#07050a]/60">Utilizare cumulată</p>
                  </CardContent>
                </Card>

                <Card className="border-[#D0337D]/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[#07050a]">Cost Total</CardTitle>
                    <Target className="h-4 w-4 text-[#ff4773]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#07050a]">${analytics.totalCost.toFixed(2)}</div>
                    <p className="text-xs text-[#07050a]/60">Cost cumulat AI</p>
                  </CardContent>
                </Card>

                <Card className="border-[#D0337D]/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[#07050a]">Lungime Medie</CardTitle>
                    <MessageSquare className="h-4 w-4 text-[#9a6ae1]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#07050a]">{analytics.avgConversationLength}</div>
                    <p className="text-xs text-[#07050a]/60">Mesaje per conversație</p>
                  </CardContent>
                </Card>

                <Card className="border-[#D0337D]/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[#07050a]">Retenție</CardTitle>
                    <Users className="h-4 w-4 text-[#D0337D]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#07050a]">{analytics.userRetention}%</div>
                    <p className="text-xs text-[#07050a]/60">Utilizatori care revin</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-[#D0337D]/20">
                  <CardHeader>
                    <CardTitle className="text-[#07050a]">Distribuția Persoanelor</CardTitle>
                    <CardDescription className="text-[#07050a]/70">
                      Defalcarea conversațiilor pe tipuri de utilizatori
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.personaDistribution).map(([persona, percentage]) => (
                        <div key={persona} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getPersonaColor(persona as Persona)}>
                              {persona.charAt(0).toUpperCase() + persona.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-[#D0337D] h-2 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-sm font-medium text-[#07050a]">{percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#D0337D]/20">
                  <CardHeader>
                    <CardTitle className="text-[#07050a]">Întrebări Frecvente</CardTitle>
                    <CardDescription className="text-[#07050a]/70">
                      Top 3 întrebări recurente pe persona
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.topQuestions.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getPersonaColor(item.persona)} variant="outline">
                              {item.persona}
                            </Badge>
                            <span className="text-sm text-[#07050a]">{item.question}</span>
                          </div>
                          <Badge variant="secondary" className="bg-[#D0337D]/10 text-[#D0337D]">
                            {item.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Conversations Log */}
            <TabsContent value="conversations" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#07050a]/40 w-4 h-4" />
                    <Input
                      placeholder="Caută conversații, tag-uri..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-64 border-[#D0337D]/20 focus:border-[#D0337D] text-[#07050a]"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as ConversationStatus | "all")}
                  >
                    <SelectTrigger className="w-full sm:w-40 border-[#D0337D]/20 text-[#07050a] rounded-medium">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate Statusurile</SelectItem>
                      <SelectItem value="active">Activ</SelectItem>
                      <SelectItem value="completed">Finalizat</SelectItem>
                      <SelectItem value="needs_attention">Necesită Atenție</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={personaFilter} onValueChange={(value) => setPersonaFilter(value as Persona | "all")}>
                    <SelectTrigger className="w-full sm:w-40 border-[#D0337D]/20 text-[#07050a] rounded-medium">
                      <SelectValue placeholder="Persona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate Personajele</SelectItem>
                      <SelectItem value="elev">Elev</SelectItem>
                      <SelectItem value="părinte">Părinte</SelectItem>
                      <SelectItem value="profesor">Profesor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-[#D0337D] hover:bg-[#B02A6B] text-white rounded-full">
                  <Download className="w-4 h-4 mr-2" />
                  Exportă
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-[#D0337D]/20">
                  <CardHeader>
                    <CardTitle className="text-[#07050a]">Conversații ({filteredConversations.length})</CardTitle>
                    <CardDescription className="text-[#07050a]/70">
                      Fă clic pe o conversație pentru a vedea detaliile
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-96 overflow-y-auto">
                      {filteredConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`p-4 border-b border-[#D0337D]/10 cursor-pointer hover:bg-[#D0337D]/5 ${
                            selectedConversation?.id === conversation.id ? "bg-[#D0337D]/10" : ""
                          }`}
                          onClick={() => setSelectedConversation(conversation)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getStatusColor(conversation.status)}>
                                {conversation.status.replace("_", " ")}
                              </Badge>
                              <Badge className={getPersonaColor(conversation.persona)}>{conversation.persona}</Badge>
                              {conversation.flagged && <Flag className="w-4 h-4 text-[#ff4773]" />}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#07050a]/70 hover:text-[#07050a] rounded-full"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Vezi Detalii
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Intervine
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="w-4 h-4 mr-2" />
                                  Exportă
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-sm text-[#07050a]/80 mb-2">{conversation.summary}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {conversation.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs border-[#D0337D]/30">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-[#07050a]/60">
                            <span>ID: {conversation.sessionId}</span>
                            <span>{conversation.messageCount} mesaje</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[#07050a]/60 mt-1">
                            <span>{conversation.lastActivity.toLocaleTimeString()}</span>
                            <div className="flex items-center gap-2">
                              {conversation.userSatisfaction && <span>⭐ {conversation.userSatisfaction}/5</span>}
                              <span>${conversation.estimatedCost.toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#D0337D]/20">
                  <CardHeader>
                    <CardTitle className="text-[#07050a]">Detalii Conversație</CardTitle>
                    <CardDescription className="text-[#07050a]/70">
                      {selectedConversation
                        ? `Sesiune: ${selectedConversation.sessionId}`
                        : "Selectează o conversație pentru a vedea detaliile"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedConversation ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-[#07050a]">Status:</span>
                            <Badge className={`ml-2 ${getStatusColor(selectedConversation.status)}`}>
                              {selectedConversation.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div>
                            <span className="font-medium text-[#07050a]">Persona:</span>
                            <Badge className={`ml-2 ${getPersonaColor(selectedConversation.persona)}`}>
                              {selectedConversation.persona}
                            </Badge>
                          </div>
                          <div>
                            <span className="font-medium text-[#07050a]">Mesaje:</span>
                            <span className="ml-2 text-[#07050a]">{selectedConversation.messageCount}</span>
                          </div>
                          <div>
                            <span className="font-medium text-[#07050a]">Token-uri:</span>
                            <span className="ml-2 text-[#07050a]">{selectedConversation.tokenUsage}</span>
                          </div>
                          <div>
                            <span className="font-medium text-[#07050a]">Satisfacție:</span>
                            <span className="ml-2 text-[#07050a]">
                              {selectedConversation.userSatisfaction
                                ? `⭐ ${selectedConversation.userSatisfaction}/5`
                                : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-[#07050a]">Cost:</span>
                            <span className="ml-2 text-[#07050a]">
                              ${selectedConversation.estimatedCost.toFixed(4)}
                            </span>
                          </div>
                        </div>

                        <Separator className="bg-[#D0337D]/20" />

                        <div>
                          <h4 className="font-medium mb-2 text-[#07050a]">Tag-uri</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedConversation.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="border-[#D0337D]/30 text-[#07050a]">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 text-[#07050a]">Rezumat</h4>
                          <p className="text-sm text-[#07050a]/80">{selectedConversation.summary}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-transparent rounded-medium"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Vezi Chat Complet
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-transparent rounded-medium"
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Intervine
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-[#07050a]/60 py-8">
                        Selectează o conversație din listă pentru a vedea detaliile
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Response Management */}
            <TabsContent value="responses" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h2 className="text-xl font-semibold text-[#07050a]">Șabloane de Răspuns</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-[#D0337D] hover:bg-[#B02A6B] text-white rounded-full">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Șablon Nou
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl border-[#D0337D]/20">
                    <DialogHeader>
                      <DialogTitle className="text-[#07050a]">Creează Șablon de Răspuns</DialogTitle>
                      <DialogDescription className="text-[#07050a]/70">
                        Creează un șablon nou care poate fi folosit pentru diferite personaje
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-[#07050a]">
                          Titlul Șablonului
                        </Label>
                        <Input
                          id="title"
                          placeholder="Introdu titlul șablonului..."
                          className="border-[#D0337D]/20 text-[#07050a]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category" className="text-[#07050a]">
                          Categoria
                        </Label>
                        <Select>
                          <SelectTrigger className="border-[#D0337D]/20 text-[#07050a]">
                            <SelectValue placeholder="Selectează categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enrollment">Înscriere</SelectItem>
                            <SelectItem value="wellbeing">Wellbeing</SelectItem>
                            <SelectItem value="programs">Programe</SelectItem>
                            <SelectItem value="fees">Taxe</SelectItem>
                            <SelectItem value="partnerships">Parteneriate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="personas" className="text-[#07050a]">
                          Personaje Aplicabile
                        </Label>
                        <div className="flex gap-2 mt-2">
                          <Badge className="cursor-pointer bg-[#D0337D]/10 text-[#D0337D] border-[#D0337D]/20">
                            Elev
                          </Badge>
                          <Badge className="cursor-pointer bg-[#ff4773]/10 text-[#ff4773] border-[#ff4773]/20">
                            Părinte
                          </Badge>
                          <Badge className="cursor-pointer bg-[#9a6ae1]/10 text-[#9a6ae1] border-[#9a6ae1]/20">
                            Profesor
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="content" className="text-[#07050a]">
                          Conținutul Șablonului
                        </Label>
                        <Textarea
                          id="content"
                          placeholder="Introdu conținutul șablonului de răspuns..."
                          className="min-h-32 border-[#D0337D]/20 text-[#07050a]"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-transparent rounded-medium"
                        >
                          Anulează
                        </Button>
                        <Button className="bg-[#D0337D] hover:bg-[#B02A6B] text-white rounded-full">
                          Creează Șablonul
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="border-[#D0337D]/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-[#07050a]">{template.title}</CardTitle>
                          <CardDescription className="text-[#07050a]/70">
                            Categoria: {template.category}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={template.active} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#07050a]/70 hover:text-[#07050a] rounded-full"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Editează
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                Exportă
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-[#07050a]/80 mb-4 line-clamp-3">{template.content}</p>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {template.persona.map((persona) => (
                            <Badge key={persona} className={getPersonaColor(persona)}>
                              {persona}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#07050a]/60">
                          <span>Folosit de {template.usage} ori</span>
                          <span>Actualizat {template.lastUpdated.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* NEW: Chunk Citation Leaderboard */}
            <TabsContent value="chunks" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#07050a]">Clasamentul Citărilor de Conținut</h2>
                  <p className="text-sm text-[#07050a]/70">
                    Identifică care fragmente de conținut sunt cele mai impactante sau problematice
                  </p>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40 border-[#D0337D]/20 text-[#07050a] rounded-medium">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate Personajele</SelectItem>
                      <SelectItem value="elev">Elev</SelectItem>
                      <SelectItem value="părinte">Părinte</SelectItem>
                      <SelectItem value="profesor">Profesor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-transparent rounded-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportă
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {chunkCitations.map((chunk, index) => (
                  <Card key={chunk.id} className="border-[#D0337D]/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              #{index + 1}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              ID: {chunk.chunkId}
                            </Badge>
                            {chunk.flaggedCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                <Flag className="w-3 h-3 mr-1" />
                                {chunk.flaggedCount} marcări
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-base text-[#07050a] mb-1">{chunk.documentOrigin}</CardTitle>
                          <CardDescription className="text-sm text-[#07050a]/80 line-clamp-2">
                            {chunk.snippet}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#07050a]/70 hover:text-[#07050a] rounded-full"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Vezi Fragment Complet
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Marchează pentru Revizuire
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Tag className="w-4 h-4 mr-2" />
                              Adaugă Tag
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#D0337D]">{chunk.citationCount}</div>
                          <div className="text-xs text-[#07050a]/70">Citări Totale</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#9a6ae1]">{chunk.avgRating.toFixed(1)}</div>
                          <div className="text-xs text-[#07050a]/70">Rating Mediu</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#ff4773]">
                            {Object.values(chunk.personaBreakdown).reduce((a, b) => a + b, 0)}
                          </div>
                          <div className="text-xs text-[#07050a]/70">Utilizări Unice</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#07050a]">
                            {Math.round((Date.now() - chunk.lastCited.getTime()) / (1000 * 60 * 60))}h
                          </div>
                          <div className="text-xs text-[#07050a]/70">Ultima Citare</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-[#07050a] mb-2">Distribuția pe Persona</h4>
                          <div className="space-y-2">
                            {Object.entries(chunk.personaBreakdown).map(([persona, count]) => (
                              <div key={persona} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={getPersonaColor(persona as Persona)} variant="outline">
                                    {persona}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={(count / chunk.citationCount) * 100} className="w-20 h-2" />
                                  <span className="text-sm font-medium text-[#07050a] w-8">{count}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-[#D0337D]/20">
                  <CardHeader>
                    <CardTitle className="text-[#07050a]">Configurare AI</CardTitle>
                    <CardDescription className="text-[#07050a]/70">
                      Configurează comportamentul și răspunsurile AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-responses" className="text-[#07050a]">
                          Răspunsuri Automate pentru FAQ
                        </Label>
                        <p className="text-sm text-[#07050a]/70">
                          Activează răspunsurile automate pentru întrebările frecvente
                        </p>
                      </div>
                      <Switch id="auto-responses" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="confidence-threshold" className="text-[#07050a]">
                          Prag Minim de Încredere
                        </Label>
                        <p className="text-sm text-[#07050a]/70">Încrederea minimă pentru răspunsurile automate</p>
                      </div>
                      <Select defaultValue="85">
                        <SelectTrigger className="w-20 border-[#D0337D]/20 text-[#07050a]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="70">70%</SelectItem>
                          <SelectItem value="80">80%</SelectItem>
                          <SelectItem value="85">85%</SelectItem>
                          <SelectItem value="90">90%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="escalation" className="text-[#07050a]">
                          Escaladare Automată
                        </Label>
                        <p className="text-sm text-[#07050a]/70">Escaladează conversațiile cu satisfacție scăzută</p>
                      </div>
                      <Switch id="escalation" defaultChecked />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#D0337D]/20">
                  <CardHeader>
                    <CardTitle className="text-[#07050a]">Setări Notificări</CardTitle>
                    <CardDescription className="text-[#07050a]/70">
                      Configurează notificările pentru administratori
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="flagged-conversations" className="text-[#07050a]">
                          Conversații Marcate
                        </Label>
                        <p className="text-sm text-[#07050a]/70">Notifică când conversațiile sunt marcate</p>
                      </div>
                      <Switch id="flagged-conversations" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="low-satisfaction" className="text-[#07050a]">
                          Satisfacție Scăzută
                        </Label>
                        <p className="text-sm text-[#07050a]/70">Notifică când satisfacția scade sub prag</p>
                      </div>
                      <Switch id="low-satisfaction" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="daily-reports" className="text-[#07050a]">
                          Rapoarte Zilnice
                        </Label>
                        <p className="text-sm text-[#07050a]/70">Primește rapoarte zilnice de analiză</p>
                      </div>
                      <Switch id="daily-reports" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-[#D0337D]/20">
                <CardHeader>
                  <CardTitle className="text-[#07050a]">Gestionarea Personajelor</CardTitle>
                  <CardDescription className="text-[#07050a]/70">
                    Configurează setările specifice personajelor și răspunsurile bazate pe fragmente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(personaConfig).map(([key, persona]) => (
                      <div key={key} className="p-4 border border-[#D0337D]/20 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge className={getPersonaColor(key as Persona)}>{persona.name}</Badge>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <Label className="text-[#07050a]">Răspunsuri Rapide</Label>
                            <p className="text-[#07050a]/70">{persona.quickReplies.length} configurate</p>
                          </div>
                          <div>
                            <Label className="text-[#07050a]">Șabloane de Răspuns</Label>
                            <p className="text-[#07050a]/70">
                              {templates.filter((t) => t.persona.includes(key as Persona)).length} disponibile
                            </p>
                          </div>
                          <div>
                            <Label className="text-[#07050a]">Răspunsuri Bazate pe Fragmente</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Switch defaultChecked size="sm" />
                              <span className="text-[#07050a]/70 text-xs">Activat</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-transparent rounded-medium"
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Editează Răspunsuri Rapide
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminAuthDialog>
  )
}
