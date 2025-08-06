import { NextRequest, NextResponse } from 'next/server'
import { FileManager, LocalStorageProvider, AzureBlobStorageProvider } from '@/lib/file-manager'

// Configuration constants
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_FILE_TYPES = ['.pdf', '.docx', '.txt', '.doc', '.rtf']
const UPLOAD_DIRECTORY = 'uploads'

interface UploadResponse {
  success: boolean
  filename?: string
  path?: string
  message?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    // Validate file exists
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Initialize file manager with Azure Blob Storage or fallback to local
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'ingest-test'
    
    let storageProvider: any
    let fileManager: FileManager
    
    if (connectionString) {
      try {
        storageProvider = new AzureBlobStorageProvider(connectionString, containerName)
        fileManager = new FileManager(storageProvider)
      } catch (azureError) {
        console.warn('Azure Blob Storage failed, falling back to local storage:', azureError)
        storageProvider = new LocalStorageProvider()
        fileManager = new FileManager(storageProvider)
      }
    } else {
      console.warn('Azure Storage connection string not configured, using local storage')
      storageProvider = new LocalStorageProvider()
      fileManager = new FileManager(storageProvider)
    }

    // Validate file type
    if (!fileManager.validateFileType(file, ALLOWED_FILE_TYPES)) {
      return NextResponse.json({
        success: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      }, { status: 400 })
    }

    // Validate file size
    if (!fileManager.validateFileSize(file, MAX_FILE_SIZE)) {
      return NextResponse.json({
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      }, { status: 400 })
    }

    // Ensure upload directory exists
    await fileManager.ensureUploadDirectory(UPLOAD_DIRECTORY)

    // Save the file
    const savedPath = await fileManager.saveUploadedFile(file, UPLOAD_DIRECTORY)

    // Return success response
    return NextResponse.json({
      success: true,
      filename: file.name,
      path: savedPath,
      message: 'File uploaded successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Upload error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    }, { status: 500 })
  }
}

// GET endpoint to list uploaded files
export async function GET(): Promise<NextResponse> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'ingest-test'
    
    let storageProvider: any
    let fileManager: FileManager
    
    if (connectionString) {
      try {
        storageProvider = new AzureBlobStorageProvider(connectionString, containerName)
        fileManager = new FileManager(storageProvider)
      } catch (azureError) {
        console.warn('Azure Blob Storage failed, falling back to local storage:', azureError)
        storageProvider = new LocalStorageProvider()
        fileManager = new FileManager(storageProvider)
      }
    } else {
      console.warn('Azure Storage connection string not configured, using local storage')
      storageProvider = new LocalStorageProvider()
      fileManager = new FileManager(storageProvider)
    }

    const files = await fileManager.listUploadedFiles(UPLOAD_DIRECTORY)

    return NextResponse.json({
      success: true,
      files
    }, { status: 200 })

  } catch (error) {
    console.error('List files error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files'
    }, { status: 500 })
  }
}

// DELETE endpoint to remove uploaded files
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({
        success: false,
        error: 'File path is required'
      }, { status: 400 })
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'ingest-test'
    
    let storageProvider: any
    let fileManager: FileManager
    
    if (connectionString) {
      try {
        storageProvider = new AzureBlobStorageProvider(connectionString, containerName)
        fileManager = new FileManager(storageProvider)
      } catch (azureError) {
        console.warn('Azure Blob Storage failed, falling back to local storage:', azureError)
        storageProvider = new LocalStorageProvider()
        fileManager = new FileManager(storageProvider)
      }
    } else {
      console.warn('Azure Storage connection string not configured, using local storage')
      storageProvider = new LocalStorageProvider()
      fileManager = new FileManager(storageProvider)
    }

    const deleted = await fileManager.deleteUploadedFile(filePath)

    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'File not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Delete file error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file'
    }, { status: 500 })
  }
}