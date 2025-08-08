#!/usr/bin/env python3
"""
Multilingual Document Ingestion Pipeline for RAG/Search Systems

This orchestrated pipeline automatically:
1. Accepts multiple document formats (PDF, DOCX, TXT, etc.)
2. Stores documents in Azure Blob Storage
3. Extracts text from documents using Document Intelligence
4. Detects language and translates to English using Azure Translator
5. Chunks translated content and generates embeddings
6. Indexes documents in Azure Cognitive Search

The pipeline integrates:
- Azure Translator API for translation
- Azure Document Intelligence for text extraction
- Azure Cognitive Search for indexing
- Azure Blob Storage for document storage
- OpenAI embeddings for vector search

Usage:
    from multilingual_ingestion_pipeline import MultilingualRAGPipeline
    
    pipeline = MultilingualRAGPipeline()
    result = pipeline.ingest_documents(['doc1.pdf', 'doc2.docx', 'doc3.txt'])
"""

import os
import sys
import json
import logging
import tempfile
import time
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed

# Import Azure translation pipeline
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'azure_pipeline'))
from azure_translator import AzurePDFPipeline, AzureTranslatorConfig, PDFProcessingResult

# Import existing RAG pipeline components
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from data_utils import (
    chunk_content, ChunkingResult, Document, TOKEN_ESTIMATOR,
    get_embedding, FILE_FORMAT_DICT, UnsupportedFormatError
)
from data_preparation import (
    create_or_update_search_index, SUPPORTED_LANGUAGE_CODES
)

# Azure services
try:
    from azure.storage.blob import BlobServiceClient, ContainerClient
    from azure.ai.documentintelligence import DocumentIntelligenceClient
    from azure.core.credentials import AzureKeyCredential
    from azure.identity import DefaultAzureCredential
    from azure.search.documents import SearchClient
    from azure.search.documents.indexes import SearchIndexClient
    AZURE_LIBS_AVAILABLE = True
except ImportError:
    AZURE_LIBS_AVAILABLE = False

# Language detection
try:
    from langdetect import detect, DetectorFactory
    from langdetect.lang_detect_exception import LangDetectException
    DetectorFactory.seed = 0
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False

# PDF processing
try:
    import PyPDF2
    import pdfplumber
    PDF_LIBS_AVAILABLE = True
except ImportError:
    PDF_LIBS_AVAILABLE = False

# HTTP requests
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class DocumentProcessingResult:
    """Result of document processing operation."""
    success: bool
    original_file: str
    file_format: str
    detected_language: str
    translated: bool = False
    blob_url: Optional[str] = None
    chunks_count: int = 0
    error_message: Optional[str] = None
    translation_stats: Optional[Dict[str, Any]] = None
    processing_time: float = 0.0


@dataclass
class PipelineResult:
    """Complete pipeline execution result."""
    success: bool
    total_files: int
    processed_files: int
    failed_files: int
    translated_files: int
    total_chunks: int
    results: List[DocumentProcessingResult]
    error_message: Optional[str] = None
    total_processing_time: float = 0.0


class MultilingualRAGConfig:
    """Configuration manager for the multilingual RAG pipeline."""
    
    def __init__(self, config_file: str = "multilingual_config.json"):
        self.config_file = config_file
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from JSON file."""
        config_path = Path(self.config_file)
        
        if not config_path.exists():
            # Create default configuration
            default_config = self._create_default_config()
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2)
            raise FileNotFoundError(
                f"Configuration file '{self.config_file}' created with defaults. "
                f"Please fill in your Azure credentials and settings."
            )
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in configuration file: {e}")
    
    def _create_default_config(self) -> Dict[str, Any]:
        """Create default configuration template."""
        return {
            "azure_translator": {
                "endpoint": "https://your-translator-name.cognitiveservices.azure.com/",
                "subscription_key": "your-translator-key-here",
                "region": "your-region-here",
                "api_version": "3.0"
            },
            "azure_storage": {
                "account_name": "your-storage-account",
                "account_key": "your-storage-key",
                "container_name": "documents"
            },
            "azure_document_intelligence": {
                "endpoint": "https://your-doc-intel-name.cognitiveservices.azure.com/",
                "key": "your-doc-intel-key"
            },
            "azure_search": {
                "service_name": "your-search-service",
                "admin_key": "your-search-admin-key",
                "index_name": "multilingual-documents"
            },
            "azure_openai": {
                "endpoint": "https://your-openai-name.openai.azure.com/",
                "key": "your-openai-key",
                "embedding_deployment": "text-embedding-ada-002"
            },
            "processing_settings": {
                "chunk_size": 1000,
                "chunk_overlap": 100,
                "min_chunk_size": 50,
                "max_concurrent_files": 5,
                "translation_enabled": True,
                "force_translation": False,
                "supported_formats": ["pdf", "docx", "txt", "md", "html"]
            }
        }
    
    @property
    def azure_translator(self) -> Dict[str, str]:
        return self.config['azure_translator']
    
    @property
    def azure_storage(self) -> Dict[str, str]:
        return self.config['azure_storage']
    
    @property
    def azure_document_intelligence(self) -> Dict[str, str]:
        return self.config['azure_document_intelligence']
    
    @property
    def azure_search(self) -> Dict[str, str]:
        return self.config['azure_search']
    
    @property
    def azure_openai(self) -> Dict[str, str]:
        return self.config['azure_openai']
    
    @property
    def processing_settings(self) -> Dict[str, Any]:
        return self.config['processing_settings']


class DocumentProcessor:
    """Handles document text extraction and format conversion."""
    
    def __init__(self, config: MultilingualRAGConfig):
        self.config = config
        self.doc_intelligence_client = None
        
        if AZURE_LIBS_AVAILABLE:
            doc_intel_config = config.azure_document_intelligence
            self.doc_intelligence_client = DocumentIntelligenceClient(
                endpoint=doc_intel_config['endpoint'],
                credential=AzureKeyCredential(doc_intel_config['key'])
            )
    
    def extract_text(self, file_path: str, file_format: str) -> str:
        """
        Extract text from document using appropriate method.
        
        Args:
            file_path: Path to the document
            file_format: Format of the document
            
        Returns:
            Extracted text content
        """
        try:
            if file_format == 'pdf':
                return self._extract_from_pdf(file_path)
            elif file_format in ['docx', 'pptx']:
                return self._extract_with_document_intelligence(file_path)
            elif file_format in ['txt', 'md']:
                return self._extract_from_text_file(file_path)
            elif file_format == 'html':
                return self._extract_from_html(file_path)
            else:
                raise UnsupportedFormatError(f"Unsupported format: {file_format}")
                
        except Exception as e:
            logger.error(f"Text extraction failed for {file_path}: {e}")
            raise
    
    def _extract_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF using multiple methods."""
        if not PDF_LIBS_AVAILABLE:
            return self._extract_with_document_intelligence(pdf_path)
        
        # Try pdfplumber first
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text_content = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
                
                text = '\n'.join(text_content) if text_content else ""
                
                # If insufficient text, try Document Intelligence
                if not text or len(text.strip()) < 100:
                    return self._extract_with_document_intelligence(pdf_path)
                
                return text
        except:
            # Fallback to Document Intelligence
            return self._extract_with_document_intelligence(pdf_path)
    
    def _extract_with_document_intelligence(self, file_path: str) -> str:
        """Extract text using Azure Document Intelligence."""
        if not self.doc_intelligence_client:
            raise Exception("Document Intelligence client not available")
        
        with open(file_path, 'rb') as f:
            poller = self.doc_intelligence_client.begin_analyze_document(
                "prebuilt-read", 
                analyze_request=f,
                content_type="application/octet-stream"
            )
        
        result = poller.result()
        
        if result.content:
            return result.content
        else:
            raise Exception("No text extracted by Document Intelligence")
    
    def _extract_from_text_file(self, file_path: str) -> str:
        """Extract text from plain text files."""
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    
    def _extract_from_html(self, file_path: str) -> str:
        """Extract text from HTML files."""
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')
            return soup.get_text()
        except ImportError:
            # Fallback: return raw HTML
            return content


class TranslationService:
    """Handles document translation using Azure Translator."""
    
    def __init__(self, config: MultilingualRAGConfig):
        self.config = config
        
        # Create Azure Translator config for the existing pipeline
        translator_config = {
            "azure_translator": config.azure_translator,
            "settings": {
                "chunk_size": 5000,
                "rate_limit_delay": 0.1,
                "timeout": 30,
                "max_retries": 3
            }
        }
        
        # Save temporary config for Azure pipeline
        self.temp_config_file = tempfile.NamedTemporaryFile(
            mode='w', suffix='.json', delete=False
        )
        json.dump(translator_config, self.temp_config_file, indent=2)
        self.temp_config_file.close()
        
        # Initialize Azure translation pipeline
        from azure_translator import AzureTranslator, AzureTranslatorConfig
        self.translator_config = AzureTranslatorConfig(self.temp_config_file.name)
        self.translator = AzureTranslator(self.translator_config)
    
    def __del__(self):
        """Clean up temporary config file."""
        try:
            os.unlink(self.temp_config_file.name)
        except:
            pass
    
    def detect_and_translate(self, text: str) -> Tuple[str, str, Optional[str], Optional[Dict]]:
        """
        Detect language and translate text if needed.
        
        Args:
            text: Text content to process
            
        Returns:
            Tuple of (detected_language, final_text, translated_text, translation_stats)
        """
        try:
            # Detect language
            detected_lang = self.translator.detect_language(text)
            
            # Check if translation is needed
            translation_enabled = self.config.processing_settings.get('translation_enabled', True)
            force_translation = self.config.processing_settings.get('force_translation', False)
            
            if not translation_enabled:
                return detected_lang, text, None, None
            
            if detected_lang == 'en' and not force_translation:
                return detected_lang, text, None, None
            
            # Translate to English
            translated_text, stats = self.translator.translate_text(text, target_language='en')
            
            return detected_lang, translated_text, translated_text, stats
            
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return 'unknown', text, None, None


class BlobStorageManager:
    """Manages document storage in Azure Blob Storage."""
    
    def __init__(self, config: MultilingualRAGConfig):
        self.config = config
        self.blob_service_client = None
        self.container_client = None
        
        if AZURE_LIBS_AVAILABLE:
            storage_config = config.azure_storage
            self.blob_service_client = BlobServiceClient(
                account_url=f"https://{storage_config['account_name']}.blob.core.windows.net",
                credential=storage_config['account_key']
            )
            self.container_client = self.blob_service_client.get_container_client(
                storage_config['container_name']
            )
            
            # Create container if it doesn't exist
            try:
                self.container_client.create_container()
            except Exception:
                pass  # Container might already exist
    
    def upload_document(self, file_path: str, blob_name: str = None) -> str:
        """
        Upload document to blob storage.
        
        Args:
            file_path: Path to local file
            blob_name: Name for the blob (optional)
            
        Returns:
            Blob URL
        """
        if not self.container_client:
            raise Exception("Blob storage client not available")
        
        if not blob_name:
            blob_name = f"documents/{uuid.uuid4()}-{Path(file_path).name}"
        
        with open(file_path, 'rb') as data:
            self.container_client.upload_blob(
                name=blob_name,
                data=data,
                overwrite=True
            )
        
        return f"{self.container_client.url}/{blob_name}"
    
    def upload_translated_content(self, content: str, original_filename: str, 
                                 detected_language: str) -> str:
        """
        Upload translated text content to blob storage.
        
        Args:
            content: Translated text content
            original_filename: Original filename
            detected_language: Detected source language
            
        Returns:
            Blob URL for translated content
        """
        if not self.container_client:
            raise Exception("Blob storage client not available")
        
        blob_name = f"translated/{detected_language}-to-en/{uuid.uuid4()}-{original_filename}.txt"
        
        self.container_client.upload_blob(
            name=blob_name,
            data=content.encode('utf-8'),
            overwrite=True
        )
        
        return f"{self.container_client.url}/{blob_name}"


class SearchIndexManager:
    """Manages Azure Cognitive Search index operations."""
    
    def __init__(self, config: MultilingualRAGConfig):
        self.config = config
        self.search_client = None
        self.index_client = None
        
        if AZURE_LIBS_AVAILABLE:
            search_config = config.azure_search
            self.search_client = SearchClient(
                endpoint=f"https://{search_config['service_name']}.search.windows.net",
                index_name=search_config['index_name'],
                credential=AzureKeyCredential(search_config['admin_key'])
            )
            self.index_client = SearchIndexClient(
                endpoint=f"https://{search_config['service_name']}.search.windows.net",
                credential=AzureKeyCredential(search_config['admin_key'])
            )
    
    def ensure_index_exists(self):
        """Create search index if it doesn't exist."""
        if not self.index_client:
            raise Exception("Search index client not available")
        
        search_config = self.config.azure_search
        index_name = search_config['index_name']
        
        try:
            # Use existing function from data_preparation.py
            create_or_update_search_index(
                service_name=search_config['service_name'],
                index_name=index_name,
                admin_key=search_config['admin_key'],
                language='en'  # Always English since we translate
            )
        except Exception as e:
            logger.error(f"Failed to create search index: {e}")
            raise
    
    def index_chunks(self, chunks: List[Document]) -> int:
        """
        Index document chunks in the search index.
        
        Args:
            chunks: List of document chunks to index
            
        Returns:
            Number of successfully indexed chunks
        """
        if not self.search_client or not chunks:
            return 0
        
        documents_to_upload = []
        
        for i, chunk in enumerate(chunks):
            doc_dict = {
                "@search.action": "upload",
                "id": str(uuid.uuid4()),
                "content": chunk.content,
                "title": chunk.title or "Untitled",
                "filepath": chunk.metadata.get('filepath', '') if chunk.metadata else '',
                "url": chunk.url or ''
            }
            
            # Add vector embeddings if available
            if hasattr(chunk, 'contentVector') and chunk.contentVector:
                doc_dict["contentVector"] = chunk.contentVector
            
            documents_to_upload.append(doc_dict)
        
        try:
            results = self.search_client.upload_documents(documents=documents_to_upload)
            successful = sum(1 for result in results if result.succeeded)
            
            if successful < len(documents_to_upload):
                failed = len(documents_to_upload) - successful
                logger.warning(f"Failed to index {failed} out of {len(documents_to_upload)} chunks")
            
            return successful
            
        except Exception as e:
            logger.error(f"Failed to index chunks: {e}")
            return 0


class MultilingualRAGPipeline:
    """
    Main orchestrator for the Multilingual Document Ingestion Pipeline.
    
    This pipeline automatically processes multilingual documents and integrates
    them into a RAG/search system by:
    1. Uploading documents to blob storage
    2. Extracting text content
    3. Detecting language and translating to English
    4. Chunking content and generating embeddings
    5. Indexing in Azure Cognitive Search
    """
    
    def __init__(self, config_file: str = "multilingual_config.json"):
        self.config = MultilingualRAGConfig(config_file)
        
        # Initialize components
        self.document_processor = DocumentProcessor(self.config)
        self.translation_service = TranslationService(self.config)
        self.blob_manager = BlobStorageManager(self.config)
        self.search_manager = SearchIndexManager(self.config)
        
        # Ensure search index exists
        self.search_manager.ensure_index_exists()
        
        logger.info("Multilingual RAG Pipeline initialized successfully")
    
    def ingest_documents(self, file_paths: List[str], 
                        output_dir: str = None) -> PipelineResult:
        """
        Ingest multiple documents into the RAG system.
        
        Args:
            file_paths: List of document file paths to process
            output_dir: Optional directory to save processed files
            
        Returns:
            PipelineResult with processing statistics and individual results
        """
        start_time = time.time()
        results = []
        total_chunks = 0
        
        logger.info(f"🚀 Starting multilingual document ingestion for {len(file_paths)} files")
        
        # Process files concurrently
        max_workers = self.config.processing_settings.get('max_concurrent_files', 5)
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all files for processing
            future_to_file = {
                executor.submit(self._process_single_document, file_path, output_dir): file_path
                for file_path in file_paths
            }
            
            # Collect results
            for future in as_completed(future_to_file):
                file_path = future_to_file[future]
                try:
                    result = future.result()
                    results.append(result)
                    total_chunks += result.chunks_count
                    
                    status = "✅" if result.success else "❌"
                    translation = "🌐" if result.translated else "📄"
                    logger.info(f"{status} {translation} {result.original_file} - {result.chunks_count} chunks")
                    
                except Exception as e:
                    error_result = DocumentProcessingResult(
                        success=False,
                        original_file=file_path,
                        file_format='unknown',
                        detected_language='unknown',
                        error_message=str(e)
                    )
                    results.append(error_result)
                    logger.error(f"❌ Failed to process {file_path}: {e}")
        
        # Calculate statistics
        processed_files = sum(1 for r in results if r.success)
        failed_files = len(results) - processed_files
        translated_files = sum(1 for r in results if r.translated)
        total_time = time.time() - start_time
        
        pipeline_result = PipelineResult(
            success=failed_files == 0,
            total_files=len(file_paths),
            processed_files=processed_files,
            failed_files=failed_files,
            translated_files=translated_files,
            total_chunks=total_chunks,
            results=results,
            total_processing_time=total_time
        )
        
        # Print summary
        self._print_pipeline_summary(pipeline_result)
        
        return pipeline_result
    
    def _process_single_document(self, file_path: str, 
                               output_dir: str = None) -> DocumentProcessingResult:
        """
        Process a single document through the complete pipeline.
        
        Args:
            file_path: Path to document file
            output_dir: Optional output directory
            
        Returns:
            DocumentProcessingResult with processing details
        """
        start_time = time.time()
        file_path = Path(file_path)
        
        try:
            # Determine file format
            file_extension = file_path.suffix.lower().lstrip('.')
            file_format = FILE_FORMAT_DICT.get(file_extension, file_extension)
            
            # Check if format is supported
            supported_formats = self.config.processing_settings.get('supported_formats', [])
            if file_format not in supported_formats:
                raise UnsupportedFormatError(f"Unsupported format: {file_format}")
            
            logger.debug(f"Processing {file_path} as {file_format}")
            
            # Step 1: Upload original document to blob storage
            blob_url = self.blob_manager.upload_document(str(file_path))
            
            # Step 2: Extract text content
            text_content = self.document_processor.extract_text(str(file_path), file_format)
            
            if not text_content or len(text_content.strip()) < 50:
                raise Exception("Insufficient text content extracted")
            
            # Step 3: Language detection and translation
            detected_lang, final_text, translated_text, translation_stats = \
                self.translation_service.detect_and_translate(text_content)
            
            translated = translated_text is not None
            
            # Step 4: Upload translated content to blob storage (if translated)
            if translated:
                self.blob_manager.upload_translated_content(
                    final_text, file_path.name, detected_lang
                )
            
            # Step 5: Chunk content and generate embeddings
            chunks = self._chunk_and_embed_content(
                final_text, 
                file_path.name, 
                blob_url,
                file_format
            )
            
            # Step 6: Index chunks in search
            indexed_chunks = self.search_manager.index_chunks(chunks)
            
            processing_time = time.time() - start_time
            
            return DocumentProcessingResult(
                success=True,
                original_file=str(file_path),
                file_format=file_format,
                detected_language=detected_lang,
                translated=translated,
                blob_url=blob_url,
                chunks_count=indexed_chunks,
                translation_stats=translation_stats,
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Document processing failed for {file_path}: {e}")
            
            return DocumentProcessingResult(
                success=False,
                original_file=str(file_path),
                file_format=file_format if 'file_format' in locals() else 'unknown',
                detected_language='unknown',
                error_message=str(e),
                processing_time=processing_time
            )
    
    def _chunk_and_embed_content(self, content: str, filename: str, 
                               url: str, file_format: str) -> List[Document]:
        """
        Chunk content and generate embeddings.
        
        Args:
            content: Text content to chunk
            filename: Original filename
            url: Blob URL
            file_format: Document format
            
        Returns:
            List of Document chunks with embeddings
        """
        processing_settings = self.config.processing_settings
        
        try:
            # Get Azure credential for embeddings
            azure_credential = DefaultAzureCredential()
            
            # Prepare embedding endpoint
            openai_config = self.config.azure_openai
            embedding_endpoint = f"{openai_config['endpoint']}/openai/deployments/{openai_config['embedding_deployment']}/embeddings?api-version=2023-12-01-preview"
            
            # Chunk content
            chunking_result = chunk_content(
                content=content,
                file_name=filename,
                url=url,
                ignore_errors=False,
                num_tokens=processing_settings.get('chunk_size', 1000),
                min_chunk_size=processing_settings.get('min_chunk_size', 50),
                token_overlap=processing_settings.get('chunk_overlap', 100),
                add_embeddings=True,
                azure_credential=azure_credential,
                embedding_endpoint=embedding_endpoint
            )
            
            return chunking_result.chunks
            
        except Exception as e:
            logger.error(f"Chunking and embedding failed: {e}")
            # Return simple chunks without embeddings as fallback
            return self._create_simple_chunks(content, filename, url)
    
    def _create_simple_chunks(self, content: str, filename: str, url: str) -> List[Document]:
        """Create simple chunks without embeddings as fallback."""
        chunk_size = self.config.processing_settings.get('chunk_size', 1000)
        overlap = self.config.processing_settings.get('chunk_overlap', 100)
        
        chunks = []
        words = content.split()
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            chunk_text = ' '.join(chunk_words)
            
            if len(chunk_text.strip()) >= self.config.processing_settings.get('min_chunk_size', 50):
                chunks.append(Document(
                    content=chunk_text,
                    title=f"{filename} (chunk {len(chunks) + 1})",
                    url=url
                ))
        
        return chunks
    
    def _print_pipeline_summary(self, result: PipelineResult):
        """Print pipeline execution summary."""
        print("\n" + "="*60)
        print("🎉 MULTILINGUAL RAG PIPELINE SUMMARY")
        print("="*60)
        print(f"📊 Total files processed: {result.total_files}")
        print(f"✅ Successfully processed: {result.processed_files}")
        print(f"❌ Failed: {result.failed_files}")
        print(f"🌐 Translated files: {result.translated_files}")
        print(f"📄 Total chunks indexed: {result.total_chunks}")
        print(f"⏱️ Total processing time: {result.total_processing_time:.2f}s")
        print(f"📈 Success rate: {(result.processed_files/result.total_files*100):.1f}%")
        
        if result.translated_files > 0:
            print(f"🔥 Translation rate: {(result.translated_files/result.processed_files*100):.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for doc_result in result.results:
            status = "✅" if doc_result.success else "❌"
            translation = f"🌐 {doc_result.detected_language}→en" if doc_result.translated else f"📄 {doc_result.detected_language}"
            chunks = f"📄 {doc_result.chunks_count} chunks" if doc_result.success else "❌ No chunks"
            time_str = f"⏱️ {doc_result.processing_time:.1f}s"
            
            print(f"  {status} {Path(doc_result.original_file).name}")
            print(f"      {translation} | {chunks} | {time_str}")
            if doc_result.error_message:
                print(f"      ❌ Error: {doc_result.error_message}")
        
        print("="*60)


def main():
    """CLI interface for the multilingual pipeline."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Multilingual Document Ingestion Pipeline for RAG Systems",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python multilingual_ingestion_pipeline.py doc1.pdf doc2.docx doc3.txt
  python multilingual_ingestion_pipeline.py --batch /path/to/documents
  python multilingual_ingestion_pipeline.py doc.pdf --config my_config.json
        """
    )
    
    # Input options
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("files", nargs="*", help="Document files to process")
    group.add_argument("--batch", help="Process all supported files in directory")
    
    # Configuration
    parser.add_argument("--config", default="multilingual_config.json", 
                       help="Configuration file path")
    parser.add_argument("--output-dir", help="Output directory for processed files")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    
    args = parser.parse_args()
    
    # Setup logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format='%(levelname)s: %(message)s')
    
    try:
        # Initialize pipeline
        pipeline = MultilingualRAGPipeline(args.config)
        
        # Determine files to process
        if args.batch:
            batch_path = Path(args.batch)
            if not batch_path.exists():
                print(f"❌ Directory not found: {args.batch}")
                sys.exit(1)
            
            supported_formats = pipeline.config.processing_settings['supported_formats']
            file_patterns = [f"*.{fmt}" for fmt in supported_formats]
            
            files = []
            for pattern in file_patterns:
                files.extend(batch_path.glob(pattern))
            
            if not files:
                print(f"❌ No supported files found in {args.batch}")
                print(f"Supported formats: {', '.join(supported_formats)}")
                sys.exit(1)
            
            file_paths = [str(f) for f in files]
        else:
            file_paths = args.files or []
            if not file_paths:
                parser.error("No files specified")
        
        # Validate files exist
        for file_path in file_paths:
            if not Path(file_path).exists():
                print(f"❌ File not found: {file_path}")
                sys.exit(1)
        
        # Process documents
        print(f"🚀 Starting Multilingual RAG Pipeline")
        print(f"📁 Files to process: {len(file_paths)}")
        if args.output_dir:
            print(f"📂 Output directory: {args.output_dir}")
        
        result = pipeline.ingest_documents(file_paths, args.output_dir)
        
        if result.success:
            print("\n🎉 Pipeline completed successfully!")
            sys.exit(0)
        else:
            print(f"\n⚠️ Pipeline completed with {result.failed_files} failures")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Pipeline interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
