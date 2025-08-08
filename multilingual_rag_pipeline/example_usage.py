#!/usr/bin/env python3
"""
Example Usage of Multilingual RAG Pipeline

This script demonstrates how to use the multilingual document ingestion pipeline
in different scenarios.
"""

import os
import logging
from pathlib import Path
from multilingual_ingestion_pipeline import MultilingualRAGPipeline


def example_single_document():
    """Example: Process a single document."""
    print("🔥 Example 1: Single Document Processing")
    print("=" * 50)
    
    try:
        # Initialize pipeline with configuration
        pipeline = MultilingualRAGPipeline("multilingual_config.json")
        
        # Process a single document (replace with your file)
        document_path = "sample_document.pdf"  # Change this to your file
        
        if not Path(document_path).exists():
            print(f"⚠️ Sample document not found: {document_path}")
            print("   Please provide a valid document path")
            return
        
        result = pipeline.ingest_documents([document_path])
        
        # Print results
        print(f"✅ Processing completed!")
        print(f"📄 Documents processed: {result.processed_files}/{result.total_files}")
        print(f"🌐 Documents translated: {result.translated_files}")
        print(f"📝 Total chunks created: {result.total_chunks}")
        print(f"⏱️ Processing time: {result.total_processing_time:.2f}s")
        
    except Exception as e:
        print(f"❌ Error: {e}")


def example_batch_processing():
    """Example: Process multiple documents from a directory."""
    print("\n🔥 Example 2: Batch Document Processing")
    print("=" * 50)
    
    try:
        pipeline = MultilingualRAGPipeline("multilingual_config.json")
        
        # Process all supported documents in a directory
        documents_dir = "./sample_documents"  # Change this to your directory
        
        if not Path(documents_dir).exists():
            print(f"⚠️ Sample directory not found: {documents_dir}")
            print("   Please create a directory with sample documents")
            return
        
        # Find supported files
        supported_formats = pipeline.config.processing_settings['supported_formats']
        files_to_process = []
        
        for fmt in supported_formats:
            files_to_process.extend(Path(documents_dir).glob(f"*.{fmt}"))
        
        if not files_to_process:
            print(f"⚠️ No supported files found in {documents_dir}")
            print(f"   Supported formats: {', '.join(supported_formats)}")
            return
        
        # Process all files
        file_paths = [str(f) for f in files_to_process]
        result = pipeline.ingest_documents(file_paths)
        
        # Print detailed results
        print(f"✅ Batch processing completed!")
        print(f"📄 Total files: {result.total_files}")
        print(f"✅ Successfully processed: {result.processed_files}")
        print(f"❌ Failed: {result.failed_files}")
        print(f"🌐 Translated: {result.translated_files}")
        print(f"📝 Total chunks: {result.total_chunks}")
        print(f"⏱️ Total time: {result.total_processing_time:.2f}s")
        
        # Show per-document results
        print("\n📋 Document Details:")
        for doc_result in result.results:
            status = "✅" if doc_result.success else "❌"
            lang_info = f"{doc_result.detected_language}"
            if doc_result.translated:
                lang_info += "→en 🌐"
            
            print(f"  {status} {Path(doc_result.original_file).name}")
            print(f"      Language: {lang_info}")
            print(f"      Chunks: {doc_result.chunks_count}")
            print(f"      Time: {doc_result.processing_time:.1f}s")
            
            if doc_result.error_message:
                print(f"      Error: {doc_result.error_message}")
        
    except Exception as e:
        print(f"❌ Error: {e}")


def example_custom_configuration():
    """Example: Using custom processing settings."""
    print("\n🔥 Example 3: Custom Configuration")
    print("=" * 50)
    
    try:
        # Initialize with custom settings
        pipeline = MultilingualRAGPipeline("multilingual_config.json")
        
        # Show current configuration
        settings = pipeline.config.processing_settings
        print("📊 Current Processing Settings:")
        print(f"   Chunk size: {settings['chunk_size']} tokens")
        print(f"   Chunk overlap: {settings['chunk_overlap']} tokens")
        print(f"   Min chunk size: {settings['min_chunk_size']} tokens")
        print(f"   Concurrent files: {settings['max_concurrent_files']}")
        print(f"   Translation enabled: {settings['translation_enabled']}")
        print(f"   Supported formats: {', '.join(settings['supported_formats'])}")
        
        # Example of how you might modify settings programmatically
        # (Note: This would require extending the pipeline)
        print("\n💡 To customize settings, edit multilingual_config.json")
        print("   Example modifications:")
        print('   - "chunk_size": 1500  # Larger chunks')
        print('   - "max_concurrent_files": 10  # More parallelism')
        print('   - "translation_enabled": false  # Disable translation')
        
    except Exception as e:
        print(f"❌ Error: {e}")


def example_error_handling():
    """Example: Handling errors and edge cases."""
    print("\n🔥 Example 4: Error Handling")
    print("=" * 50)
    
    try:
        pipeline = MultilingualRAGPipeline("multilingual_config.json")
        
        # Test with non-existent file
        fake_files = ["nonexistent.pdf", "another_fake.docx"]
        
        print("🧪 Testing with non-existent files...")
        result = pipeline.ingest_documents(fake_files)
        
        print(f"📊 Results:")
        print(f"   Total files: {result.total_files}")
        print(f"   Successful: {result.processed_files}")
        print(f"   Failed: {result.failed_files}")
        
        # Show error details
        for doc_result in result.results:
            if not doc_result.success:
                print(f"   ❌ {doc_result.original_file}: {doc_result.error_message}")
        
    except Exception as e:
        print(f"❌ Pipeline initialization error: {e}")
        print("   Check your configuration file and Azure credentials")


def main():
    """Run all examples."""
    print("🌐 Multilingual RAG Pipeline - Usage Examples")
    print("=" * 60)
    
    # Enable logging for examples
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    # Run examples
    example_single_document()
    example_batch_processing()
    example_custom_configuration()
    example_error_handling()
    
    print("\n" + "=" * 60)
    print("🎉 Examples completed!")
    print("📚 For more information, see README.md")
    print("🔧 To run the pipeline: python multilingual_ingestion_pipeline.py")


if __name__ == "__main__":
    main()
