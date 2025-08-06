export interface UploadedFile {
  file: File
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  message?: string
  path?: string
}

export interface SystemPromptConfig {
  prompt: string
  lastModified: string
}

export interface OnboardingTopic {
  label: string
  warmup_prompt: string
  quick_questions: string[]
}

export interface OnboardingConfig {
  [persona: string]: {
    topics: OnboardingTopic[]
  }
}

export type PersonaKey = keyof OnboardingConfig

export interface JobStatus {
  id: string
  status: 'started' | 'running' | 'completed' | 'failed'
  progress: Array<{
    stage: string
    progress: number
    message: string
    timestamp: string
  }>
  result?: any
  error?: string
  startTime: string
  endTime?: string
}

export class AdminApiService {
  private baseUrl = '/api/admin'

  // Document Upload Methods
  async uploadDocument(file: File, onProgress?: (progress: number) => void): Promise<boolean> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${this.baseUrl}/upload-doc`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      // Simulate progress for better UX
      if (onProgress) {
        onProgress(100)
      }

      return result.success
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  async uploadMultipleDocuments(
    files: File[], 
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<UploadedFile[]> {
    const results: UploadedFile[] = files.map(file => ({
      file,
      progress: 0,
      status: "pending" as const
    }))

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      results[i].status = "uploading"
      
      try {
        const success = await this.uploadDocument(file, (progress) => {
          results[i].progress = progress
          onProgress?.(i, progress)
        })
        
        results[i].status = success ? "success" : "error"
        results[i].message = success ? "Uploaded successfully" : "Upload failed"
      } catch (error) {
        results[i].status = "error"
        results[i].message = error instanceof Error ? error.message : "Unknown error"
      }
    }

    return results
  }

  async listUploadedFiles(): Promise<Array<{ name: string; path: string; size: number; lastModified: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/upload-doc`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.warn('Failed to list files:', errorData.error)
        return []
      }

      const result = await response.json()
      return result.files || []
    } catch (error) {
      console.warn('List files error:', error)
      // Return empty array instead of throwing to prevent component from breaking
      return []
    }
  }

  async deleteUploadedFile(filePath: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/upload-doc?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Delete file error:', error)
      return false
    }
  }

  // Ingestion Methods
  async triggerIngestion(files?: string[], config?: any): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/ingest-docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          config,
          scriptType: 'prepdocs'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ingestion failed')
      }

      const result = await response.json()
      return result.jobId || null
    } catch (error) {
      console.error('Ingestion error:', error)
      throw error
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/ingest-docs?jobId=${encodeURIComponent(jobId)}`)
      
      if (!response.ok) {
        return null
      }

      const result = await response.json()
      return result.job || null
    } catch (error) {
      console.error('Job status error:', error)
      return null
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ingest-docs?jobId=${encodeURIComponent(jobId)}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Cancel job error:', error)
      return false
    }
  }

  // System Prompt Methods
  async getSystemPrompt(): Promise<SystemPromptConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/config/system-prompt`)
      
      if (!response.ok) {
        throw new Error('Failed to get system prompt')
      }

      const result = await response.json()
      return result.config
    } catch (error) {
      console.error('Get system prompt error:', error)
      // Return default if API fails
      return {
        prompt: "You are a helpful AI assistant. Please provide accurate and helpful responses to user questions.",
        lastModified: new Date().toISOString()
      }
    }
  }

  async updateSystemPrompt(prompt: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/config/system-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update system prompt')
      }

      return true
    } catch (error) {
      console.error('Update system prompt error:', error)
      throw error
    }
  }

  async restoreSystemPrompt(timestamp: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/config/system-prompt?action=restore&timestamp=${encodeURIComponent(timestamp)}`, {
        method: 'PUT'
      })

      if (!response.ok) {
        throw new Error('Failed to restore system prompt')
      }

      return true
    } catch (error) {
      console.error('Restore system prompt error:', error)
      return false
    }
  }

  // Onboarding Configuration Methods
  async getOnboardingConfig(): Promise<OnboardingConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/config/onboarding`)
      
      if (!response.ok) {
        throw new Error('Failed to get onboarding config')
      }

      const result = await response.json()
      return result.config
    } catch (error) {
      console.error('Get onboarding config error:', error)
      // Return default if API fails
      return {
        parent: {
          topics: [
            {
              label: "Child Safety Online",
              warmup_prompt: "Let's discuss keeping children safe online.",
              quick_questions: [
                "What are the main online safety risks for children?",
                "How can I set up parental controls?",
                "What should I do if my child encounters inappropriate content?"
              ]
            }
          ]
        },
        teacher: {
          topics: [
            {
              label: "Educational Technology",
              warmup_prompt: "Let's explore educational technology tools.",
              quick_questions: [
                "What are the best educational apps for my classroom?",
                "How can I integrate technology into my lessons?",
                "What are effective online assessment tools?"
              ]
            }
          ]
        },
        child: {
          topics: [
            {
              label: "Learning and Fun",
              warmup_prompt: "Let's learn something fun together!",
              quick_questions: [
                "Can you help me with my homework?",
                "What are some fun educational games?",
                "How can I learn new skills online safely?"
              ]
            }
          ]
        }
      }
    }
  }

  async updateOnboardingConfig(config: OnboardingConfig): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/config/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update onboarding config')
      }

      return true
    } catch (error) {
      console.error('Update onboarding config error:', error)
      throw error
    }
  }

  async updatePersonaConfig(persona: string, topics: OnboardingTopic[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/config/onboarding?action=update-persona&persona=${encodeURIComponent(persona)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topics }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update persona config')
      }

      return true
    } catch (error) {
      console.error('Update persona config error:', error)
      throw error
    }
  }

  async restoreOnboardingConfig(timestamp: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/config/onboarding?action=restore&timestamp=${encodeURIComponent(timestamp)}`, {
        method: 'PUT'
      })

      if (!response.ok) {
        throw new Error('Failed to restore onboarding config')
      }

      return true
    } catch (error) {
      console.error('Restore onboarding config error:', error)
      return false
    }
  }

  async deletePersona(persona: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/config/onboarding?persona=${encodeURIComponent(persona)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete persona')
      }

      return true
    } catch (error) {
      console.error('Delete persona error:', error)
      return false
    }
  }

  async deleteTopic(persona: string, topicIndex: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/config/onboarding?persona=${encodeURIComponent(persona)}&topicIndex=${topicIndex}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete topic')
      }

      return true
    } catch (error) {
      console.error('Delete topic error:', error)
      return false
    }
  }

  // File validation utilities
  validateFileType(file: File, allowedTypes: string[] = ['.pdf', '.docx', '.txt', '.doc']): boolean {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    return allowedTypes.includes(fileExtension)
  }

  validateFileSize(file: File, maxSizeBytes: number = 50 * 1024 * 1024): boolean {
    return file.size <= maxSizeBytes
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Export singleton instance
export const adminApiService = new AdminApiService()