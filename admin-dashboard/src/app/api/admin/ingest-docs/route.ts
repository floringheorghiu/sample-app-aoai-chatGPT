import { NextRequest, NextResponse } from 'next/server'
import { ScriptExecutor, ProcessingConfig, ExecutionProgress } from '@/lib/script-executor'
import { FileManager, LocalStorageProvider } from '@/lib/file-manager'
import path from 'path'

// In-memory job tracking (in production, use Redis or database)
interface JobStatus {
  id: string
  status: 'started' | 'running' | 'completed' | 'failed'
  progress: ExecutionProgress[]
  result?: any
  error?: string
  startTime: Date
  endTime?: Date
}

const activeJobs = new Map<string, JobStatus>()

interface IngestionRequest {
  files?: string[]
  config?: Partial<ProcessingConfig>
  scriptType?: 'data_preparation' | 'prepdocs' | 'batch'
}

interface IngestionResponse {
  success: boolean
  jobId?: string
  status?: string
  message?: string
  logs?: string[]
  error?: string
}

// Default configuration
const DEFAULT_CONFIG: ProcessingConfig = {
  data_path: 'uploads', // Will be updated to Azure Blob Storage path
  location: 'eastus',
  index_name: 'documents',
  chunk_size: 1000,
  token_overlap: 100,
  semantic_config_name: 'default',
  language: 'en',
  use_form_recognizer: false,
  form_recognizer_layout: false,
  njobs: 1,
  storageType: 'blob' // Changed to blob storage
}

export async function POST(request: NextRequest): Promise<NextResponse<IngestionResponse>> {
  try {
    const body: IngestionRequest = await request.json()
    
    // Generate unique job ID
    const jobId = `ingest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Initialize job status
    const jobStatus: JobStatus = {
      id: jobId,
      status: 'started',
      progress: [],
      startTime: new Date()
    }
    activeJobs.set(jobId, jobStatus)

    // Merge configuration with defaults
    const config: ProcessingConfig = {
      ...DEFAULT_CONFIG,
      ...body.config
    }

    // Validate configuration
    const validationError = validateConfig(config)
    if (validationError) {
      jobStatus.status = 'failed'
      jobStatus.error = validationError
      jobStatus.endTime = new Date()
      
      return NextResponse.json({
        success: false,
        jobId,
        error: validationError
      }, { status: 400 })
    }

    // If specific files are provided, update data_path
    if (body.files && body.files.length > 0) {
      // For Azure Blob Storage, use the blob URLs directly
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'ingest-test'
      
      if (connectionString) {
        // Use Azure Blob Storage URLs
        const storageAccountName = connectionString.match(/AccountName=([^;]+)/)?.[1]
        if (storageAccountName) {
          config.data_path = body.files.map(file => 
            `https://${storageAccountName}.blob.core.windows.net/${containerName}/${file}`
          )
          config.blobConnectionString = connectionString
          config.containerName = containerName
        }
      } else {
        // Fallback to local paths if Azure not configured
        const uploadsDir = path.resolve('./admin-dashboard/src/data/uploads')
        config.data_path = body.files.map(file => path.join(uploadsDir, file))
        config.storageType = 'local'
      }
    }

    // Initialize script executor
    const scriptExecutor = new ScriptExecutor()

    // Check if we're in development mode (skip Python validation)
    const isDevelopmentMode = process.env.NODE_ENV === 'development' || process.env.SKIP_PYTHON_VALIDATION === 'true'
    
    if (!isDevelopmentMode) {
      // Validate Python environment only in production
      const pythonCheck = await scriptExecutor.validatePythonEnvironment()
      if (!pythonCheck.valid) {
        jobStatus.status = 'failed'
        jobStatus.error = `Python environment error: ${pythonCheck.message}`
        jobStatus.endTime = new Date()
        
        return NextResponse.json({
          success: false,
          jobId,
          error: jobStatus.error
        }, { status: 500 })
      }
    }

    // Start ingestion process asynchronously
    processIngestion(jobId, config, body.scriptType || 'prepdocs', scriptExecutor)
      .catch(error => {
        console.error(`Job ${jobId} failed:`, error)
        const job = activeJobs.get(jobId)
        if (job) {
          job.status = 'failed'
          job.error = error.message
          job.endTime = new Date()
        }
      })

    return NextResponse.json({
      success: true,
      jobId,
      status: 'started',
      message: 'Document ingestion started successfully'
    }, { status: 202 })

  } catch (error) {
    console.error('Ingestion API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown ingestion error'
    }, { status: 500 })
  }
}

// GET endpoint to check job status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      // Return all active jobs
      const jobs = Array.from(activeJobs.values()).map(job => ({
        id: job.id,
        status: job.status,
        startTime: job.startTime,
        endTime: job.endTime,
        progressCount: job.progress.length
      }))

      return NextResponse.json({
        success: true,
        jobs
      })
    }

    const job = activeJobs.get(jobId)
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        startTime: job.startTime,
        endTime: job.endTime
      }
    })

  } catch (error) {
    console.error('Job status error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get job status'
    }, { status: 500 })
  }
}

// DELETE endpoint to cancel a job
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Job ID is required'
      }, { status: 400 })
    }

    const job = activeJobs.get(jobId)
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 })
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel completed or failed job'
      }, { status: 400 })
    }

    // Try to kill the process
    const scriptExecutor = new ScriptExecutor()
    const killed = await scriptExecutor.killProcess(jobId)

    if (killed) {
      job.status = 'failed'
      job.error = 'Job cancelled by user'
      job.endTime = new Date()
    }

    return NextResponse.json({
      success: true,
      message: killed ? 'Job cancelled successfully' : 'Job was already completed'
    })

  } catch (error) {
    console.error('Cancel job error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel job'
    }, { status: 500 })
  }
}

// Helper function to validate configuration
function validateConfig(config: ProcessingConfig): string | null {
  if (!config.index_name || config.index_name.trim() === '') {
    return 'Index name is required'
  }

  if (config.chunk_size < 100 || config.chunk_size > 10000) {
    return 'Chunk size must be between 100 and 10000'
  }

  if (config.token_overlap < 0 || config.token_overlap >= config.chunk_size) {
    return 'Token overlap must be between 0 and chunk size'
  }

  if (config.njobs < 1 || config.njobs > 32) {
    return 'Number of jobs must be between 1 and 32'
  }

  if (!config.language || config.language.trim() === '') {
    return 'Language is required'
  }

  return null
}

// Async function to process ingestion
async function processIngestion(
  jobId: string,
  config: ProcessingConfig,
  scriptType: string,
  scriptExecutor: ScriptExecutor
): Promise<void> {
  const job = activeJobs.get(jobId)
  if (!job) return

  try {
    job.status = 'running'

    // Progress callback to track execution
    const progressCallback = (progress: ExecutionProgress) => {
      job.progress.push(progress)
    }

    // Check if we're in development mode
    const isDevelopmentMode = process.env.NODE_ENV === 'development' || process.env.SKIP_PYTHON_VALIDATION === 'true'
    
    let result
    if (isDevelopmentMode) {
      // Simulate ingestion process for development
      result = await simulateIngestion(config, progressCallback)
    } else {
      // Run actual scripts in production
      switch (scriptType) {
        case 'data_preparation':
          result = await scriptExecutor.executeDataPreparation(config, progressCallback)
          break
        case 'prepdocs':
          result = await scriptExecutor.executePrepdocs(config, progressCallback)
          break
        case 'batch':
          // For batch processing, we need a BatchConfig
          const batchConfig = {
            baseConfig: config,
            indexConfigs: [{ key: 'default', index: config.index_name }]
          }
          result = await scriptExecutor.executeBatchIndexing(batchConfig, progressCallback)
          break
        default:
          throw new Error(`Unknown script type: ${scriptType}`)
      }
    }

    job.result = result
    job.status = result.success ? 'completed' : 'failed'
    job.error = result.success ? undefined : result.stderr || 'Script execution failed'
    job.endTime = new Date()

    // Clean up old jobs (keep only last 100)
    if (activeJobs.size > 100) {
      const oldestJobs = Array.from(activeJobs.entries())
        .sort(([,a], [,b]) => a.startTime.getTime() - b.startTime.getTime())
        .slice(0, activeJobs.size - 100)
      
      oldestJobs.forEach(([id]) => activeJobs.delete(id))
    }

  } catch (error) {
    job.status = 'failed'
    job.error = error instanceof Error ? error.message : 'Unknown processing error'
    job.endTime = new Date()
    throw error
  }
}

// Simulate ingestion process for development mode
async function simulateIngestion(
  config: ProcessingConfig,
  progressCallback: (progress: ExecutionProgress) => void
): Promise<any> {
  return new Promise((resolve) => {
    let progress = 0
    const stages = [
      { name: 'Initializing', duration: 1000 },
      { name: 'Processing files', duration: 2000 },
      { name: 'Extracting content', duration: 1500 },
      { name: 'Creating embeddings', duration: 2000 },
      { name: 'Indexing documents', duration: 1500 },
      { name: 'Finalizing', duration: 500 }
    ]

    let currentStage = 0
    
    const simulateStage = () => {
      if (currentStage >= stages.length) {
        progressCallback({
          stage: 'Completed',
          progress: 100,
          message: 'Document ingestion completed successfully (simulated)',
          timestamp: new Date()
        })
        
        resolve({
          success: true,
          exitCode: 0,
          stdout: 'Simulated ingestion completed successfully',
          stderr: '',
          duration: 8500,
          scriptUsed: 'simulation',
          azureResourcesCreated: [`Search Index: ${config.index_name}`]
        })
        return
      }

      const stage = stages[currentStage]
      progress = Math.round(((currentStage + 1) / stages.length) * 100)
      
      progressCallback({
        stage: stage.name,
        progress,
        message: `${stage.name}... (simulated)`,
        timestamp: new Date()
      })

      currentStage++
      setTimeout(simulateStage, stage.duration)
    }

    // Start simulation
    setTimeout(simulateStage, 100)
  })
}