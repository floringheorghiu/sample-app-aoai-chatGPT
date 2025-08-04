"use client"
import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  MessageCircle,
  Edit3,
  Archive,
  MoreHorizontal,
  GraduationCap,
  Users,
  BookOpen,
  UserX,
  Check,
  X,
  History,
} from "lucide-react"
import type { Conversation } from "@/app/page" // Import the Conversation type

interface ConversationHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  onLoadConversation: (id: string) => void
  onEditConversationName: (id: string, newName: string) => void
  onArchiveConversation: (id: string) => void
}

const personaIcons = {
  elev: GraduationCap,
  părinte: Users,
  profesor: BookOpen,
  incognito: UserX,
}

const getPersonaColor = (persona: Conversation["persona"]) => {
  switch (persona) {
    case "elev":
      return "bg-[#D0337D]/10 text-[#D0337D] border-[#D0337D]/20"
    case "părinte":
      return "bg-[#ff4773]/10 text-[#ff4773] border-[#ff4773]/20"
    case "profesor":
      return "bg-[#9a6ae1]/10 text-[#9a6ae1] border-[#9a6ae1]/20"
    case "incognito":
      return "bg-gray-600/10 text-gray-600 border-gray-600/20"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function ConversationHistoryPanel({
  isOpen,
  onClose,
  conversations,
  onLoadConversation,
  onEditConversationName,
  onArchiveConversation,
}: ConversationHistoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedName, setEditedName] = useState("")

  const handleEditClick = (conversation: Conversation) => {
    setEditingId(conversation.id)
    setEditedName(conversation.name)
  }

  const handleSaveEdit = (id: string) => {
    onEditConversationName(id, editedName)
    setEditingId(null)
    setEditedName("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditedName("")
  }

  const sortedConversations = [...conversations].sort((a, b) => {
    const lastActivityA = a.messages[a.messages.length - 1]?.timestamp || new Date(0)
    const lastActivityB = b.messages[b.messages.length - 1]?.timestamp || new Date(0)
    return lastActivityB.getTime() - lastActivityA.getTime()
  })

  const activeConversations = sortedConversations.filter((conv) => !conv.archived)
  const archivedConversations = sortedConversations.filter((conv) => conv.archived)

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md border-[#D0337D]/20">
        <SheetHeader>
          <SheetTitle className="text-[#07050a] flex items-center gap-2">
            <History className="w-5 h-5 text-[#D0337D]" />
            Istoric Conversații
          </SheetTitle>
          <SheetDescription className="text-[#07050a]/70">
            Gestionează și reîncarcă conversațiile anterioare.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-6">
          {activeConversations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[#07050a] mb-3">Conversații Active</h3>
              <div className="space-y-3">
                {activeConversations.map((conv) => {
                  const PersonaIcon = personaIcons[conv.persona]
                  return (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-3 border border-[#D0337D]/10 rounded-lg bg-white shadow-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <PersonaIcon
                          className={`w-5 h-5 ${getPersonaColor(conv.persona).includes("text-[#D0337D]") ? "text-[#D0337D]" : getPersonaColor(conv.persona).includes("text-[#ff4773]") ? "text-[#ff4773]" : getPersonaColor(conv.persona).includes("text-[#9a6ae1]") ? "text-[#9a6ae1]" : "text-gray-600"}`}
                        />
                        {editingId === conv.id ? (
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="flex-1 border-[#D0337D]/20 text-[#07050a] rounded-medium"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") handleSaveEdit(conv.id)
                            }}
                          />
                        ) : (
                          <span className="font-medium text-[#07050a] truncate">{conv.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {editingId === conv.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#D0337D] hover:bg-[#D0337D]/10 rounded-full"
                              onClick={() => handleSaveEdit(conv.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#ff4773] hover:bg-[#ff4773]/10 rounded-full"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 rounded-medium bg-transparent"
                              onClick={() => onLoadConversation(conv.id)}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Încarcă
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#07050a]/70 hover:text-[#07050a] rounded-full"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(conv)}>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Editează Nume
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onArchiveConversation(conv.id)}>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Arhivează
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {archivedConversations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[#07050a] mb-3 mt-6">Conversații Arhivate</h3>
              <div className="space-y-3">
                {archivedConversations.map((conv) => {
                  const PersonaIcon = personaIcons[conv.persona]
                  return (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-3 border border-[#D0337D]/10 rounded-lg bg-white shadow-sm opacity-70"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <PersonaIcon
                          className={`w-5 h-5 ${getPersonaColor(conv.persona).includes("text-[#D0337D]") ? "text-[#D0337D]" : getPersonaColor(conv.persona).includes("text-[#ff4773]") ? "text-[#ff4773]" : getPersonaColor(conv.persona).includes("text-[#9a6ae1]") ? "text-[#9a6ae1]" : "text-gray-600"}`}
                        />
                        {editingId === conv.id ? (
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="flex-1 border-[#D0337D]/20 text-[#07050a] rounded-medium"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") handleSaveEdit(conv.id)
                            }}
                          />
                        ) : (
                          <span className="font-medium text-[#07050a] truncate">{conv.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {editingId === conv.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#D0337D] hover:bg-[#D0337D]/10 rounded-full"
                              onClick={() => handleSaveEdit(conv.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#ff4773] hover:bg-[#ff4773]/10 rounded-full"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 rounded-medium bg-transparent"
                              onClick={() => onLoadConversation(conv.id)}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Încarcă
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#07050a]/70 hover:text-[#07050a] rounded-full"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(conv)}>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Editează Nume
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onArchiveConversation(conv.id)}>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Dezarhivează
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeConversations.length === 0 && archivedConversations.length === 0 && (
            <div className="text-center text-[#07050a]/60 py-8">Nu există conversații salvate încă.</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
