"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { resizeImage, validateImageFile, type ImageUploadResult } from "@/lib/image-utils"

interface ImageUploadProps {
  onImageSelect: (base64: string) => void
  onImageRemove: () => void
  selectedImage?: string
  disabled?: boolean
  className?: string
}

export function ImageUpload({
  onImageSelect,
  onImageRemove,
  selectedImage,
  disabled = false,
  className = "",
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast({
        title: "Eroare",
        description: validation.error,
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const result: ImageUploadResult = await resizeImage(file)
      onImageSelect(result.base64)

      toast({
        title: "Imagine încărcată",
        description: `Imagine redimensionată la ${result.width}x${result.height}px`,
      })
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut procesa imaginea",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled || isProcessing) return

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find((file) => file.type.startsWith("image/"))

    if (imageFile) {
      handleFileSelect(imageFile)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onImageRemove()
  }

  if (selectedImage) {
    return (
      <Card className={`relative border-[#D0337D]/20 ${className}`}>
        <CardContent className="p-2">
          <div className="relative">
            <img
              src={selectedImage || "/placeholder.svg"}
              alt="Imagine selectată"
              className="w-full h-32 object-cover rounded"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      <Card
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          isDragging ? "border-[#D0337D] bg-[#D0337D]/5" : "border-[#D0337D]/30 hover:border-[#D0337D]/50"
        } ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !isProcessing) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
      >
        <CardContent className="p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            {isProcessing ? (
              <>
                <div className="w-8 h-8 border-2 border-[#D0337D] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#07050a]/70">Procesez imaginea...</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#D0337D]" />
                  <ImageIcon className="w-5 h-5 text-[#D0337D]" />
                </div>
                <p className="text-sm text-[#07050a]/70">Fă clic sau trage o imagine aici</p>
                <p className="text-xs text-[#07050a]/50">JPEG, PNG, GIF, WebP (max 10MB)</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
