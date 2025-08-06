'use client'

import React, { useState, useRef, useCallback, useEffect } from "react"
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2, Play, Trash2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { adminApiService, type UploadedFile, type JobStatus } from "@/lib/admin-api-service"
import { toast } from "sonner"

interface DocumentUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void
  onIngestionComplete?: (jobId: string, success: boolean) => void
  maxFileSize?: number
  allowedFileTypes?: string[]
  maxFiles?: number
}

export function DocumentUpload({
  onUploadComplete,
  onIngestionComplete,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  allowedFileTypes = ['.pdf', '.docx', '.txt', '.doc'],
  maxFiles = 10
}: DocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isIngesting, setIsIngesting] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [showJobDialog, setShowJobDialog] = useState(false)
  const [uploadedFilesList, setUploadedFilesList] = useState<Array<{ name: string; path: string; size: number; lastModified: string }>>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const jobPollingRef = useRef<NodeJS.Timeout | null>(null)

  // Load uploaded files on component mount
  useEffect(() => {
    loadUploadedFiles()
  }, [])

  // Poll job status when ingesting
  useEffect(() => {
    if (currentJobId && isIngesting) {
      jobPollingRef.current = setInterval(async () => {
        const status = await adminApiService.getJobStatus(currentJobId)
        if (status) {
          setJobStatus(status)
          if (status.status === 'completed' || status.status === 'failed') {
            setIsIngesting(false)
            setCurrentJobId(null)
            onIngestionComplete?.(currentJobId, status.status === 'completed')
            
            if (status.status === 'completed') {
              toast.success("Procesarea documentelor s-a finalizat cu succes!")
              setSelectedFiles([]) // Clear files after successful ingestion
            } else {
              toast.error(`Procesarea documentelor a eșuat: ${status.error || 'Eroare necunoscută'}`)
            }
            
            if (jobPollingRef.current) {
              clearInterval(jobPollingRef.current)
              jobPollingRef.current = null
            }
          }
        }
      }, 2000) // Poll every 2 seconds

      return () => {
        if (jobPollingRef.current) {
          clearInterval(jobPollingRef.current)
          jobPollingRef.current = null
        }
      }
    }
  }, [currentJobId, isIngesting, onIngestionComplete])

  const loadUploadedFiles = async () => {
    try {
      const files = await adminApiService.listUploadedFiles()
      setUploadedFilesList(files)
    } catch (error) {
      console.warn('Failed to load uploaded files:', error)
      // Don't show error toast for this as it's not critical
      setUploadedFilesList([])
    }
  }

  const validateFile = (file: File): string | null => {
    if (!adminApiService.validateFileType(file, allowedFileTypes)) {
      return `Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`
    }
    
    if (!adminApiService.validateFileSize(file, maxFileSize)) {
      return `File too large. Maximum size: ${adminApiService.formatFileSize(maxFileSize)}`
    }
    
    return null
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    addFiles(files)
  }

  const addFiles = (files: File[]) => {
    if (selectedFiles.length + files.length > maxFiles) {
      toast.error(`Maxim ${maxFiles} fișiere permise`)
      return
    }

    const validFiles: UploadedFile[] = []
    const errors: string[] = []

    files.forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        // Check for duplicates
        const isDuplicate = selectedFiles.some(f => f.file.name === file.name && f.file.size === file.size)
        if (isDuplicate) {
          errors.push(`${file.name}: File already selected`)
        } else {
          validFiles.push({
            file,
            progress: 0,
            status: "pending"
          })
        }
      }
    })

    if (errors.length > 0) {
      toast.error(`File validation errors:\n${errors.join('\n')}`)
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
      toast.success(`${validFiles.length} fișier(e) adăugat(e) pentru încărcare`)
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }, [selectedFiles.length, maxFiles])

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadAll = async () => {
    const filesToUpload = selectedFiles.filter(f => f.status === "pending")
    if (filesToUpload.length === 0) {
      toast.warning("Nu există fișiere de încărcat")
      return
    }

    setIsUploading(true)
    
    try {
      const results = await adminApiService.uploadMultipleDocuments(
        filesToUpload.map(f => f.file),
        (fileIndex, progress) => {
          setSelectedFiles(prev => prev.map((file, i) => {
            const uploadIndex = prev.filter(f => f.status === "pending").indexOf(file)
            if (uploadIndex === fileIndex) {
              return { ...file, progress, status: "uploading" }
            }
            return file
          }))
        }
      )

      // Update file statuses based on results
      setSelectedFiles(prev => prev.map((file, i) => {
        const result = results.find(r => r.file.name === file.file.name)
        return result || file
      }))

      const successCount = results.filter(r => r.status === "success").length
      const errorCount = results.filter(r => r.status === "error").length

      if (successCount > 0) {
        toast.success(`${successCount} fișier(e) încărcat(e) cu succes`)
        await loadUploadedFiles() // Refresh uploaded files list
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} fișier(e) nu au putut fi încărcate`)
      }

      onUploadComplete?.(results)
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleTriggerIngestion = async () => {
    const uploadedFiles = selectedFiles.filter(f => f.status === "success")
    if (uploadedFiles.length === 0) {
      toast.warning("Nu există fișiere încărcate cu succes pentru procesare")
      return
    }

    setIsIngesting(true)
    setJobStatus(null)
    
    try {
      const jobId = await adminApiService.triggerIngestion(
        uploadedFiles.map(f => f.path).filter(Boolean) as string[]
      )
      
      if (jobId) {
        setCurrentJobId(jobId)
        setShowJobDialog(true)
        toast.success("Procesarea documentelor a început")
      } else {
        throw new Error("Failed to start ingestion job")
      }
    } catch (error) {
      setIsIngesting(false)
      toast.error(`Failed to start ingestion: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCancelJob = async () => {
    if (currentJobId) {
      const success = await adminApiService.cancelJob(currentJobId)
      if (success) {
        setIsIngesting(false)
        setCurrentJobId(null)
        setShowJobDialog(false)
        toast.success("Procesarea a fost anulată cu succes")
      } else {
        toast.error("Nu s-a putut anula procesarea")
      }
    }
  }

  const deleteUploadedFile = async (filePath: string) => {
    try {
      const success = await adminApiService.deleteUploadedFile(filePath)
      if (success) {
        await loadUploadedFiles()
        toast.success("Fișierul a fost șters cu succes")
      } else {
        toast.error("Nu s-a putut șterge fișierul")
      }
    } catch (error) {
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const allFilesUploaded = selectedFiles.length > 0 && selectedFiles.every(f => f.status === "success")
  const hasFilesToUpload = selectedFiles.some(f => f.status === "pending")
  const hasUploadErrors = selectedFiles.some(f => f.status === "error")

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-foreground">Încărcare și Procesare Documente</CardTitle>
          <CardDescription className="text-muted-foreground">
            Încarcă documente pentru a fi procesate de asistentul AI. Formate suportate: {allowedFileTypes.join(', ')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Selection Area */}
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">Selectează Fișiere</h3>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-primary/30 hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept={allowedFileTypes.join(',')}
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
              <UploadCloud className="w-10 h-10 mx-auto text-primary mb-3" />
              <p className="text-foreground/70">
                Trage și plasează fișierele aici sau fă clic pentru a selecta
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allowedFileTypes.join(', ')} (max {adminApiService.formatFileSize(maxFileSize)}, până la {maxFiles} fișiere)
              </p>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-foreground">
                  Fișiere Selectate ({selectedFiles.length})
                </h3>
                {hasUploadErrors && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFiles(prev => prev.filter(f => f.status !== "error"))}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Șterge Erorile
                  </Button>
                )}
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedFiles.map((uploadedFile, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-md">
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {adminApiService.formatFileSize(uploadedFile.file.size)}
                      </p>
                      {uploadedFile.status === "uploading" && (
                        <Progress value={uploadedFile.progress} className="h-1 mt-1" />
                      )}
                      {uploadedFile.message && (
                        <p className={`text-xs mt-1 ${
                          uploadedFile.status === "error" ? "text-destructive" : "text-muted-foreground"
                        }`}>
                          {uploadedFile.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {uploadedFile.status === "uploading" && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                      {uploadedFile.status === "success" && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {uploadedFile.status === "error" && (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                      {uploadedFile.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleUploadAll}
                disabled={isUploading || !hasFilesToUpload}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Încarcă ${selectedFiles.filter(f => f.status === "pending").length} Fișier(e)`
                )}
              </Button>
            </div>
          )}

          {/* Ingestion Section */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold text-foreground">Declanșează Procesarea</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUploadedFiles}
                className="h-8"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            
            {uploadedFilesList.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Fișiere încărcate anterior ({uploadedFilesList.length}):
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uploadedFilesList.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({adminApiService.formatFileSize(file.size)})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUploadedFile(file.path)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleTriggerIngestion}
              disabled={isIngesting || (!allFilesUploaded && uploadedFilesList.length === 0)}
              className="w-full"
              variant="secondary"
            >
              {isIngesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rulează Procesarea...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Rulează Procesarea
                </>
              )}
            </Button>
            
            {!allFilesUploaded && uploadedFilesList.length === 0 && selectedFiles.length > 0 && (
              <p className="text-sm text-destructive mt-2">
                Toate fișierele trebuie încărcate cu succes înainte de procesare.
              </p>
            )}
            {selectedFiles.length === 0 && uploadedFilesList.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Încarcă fișiere pentru a declanșa procesarea.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job Status Dialog */}
      <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Progresul Procesării Documentelor</DialogTitle>
            <DialogDescription>
              {jobStatus?.status === 'completed' 
                ? 'Procesarea s-a finalizat cu succes!'
                : jobStatus?.status === 'failed'
                ? 'Procesarea a eșuat'
                : 'Se procesează documentele...'}
            </DialogDescription>
          </DialogHeader>
          
          {jobStatus && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  jobStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
                  jobStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {jobStatus.status}
                </span>
              </div>
              
              {jobStatus.progress.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Progres:</span>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {jobStatus.progress.slice(-5).map((progress, index) => (
                      <div key={index} className="text-xs p-2 bg-muted rounded">
                        <div className="flex justify-between items-center">
                          <span>{progress.stage}</span>
                          <span>{progress.progress}%</span>
                        </div>
                        <div className="text-muted-foreground mt-1">{progress.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {jobStatus.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                  <p className="text-sm text-destructive font-medium">Eroare:</p>
                  <p className="text-sm text-destructive mt-1">{jobStatus.error}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            {isIngesting ? (
              <Button variant="outline" onClick={handleCancelJob}>
                Anulează Procesarea
              </Button>
            ) : (
              <Button onClick={() => setShowJobDialog(false)}>
                Închide
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}