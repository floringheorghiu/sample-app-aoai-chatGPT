# Admin Dashboard

A standalone Next.js application for managing documents, system prompts, and onboarding configuration.

## Features

- Document upload and processing
- System prompt configuration
- Onboarding configuration management
- Local file system integration
- Python script execution interface

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Python 3.8+ (for script execution)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

The application will automatically redirect to the admin dashboard at `/admin`.

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

## Project Structure

```
src/
├── app/
│   ├── admin/           # Admin dashboard page
│   ├── api/             # API routes
│   │   ├── admin/       # Admin-specific endpoints
│   │   └── health/      # Health check endpoint
│   └── page.tsx         # Root page (redirects to admin)
├── components/
│   ├── admin/           # Admin-specific components
│   └── ui/              # Reusable UI components (shadcn/ui)
├── lib/                 # Utility libraries and services
└── data/                # Local data storage
    ├── config/          # Configuration files
    ├── uploads/         # Uploaded documents
    └── logs/            # Application logs
```

## Configuration

The application uses local JSON files for configuration:

- `src/data/config/app-config.json` - Application settings
- `src/data/config/system-prompt.json` - AI system prompt
- `src/data/config/onboarding-config.json` - Onboarding questions and topics

## Development

This project uses:

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **ESLint** for code linting

## Next Steps

This is the initial project setup. The following features will be implemented in subsequent tasks:

1. Storage abstraction layer
2. Configuration management system
3. Script execution service
4. API endpoints
5. UI components
6. Error handling and logging

## License

This project is part of the Narada admin dashboard integration.