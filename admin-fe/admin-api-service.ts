// lib/admin-api-service.ts
import { toast } from "@/components/ui/use-toast"

export type PersonaKey = "elev" | "parinte" | "profesor"

export interface OnboardingTopic {
  label: string
  warmup_prompt: string
  quick_questions: string[]
}

export type OnboardingConfig = Record<PersonaKey, { topics: OnboardingTopic[] }>

export interface SystemPromptConfig {
  prompt: string
}

class AdminApiService {
  private baseUrl: string
  private isMockMode: boolean

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""
    this.isMockMode = !this.baseUrl // If no base URL, we are in mock mode
  }

  // Document Upload & Ingestion
  async uploadDocument(file: File, onProgress: (progress: number) => void): Promise<boolean> {
    if (this.isMockMode) {
      // Mock successful upload
      console.log(`Mock: Uploading ${file.name}`)
      onProgress(50)
      await new Promise((resolve) => setTimeout(resolve, 500))
      onProgress(100)
      toast({ title: "Încărcare reușită (Mock)", description: `Fișierul ${file.name} a fost încărcat.` })
      return true
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", `${this.baseUrl}/api/admin/upload-doc`, true)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          onProgress(percentComplete)
        }
      }

      return new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            toast({ title: "Încărcare reușită", description: `Fișierul ${file.name} a fost încărcat.` })
            resolve(true)
          } else {
            toast({
              title: "Eroare la încărcare",
              description: `Fișierul ${file.name} nu a putut fi încărcat: ${xhr.statusText}`,
              variant: "destructive",
            })
            reject(new Error(xhr.statusText))
          }
        }
        xhr.onerror = () => {
          toast({
            title: "Eroare de rețea",
            description: `Nu s-a putut conecta la server pentru ${file.name}.`,
            variant: "destructive",
          })
          reject(new Error("Network error"))
        }
        xhr.send(formData)
      })
    } catch (error) {
      console.error("Error uploading document:", error)
      return false
    }
  }

  async triggerIngestion(): Promise<boolean> {
    if (this.isMockMode) {
      console.log("Mock: Triggering ingestion")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({ title: "Ingestie declanșată (Mock)", description: "Pipeline-ul de ingestie a fost pornit." })
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/admin/ingest-docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      toast({ title: "Ingestie declanșată", description: "Pipeline-ul de ingestie a fost pornit." })
      return true
    } catch (error) {
      console.error("Error triggering ingestion:", error)
      toast({
        title: "Eroare la ingestie",
        description: "Nu s-a putut declanșa pipeline-ul de ingestie.",
        variant: "destructive",
      })
      return false
    }
  }

  // System Prompt Editor
  async getSystemPrompt(): Promise<SystemPromptConfig> {
    if (this.isMockMode) {
      console.log("Mock: Fetching system prompt")
      await new Promise((resolve) => setTimeout(resolve, 100))
      return {
        prompt:
          "Ești un asistent AI util și prietenos, specializat în educație și bunăstare pentru elevi, părinți și profesori. Răspunde în limba română, cu un ton cald și empatic, oferind informații precise și sigure. Evită să oferi sfaturi medicale sau de criză și direcționează utilizatorii către resurse profesionale atunci când este cazul. Nu oferi răspunsuri directe la teme sau soluții complete, ci ghidează utilizatorul să învețe singur.",
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/admin/config/system-prompt`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error fetching system prompt:", error)
      toast({
        title: "Eroare la încărcare",
        description: "Nu s-a putut încărca promptul de sistem.",
        variant: "destructive",
      })
      return { prompt: "Ești un asistent AI util." } // Default fallback
    }
  }

  async updateSystemPrompt(prompt: string): Promise<boolean> {
    if (this.isMockMode) {
      console.log("Mock: Saving system prompt", prompt)
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast({ title: "Succes (Mock)", description: "Promptul de sistem a fost salvat." })
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/admin/config/system-prompt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      toast({ title: "Succes", description: "Promptul de sistem a fost salvat." })
      return true
    } catch (error) {
      console.error("Error updating system prompt:", error)
      toast({
        title: "Eroare la salvare",
        description: "Nu s-a putut salva promptul de sistem.",
        variant: "destructive",
      })
      return false
    }
  }

  // Onboarding Config Editor
  async getOnboardingConfig(): Promise<OnboardingConfig> {
    if (this.isMockMode) {
      console.log("Mock: Fetching onboarding config")
      await new Promise((resolve) => setTimeout(resolve, 100))
      return {
        elev: {
          topics: [
            {
              label: "să învăț mai bine și să primesc sfaturi pentru teme și școală",
              warmup_prompt: "Am o temă grea. Cum pot să-mi ușurez munca?",
              quick_questions: [
                "Cum învăț mai eficient pentru un test important?",
                "Ce pot face când mă plictisesc la ore?",
                "Cum mă pot calma înainte de un test sau o prezentare?",
              ],
            },
            {
              label: "cum să îmi înțeleg emoțiile și să depășesc momentele grele",
              warmup_prompt: "Ce pot face când mă simt trist sau nervos?",
              quick_questions: [
                "Cum pot vorbi despre ce simt fără să-mi fie rușine?",
                "Cum mă pot calma înainte de un test sau o prezentare?",
                "Ce fac dacă cineva mă jignește online?",
              ],
            },
          ],
        },
        parinte: {
          topics: [
            {
              label: "să îmi ajut copilul la școală cu sfaturi pentru teme și obiceiuri bune acasă",
              warmup_prompt: "Cum pot face temele mai ușor de suportat pentru copilul meu?",
              quick_questions: [
                "Ce rutine zilnice pot ajuta la învățare?",
                "Ce fac dacă copilul meu nu vrea să învețe?",
                "Cum pot comunica eficient cu profesorii?",
              ],
            },
            {
              label: "cum să am grijă de mintea și sufletul copilului meu, să-i înțeleg și să-i susțin emoțiile",
              warmup_prompt: "Cum recunosc dacă copilul meu e stresat sau anxios?",
              quick_questions: [
                "Cum vorbesc cu copilul despre emoții fără să-l presez?",
                "Ce activități ajută la echilibrul emoțional al copiilor?",
                "Cum pot contribui ca părinte în viața școlii?",
              ],
            },
          ],
        },
        profesor: {
          topics: [
            {
              label: "să ajut elevii să învețe singuri prin strategii noi de succes școlar și dezvoltare",
              warmup_prompt: "Ce metode pot folosi pentru a stimula autonomia la elevi?",
              quick_questions: [
                "Cum îi ajut să-și seteze obiective de învățare?",
                "Ce funcționează când un elev spune 'nu pot'?",
                "Cum gestionez conflictele dintre elevi?",
              ],
            },
            {
              label: "cum să mă dezvolt ca profesor și să am mai multă încredere în abilitățile mele",
              warmup_prompt: "Cum pot primi feedback constructiv fără să mă simt criticat?",
              quick_questions: [
                "Cum îi ajut să-și seteze obiective de învățare?",
                "Ce funcționează când un elev spune 'nu pot'?",
                "Cum gestionez conflictele dintre elevi?",
                "Ce pot face pentru a-mi recăpăta motivația ca profesor?",
                "Ce resurse mă pot ajuta să devin mai bun în meseria mea?",
                "Cum pot implica mai activ părinții în educație?",
              ],
            },
          ],
        },
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/admin/config/onboarding`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error fetching onboarding config:", error)
      toast({
        title: "Eroare la încărcare",
        description: "Nu s-a putut încărca configurația de onboarding.",
        variant: "destructive",
      })
      // Fallback to a default structure if API fails
      return {
        elev: {
          topics: [
            {
              label: "Să învăț mai bine",
              warmup_prompt: "Cum pot să-mi ușurez munca la teme?",
              quick_questions: ["Cum învăț eficient?", "Ce fac când mă plictisesc?", "Sfaturi pentru teste?"],
            },
          ],
        },
        parinte: {
          topics: [
            {
              label: "Ajutor la școală",
              warmup_prompt: "Cum îmi ajut copilul la teme?",
              quick_questions: ["Rutine zilnice?", "Copilul nu vrea să învețe?", "Comunicare cu școala?"],
            },
          ],
        },
        profesor: {
          topics: [
            {
              label: "Strategii de învățare",
              warmup_prompt: "Cum stimulez autonomia elevilor?",
              quick_questions: ["Managementul clasei?", "Colaborare cu părinții?", "Dezvoltare profesională?"],
            },
          ],
        },
      }
    }
  }

  async updateOnboardingConfig(config: OnboardingConfig): Promise<boolean> {
    if (this.isMockMode) {
      console.log("Mock: Saving onboarding config", config)
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast({ title: "Succes (Mock)", description: "Configurația de onboarding a fost salvată." })
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/admin/config/onboarding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      toast({ title: "Succes", description: "Configurația de onboarding a fost salvată." })
      return true
    } catch (error) {
      console.error("Error updating onboarding config:", error)
      toast({
        title: "Eroare la salvare",
        description: "Nu s-a putut salva configurația de onboarding.",
        variant: "destructive",
      })
      return false
    }
  }
}

export const adminApiService = new AdminApiService()
