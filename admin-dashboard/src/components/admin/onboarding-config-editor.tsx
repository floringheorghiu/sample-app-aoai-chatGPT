'use client'

import React, { useState, useEffect, useCallback } from "react"
import { Save, Loader2, PlusCircle, MinusCircle, Copy, Download, Upload, RotateCcw, AlertCircle, CheckCircle, FileText, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { adminApiService, type OnboardingConfig, type OnboardingTopic, type PersonaKey } from "@/lib/admin-api-service"
import { toast } from "sonner"

interface OnboardingConfigEditorProps {
  onSave?: (config: OnboardingConfig) => void
  autoSaveInterval?: number
}

interface ValidationError {
  persona?: string
  topicIndex?: number
  field?: string
  message: string
}

const personaOptions: { id: PersonaKey; label: string; description: string }[] = [
  { id: "child", label: "Child", description: "Configuration for child users" },
  { id: "parent", label: "Parent", description: "Configuration for parent users" },
  { id: "teacher", label: "Teacher", description: "Configuration for teacher users" },
]

export function OnboardingConfigEditor({
  onSave,
  autoSaveInterval = 30000 // 30 seconds
}: OnboardingConfigEditorProps) {
  const [config, setConfig] = useState<OnboardingConfig | null>(null)
  const [originalConfig, setOriginalConfig] = useState<OnboardingConfig | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey>("child")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importText, setImportText] = useState("")
  const [showAddPersonaDialog, setShowAddPersonaDialog] = useState(false)
  const [newPersonaName, setNewPersonaName] = useState("")

  // Load initial configuration
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true)
      try {
        const fetchedConfig = await adminApiService.getOnboardingConfig()
        setConfig(fetchedConfig)
        setOriginalConfig(JSON.parse(JSON.stringify(fetchedConfig)))
        
        // Set first available persona as selected
        const availablePersonas = Object.keys(fetchedConfig) as PersonaKey[]
        if (availablePersonas.length > 0) {
          setSelectedPersona(availablePersonas[0])
        }
      } catch (error) {
        toast.error(`Failed to load onboarding config: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [])

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && autoSaveInterval > 0 && validationErrors.length === 0) {
      const timeout = setTimeout(() => {
        handleSave(true) // Auto-save
      }, autoSaveInterval)

      return () => clearTimeout(timeout)
    }
  }, [hasUnsavedChanges, autoSaveInterval, validationErrors.length])

  // Prevent navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const validateConfig = useCallback((configToValidate: OnboardingConfig): ValidationError[] => {
    const errors: ValidationError[] = []

    for (const [persona, personaConfig] of Object.entries(configToValidate)) {
      if (!personaConfig.topics || personaConfig.topics.length === 0) {
        errors.push({
          persona,
          message: `Persona "${persona}" must have at least one topic`
        })
        continue
      }

      personaConfig.topics.forEach((topic, topicIndex) => {
        if (!topic.label?.trim()) {
          errors.push({
            persona,
            topicIndex,
            field: 'label',
            message: `Topic ${topicIndex + 1} must have a label`
          })
        }

        if (!topic.warmup_prompt?.trim()) {
          errors.push({
            persona,
            topicIndex,
            field: 'warmup_prompt',
            message: `Topic ${topicIndex + 1} must have a warmup prompt`
          })
        }

        if (!topic.quick_questions || topic.quick_questions.length === 0) {
          errors.push({
            persona,
            topicIndex,
            field: 'quick_questions',
            message: `Topic ${topicIndex + 1} must have at least one quick question`
          })
        } else {
          topic.quick_questions.forEach((question, qIndex) => {
            if (!question?.trim()) {
              errors.push({
                persona,
                topicIndex,
                field: 'quick_questions',
                message: `Topic ${topicIndex + 1}, question ${qIndex + 1} cannot be empty`
              })
            }
          })
        }
      })
    }

    return errors
  }, [])

  const updateConfig = useCallback((updatedConfig: OnboardingConfig) => {
    setConfig(updatedConfig)
    setHasUnsavedChanges(JSON.stringify(updatedConfig) !== JSON.stringify(originalConfig))
    
    const errors = validateConfig(updatedConfig)
    setValidationErrors(errors)
  }, [originalConfig, validateConfig])

  const handleTopicChange = (
    persona: PersonaKey,
    topicIndex: number,
    field: keyof OnboardingTopic,
    value: string | string[],
    questionIndex?: number
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

    updatedConfig[persona] = {
      ...updatedConfig[persona],
      topics: updatedTopics,
    }

    updateConfig(updatedConfig)
  }

  const addTopic = (persona: PersonaKey) => {
    if (!config) return
    
    const newTopic: OnboardingTopic = {
      label: "",
      warmup_prompt: "",
      quick_questions: ["", "", ""],
    }
    
    const updatedConfig = {
      ...config,
      [persona]: {
        ...config[persona],
        topics: [...config[persona].topics, newTopic],
      },
    }
    
    updateConfig(updatedConfig)
    toast.success("New topic added")
  }

  const removeTopic = (persona: PersonaKey, topicIndex: number) => {
    if (!config) return
    
    if (config[persona].topics.length <= 1) {
      toast.error("Cannot remove the last topic for a persona")
      return
    }
    
    const updatedTopics = config[persona].topics.filter((_, i) => i !== topicIndex)
    const updatedConfig = {
      ...config,
      [persona]: {
        ...config[persona],
        topics: updatedTopics,
      },
    }
    
    updateConfig(updatedConfig)
    toast.success("Topic removed")
  }

  const addQuickQuestion = (persona: PersonaKey, topicIndex: number) => {
    if (!config) return
    
    const topic = config[persona].topics[topicIndex]
    if (topic.quick_questions.length >= 5) {
      toast.error("Maximum 5 quick questions allowed per topic")
      return
    }
    
    const updatedQuestions = [...topic.quick_questions, ""]
    handleTopicChange(persona, topicIndex, "quick_questions", updatedQuestions)
    toast.success("Quick question added")
  }

  const removeQuickQuestion = (persona: PersonaKey, topicIndex: number, questionIndex: number) => {
    if (!config) return
    
    const topic = config[persona].topics[topicIndex]
    if (topic.quick_questions.length <= 1) {
      toast.error("Each topic must have at least one quick question")
      return
    }
    
    const updatedQuestions = topic.quick_questions.filter((_, i) => i !== questionIndex)
    handleTopicChange(persona, topicIndex, "quick_questions", updatedQuestions)
    toast.success("Quick question removed")
  }

  const addPersona = () => {
    if (!config || !newPersonaName.trim()) return
    
    const personaKey = newPersonaName.toLowerCase().replace(/\s+/g, '_') as PersonaKey
    
    if (config[personaKey]) {
      toast.error("Persona already exists")
      return
    }
    
    const updatedConfig = {
      ...config,
      [personaKey]: {
        topics: [{
          label: "Default Topic",
          warmup_prompt: "Let's get started!",
          quick_questions: ["How can I help you today?"]
        }]
      }
    }
    
    updateConfig(updatedConfig)
    setSelectedPersona(personaKey)
    setShowAddPersonaDialog(false)
    setNewPersonaName("")
    toast.success(`Persona "${newPersonaName}" added`)
  }

  const removePersona = (persona: PersonaKey) => {
    if (!config) return
    
    const personaCount = Object.keys(config).length
    if (personaCount <= 1) {
      toast.error("Cannot remove the last persona")
      return
    }
    
    const updatedConfig = { ...config }
    delete updatedConfig[persona]
    
    // Switch to first available persona
    const remainingPersonas = Object.keys(updatedConfig) as PersonaKey[]
    if (remainingPersonas.length > 0) {
      setSelectedPersona(remainingPersonas[0])
    }
    
    updateConfig(updatedConfig)
    toast.success(`Persona "${persona}" removed`)
  }

  const handleSave = async (isAutoSave = false) => {
    if (!config || validationErrors.length > 0) {
      if (!isAutoSave) {
        toast.error("Please fix validation errors before saving")
      }
      return
    }

    setIsSaving(true)
    try {
      await adminApiService.updateOnboardingConfig(config)
      setOriginalConfig(JSON.parse(JSON.stringify(config)))
      setHasUnsavedChanges(false)
      
      onSave?.(config)
      
      if (isAutoSave) {
        toast.success("Onboarding config auto-saved", { duration: 2000 })
      } else {
        toast.success("Onboarding configuration saved successfully")
      }
    } catch (error) {
      if (!isAutoSave) {
        toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig)))
      setHasUnsavedChanges(false)
      setValidationErrors([])
      toast.success("Changes reset")
    }
  }

  const handleExport = () => {
    if (!config) return
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `onboarding-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Configuration exported")
  }

  const handleImport = () => {
    try {
      const importedConfig = JSON.parse(importText) as OnboardingConfig
      const errors = validateConfig(importedConfig)
      
      if (errors.length > 0) {
        toast.error(`Invalid configuration: ${errors[0].message}`)
        return
      }
      
      updateConfig(importedConfig)
      setShowImportDialog(false)
      setImportText("")
      toast.success("Configuration imported successfully")
    } catch (error) {
      toast.error("Invalid JSON format")
    }
  }

  const duplicateTopic = (persona: PersonaKey, topicIndex: number) => {
    if (!config) return
    
    const topicToDuplicate = config[persona].topics[topicIndex]
    const duplicatedTopic: OnboardingTopic = {
      label: `${topicToDuplicate.label} (Copy)`,
      warmup_prompt: topicToDuplicate.warmup_prompt,
      quick_questions: [...topicToDuplicate.quick_questions]
    }
    
    const updatedConfig = {
      ...config,
      [persona]: {
        ...config[persona],
        topics: [
          ...config[persona].topics.slice(0, topicIndex + 1),
          duplicatedTopic,
          ...config[persona].topics.slice(topicIndex + 1)
        ],
      },
    }
    
    updateConfig(updatedConfig)
    toast.success("Topic duplicated")
  }

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-foreground">Onboarding Configuration Editor</CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure onboarding questions and topics for each persona.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-foreground">Onboarding Configuration Editor</CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure onboarding questions and topics for each persona.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-destructive">
          Failed to load onboarding configuration.
        </CardContent>
      </Card>
    )
  }

  const currentPersonaTopics = config[selectedPersona]?.topics || []
  const personaErrors = validationErrors.filter(e => e.persona === selectedPersona)

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Onboarding Configuration Editor</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure onboarding questions and topics for each persona.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-1 text-sm text-yellow-600">
                  <AlertCircle className="w-4 h-4" />
                  Unsaved changes
                </div>
              )}
              {!hasUnsavedChanges && originalConfig && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Saved
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="font-medium text-destructive">Validation Errors:</span>
              </div>
              <ul className="text-sm text-destructive space-y-1">
                {validationErrors.slice(0, 5).map((error, index) => (
                  <li key={index}>• {error.message}</li>
                ))}
                {validationErrors.length > 5 && (
                  <li>• ... and {validationErrors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}

          {/* Persona Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="persona-select" className="text-foreground font-medium">
                Select Persona ({Object.keys(config).length} total)
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddPersonaDialog(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Add Persona
                </Button>
                {Object.keys(config).length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removePersona(selectedPersona)}
                    className="text-destructive hover:text-destructive"
                  >
                    <MinusCircle className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            
            <Select value={selectedPersona} onValueChange={(value) => setSelectedPersona(value as PersonaKey)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a persona" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(config).map((persona) => {
                  const personaOption = personaOptions.find(p => p.id === persona)
                  const topicCount = config[persona as PersonaKey].topics.length
                  return (
                    <SelectItem key={persona} value={persona}>
                      <div className="flex items-center justify-between w-full">
                        <span>{personaOption?.label || persona}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {topicCount} topic{topicCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Topics for Selected Persona */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-semibold text-foreground">
                Topics for {personaOptions.find(p => p.id === selectedPersona)?.label || selectedPersona}
                {personaErrors.length > 0 && (
                  <span className="text-destructive ml-2">({personaErrors.length} errors)</span>
                )}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addTopic(selectedPersona)}
                disabled={isSaving}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Topic
              </Button>
            </div>
            
            {currentPersonaTopics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No topics configured for this persona.</p>
                <Button
                  variant="outline"
                  onClick={() => addTopic(selectedPersona)}
                  className="mt-4"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add First Topic
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {currentPersonaTopics.map((topic, topicIndex) => {
                  const topicErrors = personaErrors.filter(e => e.topicIndex === topicIndex)
                  
                  return (
                    <Card key={topicIndex} className={`p-4 ${topicErrors.length > 0 ? 'border-destructive/50' : 'border-border'}`}>
                      <CardContent className="p-0 space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-foreground">
                            Topic #{topicIndex + 1}
                            {topicErrors.length > 0 && (
                              <span className="text-destructive ml-2 text-sm">({topicErrors.length} errors)</span>
                            )}
                          </h4>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateTopic(selectedPersona, topicIndex)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTopic(selectedPersona, topicIndex)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              disabled={currentPersonaTopics.length <= 1}
                            >
                              <MinusCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`topic-label-${topicIndex}`} className="text-foreground">
                              Topic Label *
                            </Label>
                            <Input
                              id={`topic-label-${topicIndex}`}
                              value={topic.label}
                              onChange={(e) => handleTopicChange(selectedPersona, topicIndex, "label", e.target.value)}
                              className={`mt-1 ${topicErrors.some(e => e.field === 'label') ? 'border-destructive' : ''}`}
                              placeholder="Enter topic label..."
                              disabled={isSaving}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`warmup-prompt-${topicIndex}`} className="text-foreground">
                              Warmup Prompt *
                            </Label>
                            <Textarea
                              id={`warmup-prompt-${topicIndex}`}
                              value={topic.warmup_prompt}
                              onChange={(e) => handleTopicChange(selectedPersona, topicIndex, "warmup_prompt", e.target.value)}
                              className={`mt-1 ${topicErrors.some(e => e.field === 'warmup_prompt') ? 'border-destructive' : ''}`}
                              placeholder="Enter warmup prompt..."
                              rows={3}
                              disabled={isSaving}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-foreground">Quick Questions *</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addQuickQuestion(selectedPersona, topicIndex)}
                                disabled={topic.quick_questions.length >= 5 || isSaving}
                                className="h-7 text-xs"
                              >
                                <PlusCircle className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            </div>
                            {topic.quick_questions.map((question, qIndex) => (
                              <div key={qIndex} className="flex gap-2">
                                <Input
                                  value={question}
                                  onChange={(e) =>
                                    handleTopicChange(selectedPersona, topicIndex, "quick_questions", e.target.value, qIndex)
                                  }
                                  placeholder={`Quick question ${qIndex + 1}...`}
                                  className={`${topicErrors.some(e => e.field === 'quick_questions' && e.message.includes(`question ${qIndex + 1}`)) ? 'border-destructive' : ''}`}
                                  disabled={isSaving}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeQuickQuestion(selectedPersona, topicIndex, qIndex)}
                                  disabled={topic.quick_questions.length <= 1 || isSaving}
                                  className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                                >
                                  <MinusCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <Button
              onClick={() => handleSave(false)}
              disabled={isLoading || isSaving || validationErrors.length > 0 || !hasUnsavedChanges}
              className="flex-1 sm:flex-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading || isSaving || !hasUnsavedChanges}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isLoading || !config}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              disabled={isLoading || isSaving}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>

          {/* Auto-save indicator */}
          {autoSaveInterval > 0 && (
            <p className="text-xs text-muted-foreground">
              Auto-save enabled (every {Math.round(autoSaveInterval / 1000)} seconds)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Persona Dialog */}
      <Dialog open={showAddPersonaDialog} onOpenChange={setShowAddPersonaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Persona</DialogTitle>
            <DialogDescription>
              Create a new persona with default configuration.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-persona-name">Persona Name</Label>
              <Input
                id="new-persona-name"
                value={newPersonaName}
                onChange={(e) => setNewPersonaName(e.target.value)}
                placeholder="Enter persona name..."
                className="mt-2"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPersonaDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addPersona}
              disabled={!newPersonaName.trim()}
            >
              Add Persona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Configuration</DialogTitle>
            <DialogDescription>
              Paste or edit the JSON configuration to import.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-config">Configuration JSON:</Label>
              <Textarea
                id="import-config"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={12}
                className="mt-2 font-mono text-sm"
                placeholder="Paste JSON configuration here..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!importText.trim()}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}