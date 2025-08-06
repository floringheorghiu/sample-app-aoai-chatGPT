'use client'

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Save, Loader2, RotateCcw, History, AlertCircle, CheckCircle, Copy, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { adminApiService, type SystemPromptConfig } from "@/lib/admin-api-service"
import { toast } from "sonner"

interface SystemPromptEditorProps {
  onSave?: (config: SystemPromptConfig) => void
  autoSaveInterval?: number
  maxLength?: number
}

export function SystemPromptEditor({
  onSave,
  autoSaveInterval = 30000, // 30 seconds
  maxLength = 10000
}: SystemPromptEditorProps) {
  const [prompt, setPrompt] = useState("")
  const [originalPrompt, setOriginalPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importText, setImportText] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [characterCount, setCharacterCount] = useState(0)
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load initial prompt
  useEffect(() => {
    const fetchPrompt = async () => {
      setIsLoading(true)
      try {
        const config = await adminApiService.getSystemPrompt()
        setPrompt(config.prompt)
        setOriginalPrompt(config.prompt)
        setLastSaved(new Date(config.lastModified))
        updateCounts(config.prompt)
      } catch (error) {
        toast.error(`Failed to load system prompt: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPrompt()
  }, [])

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && autoSaveInterval > 0) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave(true) // Auto-save
      }, autoSaveInterval)

      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
        }
      }
    }
  }, [hasUnsavedChanges, autoSaveInterval])

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

  const updateCounts = (text: string) => {
    setCharacterCount(text.length)
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
  }

  const validatePrompt = (text: string): string | null => {
    if (!text.trim()) {
      return "System prompt cannot be empty"
    }
    
    if (text.length > maxLength) {
      return `System prompt is too long (${text.length}/${maxLength} characters)`
    }
    
    // Check for potentially problematic content
    const suspiciousPatterns = [
      /ignore\s+previous\s+instructions/i,
      /forget\s+everything/i,
      /act\s+as\s+if/i
    ]
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        return "Prompt contains potentially problematic instructions"
      }
    }
    
    return null
  }

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value)
    setHasUnsavedChanges(value !== originalPrompt)
    updateCounts(value)
    
    const error = validatePrompt(value)
    setValidationError(error)
    
    // Clear auto-save timeout when user is actively typing
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
    }
  }, [originalPrompt])

  const handleSave = async (isAutoSave = false) => {
    if (validationError) {
      if (!isAutoSave) {
        toast.error(`Cannot save: ${validationError}`)
      }
      return
    }

    setIsSaving(true)
    try {
      await adminApiService.updateSystemPrompt(prompt)
      setOriginalPrompt(prompt)
      setHasUnsavedChanges(false)
      const now = new Date()
      setLastSaved(now)
      
      const config: SystemPromptConfig = {
        prompt,
        lastModified: now.toISOString()
      }
      
      onSave?.(config)
      
      if (isAutoSave) {
        toast.success("System prompt auto-saved", { duration: 2000 })
      } else {
        toast.success("System prompt saved successfully")
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
    setPrompt(originalPrompt)
    setHasUnsavedChanges(false)
    updateCounts(originalPrompt)
    setValidationError(null)
    toast.success("Changes reset")
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success("System prompt copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy to clipboard")
    }
  }

  const handleExport = () => {
    const blob = new Blob([prompt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `system-prompt-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("System prompt exported")
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      toast.error("Please select a text file (.txt)")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        setImportText(content)
        setShowImportDialog(true)
      }
    }
    reader.onerror = () => {
      toast.error("Failed to read file")
    }
    reader.readAsText(file)

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImportConfirm = () => {
    if (importText.trim()) {
      handlePromptChange(importText.trim())
      setShowImportDialog(false)
      setImportText("")
      toast.success("System prompt imported")
    }
  }

  const handleRestore = async (timestamp: string) => {
    try {
      const success = await adminApiService.restoreSystemPrompt(timestamp)
      if (success) {
        // Reload the prompt after restore
        const config = await adminApiService.getSystemPrompt()
        setPrompt(config.prompt)
        setOriginalPrompt(config.prompt)
        setHasUnsavedChanges(false)
        setLastSaved(new Date(config.lastModified))
        updateCounts(config.prompt)
        setShowRestoreDialog(false)
        toast.success("System prompt restored successfully")
      } else {
        toast.error("Failed to restore system prompt")
      }
    } catch (error) {
      toast.error(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getCharacterCountColor = () => {
    const percentage = (characterCount / maxLength) * 100
    if (percentage >= 90) return "text-destructive"
    if (percentage >= 75) return "text-yellow-600"
    return "text-muted-foreground"
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">System Prompt Editor</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure the main prompt that guides the AI assistant's behavior.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-1 text-sm text-yellow-600">
                  <AlertCircle className="w-4 h-4" />
                  Unsaved changes
                </div>
              )}
              {lastSaved && !hasUnsavedChanges && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Saved
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="system-prompt" className="text-foreground">
                System Prompt
              </Label>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Words: {wordCount}</span>
                <span className={getCharacterCountColor()}>
                  Characters: {characterCount}/{maxLength}
                </span>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32 border border-border rounded-md">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <Textarea
                id="system-prompt"
                value={prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                rows={12}
                className={`min-h-[200px] font-mono text-sm ${
                  validationError ? 'border-destructive' : ''
                }`}
                placeholder="Enter the system prompt that will guide the AI assistant's behavior..."
                disabled={isSaving}
              />
            )}
            
            {validationError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {validationError}
              </div>
            )}
            
            {lastSaved && (
              <p className="text-xs text-muted-foreground">
                Last saved: {lastSaved.toLocaleString()}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleSave(false)}
              disabled={isLoading || isSaving || !!validationError || !hasUnsavedChanges}
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
                  Save
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
              onClick={handleCopyToClipboard}
              disabled={isLoading || !prompt.trim()}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isLoading || !prompt.trim()}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isSaving}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowRestoreDialog(true)}
              disabled={isLoading || isSaving}
            >
              <History className="w-4 h-4 mr-2" />
              Restore
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

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".txt,text/plain"
        className="hidden"
      />

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore System Prompt</DialogTitle>
            <DialogDescription>
              Restore the system prompt from a previous backup. This will overwrite the current prompt.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Backup and restore functionality requires server-side implementation.
              This feature will be available once backup storage is configured.
            </p>
            
            <div className="p-4 border border-border rounded-md bg-muted/50">
              <p className="text-sm font-medium mb-2">Available Backups:</p>
              <p className="text-sm text-muted-foreground">
                No backups found. Backups are created automatically when you save changes.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import System Prompt</DialogTitle>
            <DialogDescription>
              Review the imported content before applying it to the system prompt.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-preview">Imported Content:</Label>
              <Textarea
                id="import-preview"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={8}
                className="mt-2 font-mono text-sm"
                placeholder="Imported content will appear here..."
              />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Words: {importText.trim() ? importText.trim().split(/\s+/).length : 0}</span>
              <span>Characters: {importText.length}</span>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImportConfirm}
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