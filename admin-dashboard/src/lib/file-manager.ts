import { promises as fs } from 'fs';
import path from 'path';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  type: string;
}

export interface StorageProvider {
  saveFile(file: File, filePath: string): Promise<string>;
  listFiles(directory: string): Promise<FileInfo[]>;
  deleteFile(filePath: string): Promise<boolean>;
  getFileUrl(filePath: string): Promise<string>;
  ensureDirectory(directory: string): Promise<void>;
  downloadFile?(filePath: string): Promise<Buffer>;
}

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = './admin-dashboard/src/data') {
    this.basePath = basePath;
  }

  async ensureDirectory(directory: string): Promise<void> {
    const fullPath = path.join(this.basePath, directory);
    try {
      await fs.mkdir(fullPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${fullPath}: ${error}`);
    }
  }

  async saveFile(file: File, filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      const directory = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });
      
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Write file
      await fs.writeFile(fullPath, buffer);
      
      return fullPath;
    } catch (error) {
      throw new Error(`Failed to save file ${filePath}: ${error}`);
    }
  }

  async listFiles(directory: string): Promise<FileInfo[]> {
    try {
      const fullPath = path.join(this.basePath, directory);
      
      // Check if directory exists
      try {
        await fs.access(fullPath);
      } catch {
        // Directory doesn't exist, return empty array
        return [];
      }

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(fullPath, entry.name);
          const stats = await fs.stat(filePath);
          
          files.push({
            name: entry.name,
            path: path.join(directory, entry.name),
            size: stats.size,
            lastModified: stats.mtime,
            type: path.extname(entry.name).toLowerCase()
          });
        }
      }

      return files;
    } catch (error) {
      throw new Error(`Failed to list files in ${directory}: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false; // File doesn't exist
      }
      throw new Error(`Failed to delete file ${filePath}: ${error}`);
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    // For local storage, return a relative URL that can be served by Next.js
    return `/api/files/${encodeURIComponent(filePath)}`;
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      return await fs.readFile(fullPath);
    } catch (error) {
      throw new Error(`Failed to download file ${filePath}: ${error}`);
    }
  }
}

export class AzureBlobStorageProvider implements StorageProvider {
  private connectionString: string;
  private containerName: string;
  private blobServiceClient: any;
  private containerClient: any;

  constructor(connectionString: string, containerName: string) {
    this.connectionString = connectionString;
    this.containerName = containerName;
  }

  private async initializeClients(): Promise<void> {
    if (this.containerClient) {
      return; // Already initialized
    }
    
    try {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Ensure container exists (without public access)
      await this.containerClient.createIfNotExists();
    } catch (error) {
      throw new Error(`Failed to initialize Azure Blob Storage: ${error}`);
    }
  }

  async ensureDirectory(directory: string): Promise<void> {
    // Azure Blob Storage doesn't have directories, so this is a no-op
    // Directories are simulated through blob naming conventions
    // The directory will be created implicitly when we upload files with the directory prefix
  }

  async saveFile(file: File, filePath: string): Promise<string> {
    try {
      // Ensure clients are initialized
      if (!this.containerClient) {
        await this.initializeClients();
      }

      // Normalize path for blob storage (use forward slashes)
      const blobName = filePath.replace(/\\/g, '/');
      
      // Get blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Upload file with metadata
      await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: {
          blobContentType: file.type || 'application/octet-stream'
        },
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          size: file.size.toString()
        }
      });
      
      return blobName;
    } catch (error) {
      throw new Error(`Failed to save file to Azure Blob Storage: ${error}`);
    }
  }

  async listFiles(directory: string): Promise<FileInfo[]> {
    try {
      // Ensure clients are initialized
      if (!this.containerClient) {
        await this.initializeClients();
      }

      const files: FileInfo[] = [];
      const prefix = directory ? `${directory.replace(/\\/g, '/')}/` : '';
      
      // List blobs with the directory prefix
      const listBlobsOptions = {
        prefix: prefix
      };

      for await (const blob of this.containerClient.listBlobsFlat(listBlobsOptions)) {
        // Skip if this is a "directory" blob (ends with /)
        if (blob.name.endsWith('/')) continue;
        
        // Extract filename from full path
        const fileName = blob.name.split('/').pop() || blob.name;
        
        files.push({
          name: fileName,
          path: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
          type: this.getFileExtension(fileName)
        });
      }

      return files;
    } catch (error) {
      throw new Error(`Failed to list files from Azure Blob Storage: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      // Ensure clients are initialized
      if (!this.containerClient) {
        await this.initializeClients();
      }

      // Normalize path for blob storage
      const blobName = filePath.replace(/\\/g, '/');
      
      // Get blob client
      const blobClient = this.containerClient.getBlobClient(blobName);
      
      // Delete the blob
      const deleteResponse = await blobClient.deleteIfExists();
      
      return deleteResponse.succeeded;
    } catch (error) {
      console.error(`Failed to delete file from Azure Blob Storage: ${error}`);
      return false;
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    try {
      // Ensure clients are initialized
      if (!this.containerClient) {
        await this.initializeClients();
      }

      // Normalize path for blob storage
      const blobName = filePath.replace(/\\/g, '/');
      
      // Get blob client
      const blobClient = this.containerClient.getBlobClient(blobName);
      
      // Generate SAS token for secure access (valid for 1 hour)
      const { generateBlobSASQueryParameters, BlobSASPermissions } = await import('@azure/storage-blob');
      
      // Extract account key from connection string for SAS generation
      const accountKeyMatch = this.connectionString.match(/AccountKey=([^;]+)/);
      const accountNameMatch = this.connectionString.match(/AccountName=([^;]+)/);
      
      if (!accountKeyMatch || !accountNameMatch) {
        // Fallback to direct URL if we can't generate SAS
        return blobClient.url;
      }
      
      const accountName = accountNameMatch[1];
      const accountKey = accountKeyMatch[1];
      
      // Create SAS token
      const sasOptions = {
        containerName: this.containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse('r'), // Read permission only
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour from now
      };
      
      const { StorageSharedKeyCredential } = await import('@azure/storage-blob');
      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      
      const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
      
      // Return URL with SAS token
      return `${blobClient.url}?${sasToken}`;
    } catch (error) {
      throw new Error(`Failed to get file URL from Azure Blob Storage: ${error}`);
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      // Ensure clients are initialized
      if (!this.containerClient) {
        await this.initializeClients();
      }

      // Normalize path for blob storage
      const blobName = filePath.replace(/\\/g, '/');
      
      // Get blob client
      const blobClient = this.containerClient.getBlobClient(blobName);
      
      // Download the blob content
      const downloadResponse = await blobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No readable stream available for blob');
      }
      
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      const stream = downloadResponse.readableStreamBody;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download file from Azure Blob Storage: ${error}`);
    }
  }

  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex).toLowerCase() : '';
  }
}

export class FileManager {
  private storageProvider: StorageProvider;

  constructor(storageProvider: StorageProvider) {
    this.storageProvider = storageProvider;
  }

  async saveUploadedFile(file: File, directory: string): Promise<string> {
    // Generate safe filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${safeName}`;
    const filePath = path.join(directory, fileName);

    return await this.storageProvider.saveFile(file, filePath);
  }

  async listUploadedFiles(directory: string): Promise<FileInfo[]> {
    return await this.storageProvider.listFiles(directory);
  }

  async deleteUploadedFile(filePath: string): Promise<boolean> {
    return await this.storageProvider.deleteFile(filePath);
  }

  async getFileUrl(filePath: string): Promise<string> {
    return await this.storageProvider.getFileUrl(filePath);
  }

  async ensureUploadDirectory(directory: string): Promise<void> {
    return await this.storageProvider.ensureDirectory(directory);
  }

  // Utility method to validate file types
  validateFileType(file: File, allowedTypes: string[]): boolean {
    const fileExtension = path.extname(file.name).toLowerCase();
    return allowedTypes.includes(fileExtension);
  }

  // Utility method to validate file size
  validateFileSize(file: File, maxSizeBytes: number): boolean {
    return file.size <= maxSizeBytes;
  }

  // Download file as buffer
  async downloadFile(filePath: string): Promise<Buffer> {
    if (this.storageProvider.downloadFile) {
      return await this.storageProvider.downloadFile(filePath);
    } else {
      throw new Error('Download functionality not supported by this storage provider');
    }
  }
}