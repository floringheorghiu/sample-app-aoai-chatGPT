import { NextRequest, NextResponse } from 'next/server'
import { ConfigManager, LocalConfigProvider, SystemPromptConfig } from '@/lib/config-manager'
import { promises as fs } from 'fs'
import path from 'path'

interface SystemPromptResponse {
  success: boolean
  config?: SystemPromptConfig
  message?: string
  error?: string
}

interface SystemPromptUpdateRequest {
  prompt: string
}

// Initialize config manager
const configProvider = new LocalConfigProvider()
const configManager = new ConfigManager(configProvider)

export async function GET(): Promise<NextResponse<SystemPromptResponse>> {
  try {
    const config = await configManager.getSystemPromptConfig()
    
    return NextResponse.json({
      success: true,
      config
    })
  } catch (error) {
    console.error('Get system prompt config error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system prompt config'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<SystemPromptResponse>> {
  try {
    const body: SystemPromptUpdateRequest = await request.json()
    
    // Validate input
    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required and must be a string'
      }, { status: 400 })
    }

    if (body.prompt.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Prompt cannot be empty'
      }, { status: 400 })
    }

    if (body.prompt.length > 10000) {
      return NextResponse.json({
        success: false,
        error: 'Prompt is too long (maximum 10,000 characters)'
      }, { status: 400 })
    }

    // Create backup of current config
    try {
      const currentConfig = await configManager.getSystemPromptConfig()
      await createBackup('system-prompt', currentConfig)
    } catch (error) {
      console.warn('Failed to create backup:', error)
    }

    // Update configuration
    const newConfig: SystemPromptConfig = {
      prompt: body.prompt.trim(),
      lastModified: new Date().toISOString()
    }

    const saved = await configManager.saveSystemPromptConfig(newConfig)
    
    if (!saved) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save system prompt configuration'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      config: newConfig,
      message: 'System prompt configuration updated successfully'
    })

  } catch (error) {
    console.error('Update system prompt config error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update system prompt config'
    }, { status: 500 })
  }
}

// PUT endpoint for restoring from backup
export async function PUT(request: NextRequest): Promise<NextResponse<SystemPromptResponse>> {
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

      const restoredConfig = await restoreFromBackup('system-prompt', backupTimestamp)
      const saved = await configManager.saveSystemPromptConfig(restoredConfig)

      if (!saved) {
        return NextResponse.json({
          success: false,
          error: 'Failed to restore system prompt configuration'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        config: restoredConfig,
        message: 'System prompt configuration restored successfully'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Supported actions: restore'
    }, { status: 400 })

  } catch (error) {
    console.error('Restore system prompt config error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore system prompt config'
    }, { status: 500 })
  }
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
async function restoreFromBackup(configName: string, timestamp: string): Promise<SystemPromptConfig> {
  try {
    const backupDir = path.join('./admin-dashboard/src/data/config/backups')
    const backupPath = path.join(backupDir, `${configName}_${timestamp}.json`)
    
    const backupData = await fs.readFile(backupPath, 'utf-8')
    return JSON.parse(backupData) as SystemPromptConfig
  } catch (error) {
    console.error('Failed to restore from backup:', error)
    throw new Error(`Failed to restore from backup: ${error}`)
  }
}