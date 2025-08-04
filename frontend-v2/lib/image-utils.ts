export interface ImageUploadResult {
  base64: string
  width: number
  height: number
  size: number
}

export const resizeImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<ImageUploadResult> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw and resize image
      ctx?.drawImage(img, 0, 0, width, height)

      // Convert to base64
      const base64 = canvas.toDataURL("image/jpeg", quality)

      resolve({
        base64,
        width,
        height,
        size: Math.round((base64.length * 3) / 4), // Approximate size in bytes
      })
    }

    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Fișierul trebuie să fie o imagine" }
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "Imaginea este prea mare (max 10MB)" }
  }

  // Check supported formats
  const supportedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: "Format de imagine nesuportat" }
  }

  return { valid: true }
}
