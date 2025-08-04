import { LucideIcon } from "lucide-react"

export type Persona = 'elev' | 'părinte' | 'profesor' | 'incognito'

export interface InterestArea {
  label: string
  value: string
}

export interface PersonaTheme {
  bg: string
  text: string
  primary: string
  secondary: string
  userBubble: string
  accent: string
}

export interface PersonaConfig {
  name: string
  icon: LucideIcon
  theme: PersonaTheme
  description: string
  interests?: InterestArea[]
}

export interface OnboardingData {
  persona: Persona | null
  interest: InterestArea | null
  selectedTopicLabel: string | null
}

export interface PersonaState {
  currentPersona: Persona | null
  selectedInterest: InterestArea | null
  onboardingCompleted: boolean
}