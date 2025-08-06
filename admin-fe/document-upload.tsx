// components/admin/document-upload.tsx
"use client"

import type React from "react"
import { useState, useRef } from "react"
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { adminApiService } from "@/lib/admin-api-service"

interface UploadedFile {
  file: File
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  message?: string
}

export function DocumentUpload() {
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isIngesting, setIsIngesting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedFileTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      progress: 0,
      status: "pending",
    }))
    setSelectedFiles((prev) => [...prev, ...newFiles])
  }

  const handleUploadAll = async () => {
    setIsUploading(true)
    const uploadPromises = selectedFiles.map(async (uploadedFile, index) => {
      if (uploadedFile.status === "success" || uploadedFile.status === "error") return // Skip already processed files

      setSelectedFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f)))

      const onProgress = (progress: number) => {
        setSelectedFiles((prev) => prev.map((f, i) => (i === index ? { ...f, progress: Math.round(progress) } : f)))
      }

      try {
        const success = await adminApiService.uploadDocument(uploadedFile.file, onProgress)
        setSelectedFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: success ? "success" : "error", message: success ? "Încărcat" : "Eroare" } : f,
          ),
        )
      } catch (error: any) {
        setSelectedFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: "error", message: error.message || "Eroare necunoscută" } : f,
          ),
        )
      }
    })

    await Promise.all(uploadPromises)
    setIsUploading(false)
  }

  const handleTriggerIngestion = async () => {
    setIsIngesting(true)
    const success = await adminApiService.triggerIngestion()
    setIsIngesting(false)
    if (success) {
      setSelectedFiles([]) // Clear files after successful ingestion trigger
    }
  }

  const allFilesUploaded = selectedFiles.every((f) => f.status === "success")
  const hasFilesToUpload = selectedFiles.some((f) => f.status === "pending" || f.status === "uploading")

  return (
    <Card className="border-[#D0337D]/20">
      <CardHeader>
        <CardTitle className="text-[#07050a]">Încărcare Documente & Ingestie</CardTitle>
        <CardDescription className="text-[#07050a]/70">
          Încarcă documente noi pentru a fi procesate de asistentul AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-md font-semibold text-[#07050a] mb-3">Selectează Fișiere</h3>
          <div
            className="border-2 border-dashed border-[#D0337D]/30 rounded-lg p-6 text-center cursor-pointer hover:border-[#D0337D]/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 mx-auto text-[#D0337D] mb-3" />
            <p className="text-[#07050a]/70">Trage și plasează fișiere aici sau fă clic pentru a selecta</p>
            <p className="text-xs text-[#07050a]/50 mt-1">PDF, DOCX, TXT (multiple)</p>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-[#07050a]">Fișiere Selectate ({selectedFiles.length})</h3>
            <div className="space-y-3">
              {selectedFiles.map((uploadedFile, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border border-[#D0337D]/20 rounded-md">
                  <FileText className="w-5 h-5 text-[#07050a]/70" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#07050a]">{uploadedFile.file.name}</p>
                    <Progress value={uploadedFile.progress} className="h-2 mt-1" />
                  </div>
                  <div className="w-20 text-right">
                    {uploadedFile.status === "uploading" && <Loader2 className="w-5 h-5 animate-spin text-[#D0337D]" />}
                    {uploadedFile.status === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {uploadedFile.status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                    {uploadedFile.status === "pending" && <span className="text-sm text-[#07050a]/60">Așteaptă</span>}
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={handleUploadAll}
              disabled={isUploading || !hasFilesToUpload}
              className="w-full bg-[#D0337D] hover:bg-[#B02A6B] text-white rounded-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Încărcare...
                </>
              ) : (
                "Încarcă Toate Fișierele"
              )}
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-[#D0337D]/10">
          <h3 className="text-md font-semibold text-[#07050a] mb-3">Declanșează Ingestia</h3>
          <Button
            onClick={handleTriggerIngestion}
            disabled={isIngesting || !allFilesUploaded}
            className="w-full bg-[#9a6ae1] hover:bg-[#8A5DD1] text-white rounded-full"
          >
            {isIngesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rulează Ingestia...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Rulează Ingestia
              </>
            )}
          </Button>
          {!allFilesUploaded && selectedFiles.length > 0 && (
            <p className="text-sm text-red-500 mt-2">
              Toate fișierele trebuie încărcate cu succes înainte de ingestie.
            </p>
          )}
          {selectedFiles.length === 0 && (
            <p className="text-sm text-[#07050a]/60 mt-2">Încarcă fișiere pentru a declanșa ingestia.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
