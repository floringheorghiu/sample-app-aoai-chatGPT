import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface BackupInfo {
  filename: string
  configType: string
  timestamp: string
  size: number
  created: Date
}

interface BackupsResponse {
  success: boolean
  backups?: BackupInfo[]
  message?: string
  error?: string
}

const BACKUP_DIR = path.join('./admin-dashboard/src/data/config/backups')

export async function GET(request: NextRequest): Promise<NextResponse<BackupsResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const configType = searchParams.get('configType')

    // Ensure backup directory exists
    try {
      await fs.access(BACKUP_DIR)
    } catch {
      // Directory doesn't exist, return empty array
      return NextResponse.json({
        success: true,
        backups: []
      })
    }

    // Read backup files
    const files = await fs.readdir(BACKUP_DIR)
    const backups: BackupInfo[] = []

    for (const filename of files) {
      if (!filename.endsWith('.json')) continue

      // Parse filename: configType_timestamp.json
      const match = filename.match(/^(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)\.json$/)
      if (!match) continue

      const [, fileConfigType, timestamp] = match

      // Filter by config type if specified
      if (configType && fileConfigType !== configType) continue

      try {
        const filePath = path.join(BACKUP_DIR, filename)
        const stats = await fs.stat(filePath)

        backups.push({
          filename,
          configType: fileConfigType,
          timestamp,
          size: stats.size,
          created: stats.birthtime
        })
      } catch (error) {
        console.warn(`Failed to get stats for backup file ${filename}:`, error)
      }
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => b.created.getTime() - a.created.getTime())

    return NextResponse.json({
      success: true,
      backups
    })

  } catch (error) {
    console.error('List backups error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list backups'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<BackupsResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    const olderThan = searchParams.get('olderThan') // ISO date string

    if (!filename && !olderThan) {
      return NextResponse.json({
        success: false,
        error: 'Either filename or olderThan parameter is required'
      }, { status: 400 })
    }

    if (filename) {
      // Delete specific backup file
      const filePath = path.join(BACKUP_DIR, filename)
      
      // Security check: ensure filename is safe
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return NextResponse.json({
          success: false,
          error: 'Invalid filename'
        }, { status: 400 })
      }

      try {
        await fs.unlink(filePath)
        return NextResponse.json({
          success: true,
          message: `Backup file ${filename} deleted successfully`
        })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return NextResponse.json({
            success: false,
            error: 'Backup file not found'
          }, { status: 404 })
        }
        throw error
      }
    }

    if (olderThan) {
      // Delete backups older than specified date
      const cutoffDate = new Date(olderThan)
      
      if (isNaN(cutoffDate.getTime())) {
        return NextResponse.json({
          success: false,
          error: 'Invalid olderThan date format'
        }, { status: 400 })
      }

      try {
        await fs.access(BACKUP_DIR)
      } catch {
        return NextResponse.json({
          success: true,
          message: 'No backups directory found'
        })
      }

      const files = await fs.readdir(BACKUP_DIR)
      let deletedCount = 0

      for (const filename of files) {
        if (!filename.endsWith('.json')) continue

        try {
          const filePath = path.join(BACKUP_DIR, filename)
          const stats = await fs.stat(filePath)

          if (stats.birthtime < cutoffDate) {
            await fs.unlink(filePath)
            deletedCount++
          }
        } catch (error) {
          console.warn(`Failed to delete backup file ${filename}:`, error)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} backup files older than ${cutoffDate.toISOString()}`
      })
    }

  } catch (error) {
    console.error('Delete backups error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete backups'
    }, { status: 500 })
  }
}