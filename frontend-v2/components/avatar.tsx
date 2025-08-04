type Persona = "elev" | "părinte" | "profesor" | "incognito"
type MessageType = "user" | "ai"

interface AvatarProps {
  persona: Persona
  type: MessageType
  className?: string
}

const avatarPaths = {
  elev: "/avatars/child_avatar.svg",
  părinte: "/avatars/parent_avatar.svg",
  profesor: "/avatars/teacher_avatar.svg",
  ai: "/avatars/chatbot_avatar.svg",
  incognito: "/avatars/incognito_avatar.svg", // New incognito avatar
}

export function Avatar({ persona, type, className = "" }: AvatarProps) {
  const avatarSrc = type === "ai" ? avatarPaths.ai : avatarPaths[persona]

  return (
    <div className={`flex-shrink-0 ${className}`}>
      <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden">
        <img
          src={avatarSrc || "/placeholder.svg"}
          alt={type === "ai" ? "AI Assistant" : `${persona} avatar`}
          className="w-6 h-6 object-contain"
          style={{ filter: "none" }}
        />
      </div>
    </div>
  )
}
