#!/usr/bin/env python3
"""
Setup script for Multilingual RAG Pipeline

This script helps you quickly set up the pipeline with all required dependencies
and configuration files.
"""

import os
import sys
import subprocess
from pathlib import Path


def run_command(command, description):
    """Run a command and handle errors."""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Error: {e.stderr}")
        return False


def check_python_version():
    """Check if Python version is compatible."""
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        print("❌ Python 3.8 or higher is required")
        print(f"   Current version: {python_version.major}.{python_version.minor}")
        return False
    print(f"✅ Python {python_version.major}.{python_version.minor} is compatible")
    return True


def install_dependencies():
    """Install required Python packages."""
    print("📦 Installing dependencies...")
    
    # Check if we're in a virtual environment
    in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    
    if not in_venv:
        print("⚠️  Warning: Not in a virtual environment")
        print("   It's recommended to create a virtual environment first:")
        print("   python -m venv multilingual_env")
        print("   source multilingual_env/bin/activate  # On Windows: multilingual_env\\Scripts\\activate")
        response = input("   Continue anyway? (y/N): ")
        if response.lower() != 'y':
            return False
    
    return run_command("pip install -r requirements.txt", "Installing Python packages")


def setup_configuration():
    """Set up configuration files."""
    config_template = Path("multilingual_config.json.template")
    config_file = Path("multilingual_config.json")
    
    if not config_template.exists():
        print("❌ Configuration template not found")
        return False
    
    if config_file.exists():
        print("⚠️  Configuration file already exists")
        response = input("   Overwrite? (y/N): ")
        if response.lower() != 'y':
            return True
    
    try:
        config_template.read_text()  # Test read
        config_file.write_text(config_template.read_text())
        print("✅ Configuration template copied to multilingual_config.json")
        print("📝 Please edit multilingual_config.json with your Azure credentials")
        return True
    except Exception as e:
        print(f"❌ Failed to copy configuration template: {e}")
        return False


def verify_setup():
    """Verify the setup by importing the main module."""
    print("🔍 Verifying setup...")
    try:
        # Try to import the main module
        sys.path.insert(0, str(Path.cwd()))
        from multilingual_ingestion_pipeline import MultilingualRAGPipeline
        print("✅ Pipeline module imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import pipeline module: {e}")
        print("   Some dependencies might be missing")
        return False


def print_next_steps():
    """Print instructions for next steps."""
    print("\n" + "="*60)
    print("🎉 SETUP COMPLETED!")
    print("="*60)
    print("📋 Next steps:")
    print("1. Edit multilingual_config.json with your Azure service credentials")
    print("2. Test the pipeline with a sample document:")
    print("   python multilingual_ingestion_pipeline.py sample.pdf")
    print("3. Or process a directory of documents:")
    print("   python multilingual_ingestion_pipeline.py --batch /path/to/documents")
    print("\n🔧 Required Azure Services:")
    print("   - Azure Translator")
    print("   - Azure Document Intelligence") 
    print("   - Azure Storage Account")
    print("   - Azure Cognitive Search")
    print("   - Azure OpenAI")
    print("\n📚 See README.md for detailed configuration instructions")
    print("="*60)


def main():
    """Main setup function."""
    print("🚀 Multilingual RAG Pipeline Setup")
    print("="*40)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Dependency installation failed")
        sys.exit(1)
    
    # Setup configuration
    if not setup_configuration():
        print("❌ Configuration setup failed")
        sys.exit(1)
    
    # Verify setup
    if not verify_setup():
        print("⚠️  Setup verification failed, but you can try running the pipeline")
    
    # Print next steps
    print_next_steps()


if __name__ == "__main__":
    main()
