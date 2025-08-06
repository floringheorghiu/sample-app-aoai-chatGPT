// components/admin/system-prompt-editor.tsx
"use client"
import { useState, useEffect } from "react"
import { Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { adminApiService } from "@/lib/admin-api-service"

export function SystemPromptEditor() {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchPrompt = async () => {
      setIsLoading(true)
      const config = await adminApiService.getSystemPrompt()
      setPrompt(config.prompt)
      setIsLoading(false)
    }
    fetchPrompt()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    await adminApiService.updateSystemPrompt(prompt)
    setIsSaving(false)
  }

  return (
    <Card className="border-[#D0337D]/20">
      <CardHeader>
        <CardTitle className="text-[#07050a]">Editor Prompt Sistem</CardTitle>
        <CardDescription className="text-[#07050a]/70">
          Editează promptul principal care ghidează comportamentul asistentului AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="system-prompt" className="text-[#07050a]">
            Prompt Sistem
          </Label>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-[#D0337D]" />
            </div>
          ) : (
            <Textarea
              id="system-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={10}
              className="min-h-[150px] border-[#D0337D]/20 text-[#07050a] mt-2"
              placeholder="Introdu promptul de sistem aici..."
              disabled={isSaving}
            />
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isLoading || isSaving}
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
              Salvează
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
