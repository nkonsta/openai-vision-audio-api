# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an OpenAI-powered API service built with TypeScript and Fastify that provides image analysis and audio transcription capabilities. The service supports both traditional server deployment and serverless deployment via Vercel.

## Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload using tsx
npm run build           # Compile TypeScript to JavaScript
npm start              # Build and start production server
npm test               # No tests configured (placeholder)
```

## Architecture

### Dual Deployment Model
- **Traditional Server**: Uses Fastify server (`src/server.ts`) for local development
- **Serverless Functions**: Uses Vercel serverless functions (`api/*.ts`) for production deployment

### Core Components

1. **Handler Layer** (`src/handlers/`):
   - `openai-utils.ts`: OpenAI API integration functions
   - `types.ts`: TypeScript interfaces and constants
   - Individual handler files for each endpoint
   - All handlers are exported from `index.ts`

2. **API Endpoints**:
   - `POST /analyze-image`: Base64 image analysis
   - `POST /analyze-image-file`: File upload image analysis
   - `POST /analyze-images-group`: Multi-image analysis (up to 10 images)
   - `POST /transcribe-audio`: Audio transcription via Whisper
   - `GET /server-status`: Health check

3. **Deployment Configuration**:
   - `vercel.json`: Configures serverless functions with 300s timeout and 1024MB memory
   - URL rewrites route clean paths to serverless functions

### Key Technical Details

- **OpenAI Model**: Uses `o4-mini` model for image analysis
- **File Handling**: Supports up to 50MB file uploads via `@fastify/multipart`
- **Image Types**: Supports JPEG, PNG, GIF, WebP formats
- **CORS**: Enabled for all origins
- **Module System**: Uses ES modules with `.js` extensions in imports

### Environment Variables

Required environment variables:
- `OPENAI_API_KEY`: OpenAI API key for vision and audio APIs
- `PORT`: Server port (defaults to 3000)

### Error Handling

All endpoints follow consistent error response format:
```json
{
  "success": false,
  "error": "Error message"
}
```

### Development Notes

- The project uses ES modules (`"type": "module"` in package.json)
- Import statements must include `.js` extensions due to module resolution
- TypeScript compiles to ES2022 targeting ESNext modules
- The same handler code is used for both Fastify server and Vercel serverless functions