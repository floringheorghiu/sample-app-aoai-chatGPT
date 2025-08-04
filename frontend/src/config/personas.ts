import { GraduationCap, Heart, BookOpen, UserX } from "lucide-react"
import { PersonaConfig, InterestArea } from "../types/persona"

// Interest areas for different personas
export const studentInterests: InterestArea[] = [
  { label: "Matematică", value: "matematica" },
  { label: "Științe", value: "stiinte" },
  { label: "Istorie", value: "istorie" },
  { label: "Literatură", value: "literatura" },
  { label: "Limbi străine", value: "limbi-straine" },
  { label: "Arte", value: "arte" },
  { label: "Sport", value: "sport" },
  { label: "Tehnologie", value: "tehnologie" }
]

export const parentInterests: InterestArea[] = [
  { label: "Dezvoltarea copilului", value: "dezvoltarea-copilului" },
  { label: "Educație parentală", value: "educatie-parentala" },
  { label: "Sănătate și nutriție", value: "sanatate-nutritie" },
  { label: "Activități educative", value: "activitati-educative" },
  { label: "Probleme comportamentale", value: "probleme-comportamentale" },
  { label: "Comunicare cu copiii", value: "comunicare-copii" },
  { label: "Pregătire pentru școală", value: "pregatire-scoala" },
  { label: "Tehnologie și copii", value: "tehnologie-copii" }
]

export const teacherInterests: InterestArea[] = [
  { label: "Metode de predare", value: "metode-predare" },
  { label: "Managementul clasei", value: "management-clasa" },
  { label: "Evaluare și feedback", value: "evaluare-feedback" },
  { label: "Tehnologie educațională", value: "tehnologie-educationala" },
  { label: "Dezvoltare profesională", value: "dezvoltare-profesionala" },
  { label: "Educație incluzivă", value: "educatie-incluziva" },
  { label: "Motivarea elevilor", value: "motivarea-elevilor" },
  { label: "Colaborarea cu părinții", value: "colaborarea-parinti" }
]

// Persona configurations with themes from FEv2
export const personaConfigs: Record<string, PersonaConfig> = {
  elev: {
    name: "Elev",
    icon: GraduationCap,
    description: "Pentru elevi care vor să învețe și să exploreze",
    theme: {
      bg: "bg-[#FEEFF7]",
      text: "text-[#07050a]",
      primary: "bg-[#D0337D] hover:bg-[#B02A6B]",
      secondary: "bg-[#F8D7E7]",
      userBubble: "bg-[#D0337D]",
      accent: "border-[#D0337D]"
    },
    interests: studentInterests
  },
  părinte: {
    name: "Părinte",
    icon: Heart,
    description: "Pentru părinți care vor să-și sprijine copiii",
    theme: {
      bg: "bg-[#FFF0F3]",
      text: "text-[#07050a]",
      primary: "bg-[#ff4773] hover:bg-[#E63E66]",
      secondary: "bg-[#FFD6E1]",
      userBubble: "bg-[#ff4773]",
      accent: "border-[#ff4773]"
    },
    interests: parentInterests
  },
  profesor: {
    name: "Profesor",
    icon: BookOpen,
    description: "Pentru profesori și educatori",
    theme: {
      bg: "bg-[#F5F0FF]",
      text: "text-[#07050a]",
      primary: "bg-[#9a6ae1] hover:bg-[#8A5DD1]",
      secondary: "bg-[#E6D9FF]",
      userBubble: "bg-[#9a6ae1]",
      accent: "border-[#9a6ae1]"
    },
    interests: teacherInterests
  },
  incognito: {
    name: "Incognito",
    icon: UserX,
    description: "Pentru utilizare anonimă",
    theme: {
      bg: "bg-gray-50",
      text: "text-gray-900",
      primary: "bg-gray-600 hover:bg-gray-700",
      secondary: "bg-gray-200",
      userBubble: "bg-gray-600",
      accent: "border-gray-600"
    }
  }
}

// Helper function to get persona config
export const getPersonaConfig = (persona: string): PersonaConfig | null => {
  return personaConfigs[persona] || null
}

// Helper function to get all available personas
export const getAllPersonas = () => {
  return Object.keys(personaConfigs)
}