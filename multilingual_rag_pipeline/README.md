# 🌐 Multilingual Document Ingestion Pipeline for RAG Systems

## 📋 **Overview**

This enterprise-grade pipeline automatically ingests multilingual documents into your RAG/search system by:

1. **📁 Document Upload** → Stores documents in Azure Blob Storage
2. **📄 Text Extraction** → Uses Azure Document Intelligence for complex formats
3. **🔍 Language Detection** → Automatically detects document language
4. **🌐 Translation** → Translates foreign documents to English using Azure Translator
5. **✂️ Smart Chunking** → Intelligently chunks content with overlap
6. **🧠 Embeddings** → Generates OpenAI embeddings for vector search
7. **🔎 Indexing** → Indexes in Azure Cognitive Search with semantic capabilities

## 🚀 **Quick Start**

### **1. Setup**

```bash
# Navigate to the pipeline directory
cd multilingual_rag_pipeline

# Install dependencies
pip install -r requirements.txt

# Copy configuration template
cp multilingual_config.json.template multilingual_config.json

# Edit with your Azure credentials
nano multilingual_config.json
```

### **2. Basic Usage**

```python
from multilingual_ingestion_pipeline import MultilingualRAGPipeline

# Initialize pipeline
pipeline = MultilingualRAGPipeline("multilingual_config.json")

# Process documents
result = pipeline.ingest_documents([
    "french_document.pdf",
    "german_report.docx", 
    "spanish_article.txt"
])

print(f"✅ Processed: {result.processed_files}/{result.total_files}")
print(f"🌐 Translated: {result.translated_files} documents")
print(f"📄 Indexed: {result.total_chunks} chunks")
```

### **3. CLI Usage**

```bash
# Process individual files
python multilingual_ingestion_pipeline.py doc1.pdf doc2.docx doc3.txt

# Batch process directory
python multilingual_ingestion_pipeline.py --batch /path/to/documents

# With custom configuration
python multilingual_ingestion_pipeline.py --config my_config.json doc.pdf

# Verbose logging
python multilingual_ingestion_pipeline.py -v documents/
```

## 🎯 **Key Features**

- ✅ **Multi-format Support**: PDF, DOCX, TXT, MD, HTML
- ✅ **Automatic Translation**: 90+ languages → English
- ✅ **Smart Text Extraction**: Azure Document Intelligence + fallback methods
- ✅ **Enterprise Storage**: Azure Blob Storage with organized structure
- ✅ **Vector Search Ready**: OpenAI embeddings + Azure Cognitive Search
- ✅ **Concurrent Processing**: Parallel document processing
- ✅ **Comprehensive Logging**: Detailed progress and error tracking
- ✅ **Flexible Configuration**: JSON-based settings management

## ⚙️ **Required Azure Services**

You'll need to set up the following Azure services:

1. **Azure Translator** - For language detection and translation
2. **Azure Document Intelligence** - For advanced text extraction
3. **Azure Storage Account** - For document and content storage
4. **Azure Cognitive Search** - For search indexing with vector support
5. **Azure OpenAI** - For embedding generation

## 📊 **Architecture**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Documents  │───▶│   Pipeline   │───▶│   RAG System    │
│ (Any Lang.) │    │              │    │  (All English)  │
└─────────────┘    └──────────────┘    └─────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼───┐   ┌────▼────┐  ┌────▼─────┐
         │ Azure  │   │ Azure   │  │  Azure   │
         │ Blob   │   │Translator│  │ Search   │
         │Storage │   │   API   │  │  Index   │
         └────────┘   └─────────┘  └──────────┘
```

## 🏗️ **Pipeline Components**

- **🗂️ MultilingualRAGConfig**: Secure credential management
- **📄 DocumentProcessor**: Multi-format text extraction  
- **🌐 TranslationService**: Language detection & translation
- **☁️ BlobStorageManager**: Azure storage operations
- **🔍 SearchIndexManager**: Azure Cognitive Search indexing
- **🎯 MultilingualRAGPipeline**: Main orchestrator

## 📈 **Configuration**

Fill in your Azure service details in `multilingual_config.json`:

```json
{
  "azure_translator": {
    "endpoint": "https://your-translator.cognitiveservices.azure.com/",
    "subscription_key": "your-key-here",
    "region": "eastus"
  },
  "azure_storage": {
    "account_name": "yourstorageaccount",
    "account_key": "your-storage-key",
    "container_name": "documents"
  },
  "azure_document_intelligence": {
    "endpoint": "https://your-doc-intel.cognitiveservices.azure.com/",
    "key": "your-doc-intel-key"
  },
  "azure_search": {
    "service_name": "your-search-service",
    "admin_key": "your-admin-key",
    "index_name": "multilingual-documents"
  },
  "azure_openai": {
    "endpoint": "https://your-openai.openai.azure.com/",
    "key": "your-openai-key",
    "embedding_deployment": "text-embedding-ada-002"
  }
}
```

## 🔧 **Processing Settings**

Customize processing behavior:

```json
{
  "processing_settings": {
    "chunk_size": 1000,           // Tokens per chunk
    "chunk_overlap": 100,         // Overlap between chunks
    "min_chunk_size": 50,         // Minimum chunk size
    "max_concurrent_files": 5,    // Parallel processing limit
    "translation_enabled": true,  // Enable translation
    "force_translation": false,   // Force translate English docs
    "supported_formats": ["pdf", "docx", "txt", "md", "html"]
  }
}
```

## 📊 **Processing Workflow**

### **Document Processing Steps**

1. **📁 File Validation** - Verify file exists and format is supported
2. **☁️ Blob Storage Upload** - Upload original document with unique URL
3. **📄 Text Extraction** - Multi-method text extraction based on format
4. **🔍 Language Detection** - Azure Translator language detection
5. **🌐 Translation** - Translate to English if not already English
6. **☁️ Translated Storage** - Store translated content in organized structure
7. **✂️ Smart Chunking** - Intelligent chunking with configurable overlap
8. **🧠 Embedding Generation** - OpenAI embeddings with retry logic
9. **🔎 Search Indexing** - Upload to Azure Cognitive Search with vectors

## 📈 **Results & Statistics**

The pipeline provides comprehensive statistics:

```python
pipeline_result = PipelineResult(
    success=True,
    total_files=10,
    processed_files=9,
    failed_files=1,
    translated_files=7,
    total_chunks=150,
    total_processing_time=120.0
)
```

Individual document results include:
- Success/failure status
- Detected language
- Translation statistics
- Number of chunks created
- Processing time
- Blob URLs for storage references

## 🔌 **Integration Examples**

### **Flask Web App**

```python
from flask import Flask, request, jsonify
from multilingual_ingestion_pipeline import MultilingualRAGPipeline

app = Flask(__name__)
pipeline = MultilingualRAGPipeline()

@app.route('/upload-documents', methods=['POST'])
def upload_documents():
    files = request.files.getlist('documents')
    
    # Save uploaded files temporarily
    temp_files = []
    for file in files:
        temp_path = f"/tmp/{file.filename}"
        file.save(temp_path)
        temp_files.append(temp_path)
    
    # Process through pipeline
    result = pipeline.ingest_documents(temp_files)
    
    return jsonify({
        'success': result.success,
        'processed_files': result.processed_files,
        'translated_files': result.translated_files,
        'total_chunks': result.total_chunks
    })
```

### **Batch Processing**

```python
import schedule
import time
from pathlib import Path

def process_incoming_documents():
    """Scheduled processing of new documents."""
    watch_directory = Path("/data/incoming")
    pipeline = MultilingualRAGPipeline()
    
    # Find new documents
    supported_formats = pipeline.config.processing_settings['supported_formats']
    new_files = []
    
    for fmt in supported_formats:
        new_files.extend(watch_directory.glob(f"*.{fmt}"))
    
    if new_files:
        print(f"Found {len(new_files)} new documents")
        result = pipeline.ingest_documents([str(f) for f in new_files])

# Schedule processing every 10 minutes
schedule.every(10).minutes.do(process_incoming_documents)
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Configuration Errors**
   - Ensure all Azure service credentials are correct
   - Check service endpoints are accessible
   - Verify services are active in Azure Portal

2. **Document Processing Failures**
   - PDF might be image-based (requires OCR)
   - Check document isn't corrupted
   - Try with different file formats

3. **Translation Rate Limits**
   - Increase `rate_limit_delay` in config
   - Upgrade Azure Translator tier
   - Process fewer files concurrently

### **Debug Mode**

```bash
# Enable verbose logging for debugging
python multilingual_ingestion_pipeline.py -v documents/
```

## 🔒 **Security Best Practices**

1. **Never commit** `multilingual_config.json` with credentials
2. **Use Azure Key Vault** for production deployments
3. **Rotate API keys** regularly
4. **Monitor usage** in Azure Portal

## 🎉 **Success Metrics**

After processing, you'll have:

- ✅ **Unified Knowledge Base**: All documents searchable in English
- ✅ **Semantic Search**: Vector embeddings for intelligent retrieval
- ✅ **Organized Storage**: Documents stored in Azure Blob with clear structure
- ✅ **Translation History**: Complete audit trail of language processing
- ✅ **Scalable Architecture**: Ready for enterprise-scale document volumes

---

**🚀 Ready to transform your multilingual documents into a unified, searchable knowledge base!**

*This pipeline provides enterprise-grade document processing with the flexibility to adapt to your specific requirements while maintaining high performance and reliability.*
