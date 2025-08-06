// components/admin/onboarding-config-editor.tsx
"use client"
import { useState, useEffect } from "react"
import { Save, Loader2, PlusCircle, MinusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminApiService, type OnboardingConfig, type OnboardingTopic, type PersonaKey } from "@/lib/admin-api-service"
import { toast } from "@/components/ui/use-toast"

const personaOptions: { id: PersonaKey; label: string }[] = [
  { id: "elev", label: "Elev" },
  { id: "parinte", label: "Părinte" },
  { id: "profesor", label: "Profesor" },
]

export function OnboardingConfigEditor() {
  const [config, setConfig] = useState<OnboardingConfig | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey>("elev")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true)
      const fetchedConfig = await adminApiService.getOnboardingConfig()
      setConfig(fetchedConfig)
      setIsLoading(false)
    }
    fetchConfig()
  }, [])

  const handleTopicChange = (
    persona: PersonaKey,
    topicIndex: number,
    field: keyof OnboardingTopic,
    value: string | string[],
    questionIndex?: number,
  ) => {
    if (!config) return

    const updatedConfig = { ...config }
    const updatedTopics = [...updatedConfig[persona].topics]

    if (field === "quick_questions" && questionIndex !== undefined) {
      const updatedQuestions = [...updatedTopics[topicIndex].quick_questions]
      updatedQuestions[questionIndex] = value as string
      updatedTopics[topicIndex] = {
        ...updatedTopics[topicIndex],
        quick_questions: updatedQuestions,
      }
    } else {
      updatedTopics[topicIndex] = {
        ...updatedTopics[topicIndex],
        [field]: value,
      }
    }

    setConfig({
      ...config,
      [persona]: {
        ...config[persona],
        topics: updatedTopics,
      },
    })
  }

  const addTopic = (persona: PersonaKey) => {
    if (!config) return
    const newTopic: OnboardingTopic = {
      label: "",
      warmup_prompt: "",
      quick_questions: ["", "", ""],
    }
    setConfig({
      ...config,
      [persona]: {
        ...config[persona],
        topics: [...config[persona].topics, newTopic],
      },
    })
  }

  const removeTopic = (persona: PersonaKey, topicIndex: number) => {
    if (!config) return
    const updatedTopics = config[persona].topics.filter((_, i) => i !== topicIndex)
    setConfig({
      ...config,
      [persona]: {
        ...config[persona],
        topics: updatedTopics,
      },
    })
  }

  const validateConfig = (): boolean => {
    if (!config) return false

    for (const personaKey of Object.keys(config) as PersonaKey[]) {
      const personaData = config[personaKey]
      for (const topic of personaData.topics) {
        if (!topic.label.trim()) {
          toast({
            title: "Eroare de validare",
            description: `Eticheta subiectului nu poate fi goală pentru persona "${personaKey}".`,
            variant: "destructive",
          })
          return false
        }
        if (!topic.warmup_prompt.trim()) {
          toast({
            title: "Eroare de validare",
            description: `Promptul de încălzire nu poate fi gol pentru subiectul "${topic.label}" (${personaKey}).`,
            variant: "destructive",
          })
          return false
        }
        if (topic.quick_questions.length !== 3 || topic.quick_questions.some((q) => !q.trim())) {
          toast({
            title: "Eroare de validare",
            description: `Fiecare subiect trebuie să aibă exact 3 întrebări rapide completate pentru "${topic.label}" (${personaKey}).`,
            variant: "destructive",
          })
          return false
        }
      }
    }
    return true
  }

  const handleSave = async () => {
    if (!validateConfig()) {
      return
    }
    setIsSaving(true)
    if (config) {
      await adminApiService.updateOnboardingConfig(config)
    }
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <Card className="border-[#D0337D]/20">
        <CardHeader>
          <CardTitle className="text-[#07050a]">Editor Configurație Onboarding</CardTitle>
          <CardDescription className="text-[#07050a]/70">
            Configurează întrebările de onboarding pentru fiecare persona.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D0337D]" />
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card className="border-[#D0337D]/20">
        <CardHeader>
          <CardTitle className="text-[#07050a]">Editor Configurație Onboarding</CardTitle>
          <CardDescription className="text-[#07050a]/70">
            Configurează întrebările de onboarding pentru fiecare persona.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-red-500">Nu s-a putut încărca configurația de onboarding.</CardContent>
      </Card>
    )
  }

  const currentPersonaTopics = config[selectedPersona]?.topics || []

  return (
    <Card className="border-[#D0337D]/20">
      <CardHeader>
        <CardTitle className="text-[#07050a]">Editor Configurație Onboarding</CardTitle>
        <CardDescription className="text-[#07050a]/70">
          Configurează întrebările de onboarding pentru fiecare persona.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="persona-select" className="text-[#07050a]">
            Selectează Persona
          </Label>
          <Select value={selectedPersona} onValueChange={(value) => setSelectedPersona(value as PersonaKey)}>
            <SelectTrigger className="w-full border-[#D0337D]/20 text-[#07050a] mt-2">
              <SelectValue placeholder="Selectează o persona" />
            </SelectTrigger>
            <SelectContent>
              {personaOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <h3 className="text-md font-semibold text-[#07050a]">
            Subiecte pentru {personaOptions.find((p) => p.id === selectedPersona)?.label}
          </h3>
          {currentPersonaTopics.length === 0 && (
            <p className="text-sm text-[#07050a]/60">Nu există subiecte configurate pentru această persona.</p>
          )}
          {currentPersonaTopics.map((topic, topicIndex) => (
            <Card key={topicIndex} className="p-4 border-[#D0337D]/20 bg-[#D0337D]/5">
              <CardContent className="p-0 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-[#07050a]">Subiect #{topicIndex + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTopic(selectedPersona, topicIndex)}
                    className="text-red-500 hover:bg-red-100 rounded-full"
                  >
                    <MinusCircle className="w-4 h-4 mr-1" />
                    Elimină
                  </Button>
                </div>
                <div>
                  <Label htmlFor={`topic-label-${topicIndex}`} className="text-[#07050a]">
                    Etichetă Subiect
                  </Label>
                  <Input
                    id={`topic-label-${topicIndex}`}
                    value={topic.label}
                    onChange={(e) => handleTopicChange(selectedPersona, topicIndex, "label", e.target.value)}
                    className="border-[#D0337D]/20 text-[#07050a] mt-1"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor={`warmup-prompt-${topicIndex}`} className="text-[#07050a]">
                    Prompt de Încălzire
                  </Label>
                  <Input
                    id={`warmup-prompt-${topicIndex}`}
                    value={topic.warmup_prompt}
                    onChange={(e) => handleTopicChange(selectedPersona, topicIndex, "warmup_prompt", e.target.value)}
                    className="border-[#D0337D]/20 text-[#07050a] mt-1"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#07050a]">Întrebări Rapide (3 necesare)</Label>
                  {topic.quick_questions.map((question, qIndex) => (
                    <Input
                      key={qIndex}
                      value={question}
                      onChange={(e) =>
                        handleTopicChange(selectedPersona, topicIndex, "quick_questions", e.target.value, qIndex)
                      }
                      placeholder={`Întrebare rapidă ${qIndex + 1}`}
                      className="border-[#D0337D]/20 text-[#07050a]"
                      disabled={isSaving}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() => addTopic(selectedPersona)}
            className="w-full border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-transparent rounded-full"
            disabled={isSaving}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Adaugă Subiect Nou
          </Button>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="w-full bg-[#D0337D] hover:bg-[#B02A6B] text-white rounded-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvare...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvează Configurația
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
