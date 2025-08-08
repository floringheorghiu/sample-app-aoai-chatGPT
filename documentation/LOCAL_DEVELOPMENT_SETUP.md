# Local Development Setup

## Server Configuration
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://127.0.0.1:50505 (Quart server)

## Starting the Servers

### Backend (Port 50505)
```bash
# Activate virtual environment and start backend
source .venv/bin/activate
.venv/bin/python -m quart run --port=50505 --host=127.0.0.1 --reload &
```

### Frontend (Port 5173)
```bash
# Install dependencies and start dev server
cd frontend
npm install
npm run dev &
```

## Environment Setup
- Backend uses `.env` file for configuration (Azure OpenAI, Cosmos DB, etc.)
- Frontend uses Vite for development with hot reload
- Virtual environment `.venv` contains Python dependencies

## Testing the Setup
- Backend health check: `curl -s -I http://127.0.0.1:50505`
- Frontend should be accessible at http://localhost:5173

## Notes
- Backend runs with `--reload` flag for development
- Frontend has hot module replacement enabled
- Both servers run in background with `&` flag