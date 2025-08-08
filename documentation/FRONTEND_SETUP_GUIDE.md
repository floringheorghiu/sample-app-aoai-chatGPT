# Narada AI Assistant - Frontend Development Setup Guide

This guide will help you set up the Narada AI Assistant frontend development environment on a new computer.

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software
1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

2. **Python** (version 3.8 or higher)
   - Download from: https://python.org/
   - Verify installation: `python --version` or `python3 --version`

3. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

### Optional but Recommended
- **Yarn** package manager: `npm install -g yarn`
- **VS Code** or your preferred code editor

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/floringheorghiu/sample-app-aoai-chatGPT.git
cd sample-app-aoai-chatGPT
```

### 2. Environment Configuration

Copy the environment file and configure it:

```bash
# Copy the environment template
cp .env .env.local

# Edit the .env.local file with your specific configuration
# (See Environment Variables section below)
```

### 3. Backend Setup (Required for Frontend Development)

The frontend requires the backend API to be running. Set up the Python backend:

```bash
# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend

# Install Node.js dependencies
npm install
# OR if using yarn:
yarn install
```

### 5. Start the Development Servers

You need to run both the backend and frontend servers:

#### Terminal 1 - Backend Server
```bash
# From the root directory, with virtual environment activated
python app.py
```
The backend will start on `http://127.0.0.1:50505`

#### Terminal 2 - Frontend Server
```bash
# From the frontend directory
npm run dev
# OR if using yarn:
yarn dev
```
The frontend will start on `http://localhost:5173`

## Environment Variables

The `.env` file contains sensitive configuration. Here are the key variables you need:

### Core Azure OpenAI Configuration (Required)
```env
AZURE_OPENAI_RESOURCE=your-openai-resource-name
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-openai-api-key
AZURE_OPENAI_MODEL=gpt-4o
AZURE_OPENAI_MODEL_NAME=gpt-4o
```

### Azure AI Search Configuration (Required for RAG)
```env
AZURE_SEARCH_SERVICE=your-search-service
AZURE_SEARCH_INDEX=your-search-index
AZURE_SEARCH_KEY=your-search-key
```

### Chat History (Cosmos DB)
```env
AZURE_COSMOSDB_ACCOUNT=your-cosmosdb-account
AZURE_COSMOSDB_DATABASE=db_conversation_history
AZURE_COSMOSDB_CONVERSATIONS_CONTAINER=conversations
AZURE_COSMOSDB_ACCOUNT_KEY=your-cosmosdb-key
```

### UI Customization
```env
UI_TITLE=Narada AI Assistant
UI_CHAT_TITLE=Narada AI Assistant
UI_CHAT_DESCRIPTION=Ask questions about our organization and services
```

## Common Issues and Solutions

### Issue 1: "Module not found" errors
**Solution:** Ensure all dependencies are installed:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue 2: Backend connection errors
**Solution:** 
- Verify the backend is running on port 50505
- Check that the proxy configuration in `vite.config.ts` is correct
- Ensure your `.env` file has valid Azure credentials

### Issue 3: Python virtual environment issues
**Solution:**
```bash
# Deactivate current environment
deactivate

# Remove and recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Issue 4: Port conflicts
**Solution:**
- Frontend default port: 5173 (can be changed in vite.config.ts)
- Backend default port: 50505 (can be changed in app.py)
- Make sure these ports are not in use by other applications

### Issue 5: CORS errors
**Solution:** The backend should handle CORS automatically, but if you encounter issues:
- Ensure the backend is running before starting the frontend
- Check that the proxy configuration in `vite.config.ts` matches your backend URL

## Development Workflow

### Available Scripts (Frontend)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Check code quality
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
```

### Available Scripts (Backend)
```bash
python app.py        # Start Flask development server
```

## Project Structure

```
sample-app-aoai-chatGPT/
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── api/            # API client code
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── backend/                 # Python Flask backend (if separate)
├── static/                 # Built frontend files
├── app.py                  # Main Flask application
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables
└── README.md
```

## Testing the Setup

Once both servers are running:

1. Open your browser to `http://localhost:5173`
2. You should see the Narada AI Assistant interface
3. Try sending a test message to verify the backend connection
4. Check the browser console and terminal outputs for any errors

## Getting Help

If you encounter issues:

1. **Check the terminal outputs** for error messages
2. **Verify environment variables** are correctly set
3. **Ensure all dependencies** are installed
4. **Check port availability** (5173 for frontend, 50505 for backend)
5. **Review the browser console** for frontend errors

## Additional Notes

- The frontend uses **Vite** as the build tool and development server
- The project uses **TypeScript** and **React 18**
- **Tailwind CSS** is used for styling
- The backend proxy is configured in `vite.config.ts`
- Hot reload is enabled for both frontend and backend development

## Security Notes

- Never commit the `.env` file with real credentials
- Use `.env.local` for local development
- Ensure your Azure credentials have appropriate permissions
- The `AUTH_ENABLED=false` setting is for development only

---

**Need additional help?** Contact the development team or check the project's GitHub issues.