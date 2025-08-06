import { NextRequest, NextResponse } from 'next/server'
import { ConfigManager, LocalConfigProvider, OnboardingConfig, OnboardingTopic } from '@/lib/config-manager'
import { promises as fs } from 'fs'
import path from 'path'

interface OnboardingResponse {
  success: boolean
  config?: OnboardingConfig
  message?: string
  error?: string
}

interface OnboardingUpdateRequest {
  config: OnboardingConfig
}

// Initialize config manager
const configProvider = new LocalConfigProvider()
const configManager = new ConfigManager(configProvider)

export async function GET(): Promise<NextResponse<OnboardingResponse>> {
  try {
    const config = await configManager.getOnboardingConfig()
    
    return NextResponse.json({
      success: true,
      config
    })
  } catch (error) {
    console.error('Get onboarding config error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get onboarding config'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<OnboardingResponse>> {
  try {
    const body: OnboardingUpdateRequest = await request.json()
    
    // Validate input
    if (!body.config || typeof body.config !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Configuration is required and must be an object'
      }, { status: 400 })
    }

    // Validate configuration structure
    const validationError = validateOnboardingConfig(body.config)
    if (validationError) {
      return NextResponse.json({
        success: false,
        error: validationError
      }, { status: 400 })
    }

    // Create backup of current config
    try {
      const currentConfig = await configManager.getOnboardingConfig()
      await createBackup('onboarding-config', currentConfig)
    } catch (error) {
      console.warn('Failed to create backup:', error)
    }

    // Update configuration
    const saved = await configManager.saveOnboardingConfig(body.config)
    
    if (!saved) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save onboarding configuration'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      config: body.config,
      message: 'Onboarding configuration updated successfully'
    })

  } catch (error) {
    console.error('Update onboarding config error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update onboarding config'
    }, { status: 500 })
  }
}

// PUT endpoint for restoring from backup or partial updates
export async function PUT(request: NextRequest): Promise<NextResponse<OnboardingResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'restore') {
      const backupTimestamp = searchParams.get('timestamp')
      
      if (!backupTimestamp) {
        return NextResponse.json({
          success: false,
          error: 'Backup timestamp is required for restore operation'
        }, { status: 400 })
      }

      const restoredConfig = await restoreFromBackup('onboarding-config', backupTimestamp)
      const saved = await configManager.saveOnboardingConfig(restoredConfig)

      if (!saved) {
        return NextResponse.json({
          success: false,
          error: 'Failed to restore onboarding configuration'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        config: restoredConfig,
        message: 'Onboarding configuration restored successfully'
      })
    }

    if (action === 'update-persona') {
      const persona = searchParams.get('persona')
      
      if (!persona) {
        return NextResponse.json({
          success: false,
          error: 'Persona is required for persona update'
        }, { status: 400 })
      }

      const body = await request.json()
      
      if (!body.topics || !Array.isArray(body.topics)) {
        return NextResponse.json({
          success: false,
          error: 'Topics array is required for persona update'
        }, { status: 400 })
      }

      // Validate topics
      const topicsValidationError = validateTopics(body.topics)
      if (topicsValidationError) {
        return NextResponse.json({
          success: false,
          error: topicsValidationError
        }, { status: 400 })
      }

      // Get current config and update specific persona
      const currentConfig = await configManager.getOnboardingConfig()
      currentConfig[persona] = { topics: body.topics }

      const saved = await configManager.saveOnboardingConfig(currentConfig)
      
      if (!saved) {
        return NextResponse.json({
          success: false,
          error: 'Failed to update persona configuration'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        config: currentConfig,
        message: `Persona '${persona}' configuration updated successfully`
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Supported actions: restore, update-persona'
    }, { status: 400 })

  } catch (error) {
    console.error('PUT onboarding config error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process onboarding config request'
    }, { status: 500 })
  }
}

// DELETE endpoint for removing personas or topics
export async function DELETE(request: NextRequest): Promise<NextResponse<OnboardingResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const persona = searchParams.get('persona')
    const topicIndex = searchParams.get('topicIndex')

    if (!persona) {
      return NextResponse.json({
        success: false,
        error: 'Persona is required for delete operation'
      }, { status: 400 })
    }

    const currentConfig = await configManager.getOnboardingConfig()

    if (!currentConfig[persona]) {
      return NextResponse.json({
        success: false,
        error: `Persona '${persona}' not found`
      }, { status: 404 })
    }

    if (topicIndex !== null) {
      // Delete specific topic
      const index = parseInt(topicIndex)
      if (isNaN(index) || index < 0 || index >= currentConfig[persona].topics.length) {
        return NextResponse.json({
          success: false,
          error: 'Invalid topic index'
        }, { status: 400 })
      }

      currentConfig[persona].topics.splice(index, 1)
      
      // Don't allow empty topics array
      if (currentConfig[persona].topics.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Cannot delete the last topic for a persona'
        }, { status: 400 })
      }
    } else {
      // Delete entire persona
      delete currentConfig[persona]
      
      // Don't allow empty config
      if (Object.keys(currentConfig).length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Cannot delete the last persona'
        }, { status: 400 })
      }
    }

    const saved = await configManager.saveOnboardingConfig(currentConfig)
    
    if (!saved) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete from onboarding configuration'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      config: currentConfig,
      message: topicIndex !== null 
        ? `Topic deleted from persona '${persona}' successfully`
        : `Persona '${persona}' deleted successfully`
    })

  } catch (error) {
    console.error('Delete onboarding config error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete from onboarding config'
    }, { status: 500 })
  }
}

// Helper function to validate onboarding configuration
function validateOnboardingConfig(config: OnboardingConfig): string | null {
  try {
    if (!config || typeof config !== 'object') {
      return 'Configuration must be an object'
    }

    const personas = Object.keys(config)
    if (personas.length === 0) {
      return 'At least one persona is required'
    }

    for (const [persona, personaConfig] of Object.entries(config)) {
      if (!persona || typeof persona !== 'string') {
        return 'Persona name must be a non-empty string'
      }

      if (!personaConfig || typeof personaConfig !== 'object') {
        return `Persona '${persona}' configuration must be an object`
      }

      if (!personaConfig.topics || !Array.isArray(personaConfig.topics)) {
        return `Persona '${persona}' must have a topics array`
      }

      if (personaConfig.topics.length === 0) {
        return `Persona '${persona}' must have at least one topic`
      }

      const topicsError = validateTopics(personaConfig.topics)
      if (topicsError) {
        return `Persona '${persona}': ${topicsError}`
      }
    }

    return null
  } catch (error) {
    return `Configuration validation error: ${error}`
  }
}

// Helper function to validate topics array
function validateTopics(topics: OnboardingTopic[]): string | null {
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i]
    
    if (!topic || typeof topic !== 'object') {
      return `Topic ${i + 1} must be an object`
    }

    if (!topic.label || typeof topic.label !== 'string' || topic.label.trim().length === 0) {
      return `Topic ${i + 1} must have a non-empty label`
    }

    if (!topic.warmup_prompt || typeof topic.warmup_prompt !== 'string' || topic.warmup_prompt.trim().length === 0) {
      return `Topic ${i + 1} must have a non-empty warmup_prompt`
    }

    if (!topic.quick_questions || !Array.isArray(topic.quick_questions)) {
      return `Topic ${i + 1} must have a quick_questions array`
    }

    if (topic.quick_questions.length === 0) {
      return `Topic ${i + 1} must have at least one quick question`
    }

    for (let j = 0; j < topic.quick_questions.length; j++) {
      const question = topic.quick_questions[j]
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return `Topic ${i + 1}, question ${j + 1} must be a non-empty string`
      }
    }
  }

  return null
}

// Helper function to create backup
async function createBackup(configName: string, config: any): Promise<void> {
  try {
    const backupDir = path.join('./admin-dashboard/src/data/config/backups')
    await fs.mkdir(backupDir, { recursive: true })
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `${configName}_${timestamp}.json`)
    
    await fs.writeFile(backupPath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to create backup:', error)
    throw error
  }
}

// Helper function to restore from backup
async function restoreFromBackup(configName: string, timestamp: string): Promise<OnboardingConfig> {
  try {
    const backupDir = path.join('./admin-dashboard/src/data/config/backups')
    const backupPath = path.join(backupDir, `${configName}_${timestamp}.json`)
    
    const backupData = await fs.readFile(backupPath, 'utf-8')
    return JSON.parse(backupData) as OnboardingConfig
  } catch (error) {
    console.error('Failed to restore from backup:', error)
    throw new Error(`Failed to restore from backup: ${error}`)
  }
}