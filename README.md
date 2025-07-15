# AI Vision API

A TypeScript Fastify API that offers:
• Single-image analysis
• **Group analysis of up to 10 images in one call**
• Audio transcription – all powered by OpenAI Vision & Whisper.

## Features

- **Image Analysis**: Analyze single images for concept detection with confidence scores
- **Group Image Analysis**: Send up to 10 images and get a **collection-level** confidence score per concept
- **File Upload Support**: Upload images or audio via multipart form-data
- **Audio Transcription**: Convert audio files to text using OpenAI Whisper
- **RESTful API**: Clean JSON API endpoints
- **TypeScript**: Fully typed with TypeScript for better development experience

## Requirements

- Node.js 18+
- OpenAI API key
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-vision
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

## Usage

### Development
```bash
npm run dev
```

### Production (Docker)
```bash
docker build -t ai-vision .
docker run -p 3000:3000 --env-file .env ai-vision
```

## Deploy to Vercel
The repo includes `vercel.json` for serverless deployment using `@vercel/node`. API endpoints are defined in `api/*.ts` as serverless functions.

1. Set `OPENAI_API_KEY` in Vercel **Project → Settings → Environment Variables**.
2. Import your GitHub repo in Vercel dashboard.
3. Deploy – Vercel handles builds automatically on push.

Post-deploy, test endpoints like `https://your-domain.vercel.app/api/server-status` (should return "Server is running").

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Exposing Your Local Server with ngrok

To make your local development server accessible from the internet, you can use ngrok:

### Prerequisites
1. Create an ngrok account at [dashboard.ngrok.com](https://dashboard.ngrok.com)
2. Get your auth token from the dashboard

### Installation
1. Install ngrok CLI for your operating system:
   - Visit [ngrok.com/download](https://ngrok.com/download) for platform-specific instructions
   - Verify installation: `ngrok help`

2. Connect your account:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

### Usage
1. Start your local server:
   ```bash
   npm start
   ```

2. In a new terminal, expose your server:
   ```bash
   ngrok http 3000
   ```

3. Copy the public URL (e.g., `https://abc123.ngrok.app`) to access your API from anywhere

### Optional: Reserved Domain
For consistent URLs across sessions, you can use a reserved domain:
```bash
ngrok http 3000 --domain your-domain.ngrok.app
```

## API Endpoints

### POST /analyze-image

Analyze an image for specific concepts using base64 encoded image data.

**Request Body:**
```json
{
  "base64Image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "concepts": ["cat", "dog", "person"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cat": 85.3,
    "dog": 12.4,
    "person": 0.0
  }
}
```

**cURL Example:**
```bash
# Encode an image to base64 and send it
base64_img=$(base64 -w 0 path/to/image.jpg)
curl -X POST http://localhost:3000/analyze-image \
  -H "Content-Type: application/json" \
  -d '{"base64Image":"'"$base64_img"'","concepts":["cat","dog","car"]}'
```

### POST /analyze-image-file

Analyze an uploaded image file for specific concepts.

**Request:** Multipart form data
- `file`: Image file (JPEG, PNG, etc.)
- `concepts`: JSON array of concepts to check for

**Response:**
```json
{
  "success": true,
  "data": {
    "cat": 85.3,
    "dog": 12.4,
    "person": 0.0
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/analyze-image-file \
  -F "file=@/full/path/dog.jpg" \
  -F 'concepts=["fire","dog","cat"]'
```

### POST /analyze-images-group

Analyze **multiple** uploaded images (max 10) as a single collection.

**Request:** Multipart form-data
* `file`: Image files (`jpeg`, `png`, `gif`, `webp`) – can appear multiple times
* `concepts`: JSON array of concepts

**Response:**
```json
{
  "success": true,
  "data": {
    "fire": 100,
    "dog": 75.2,
    "cat": 0
  },
  "summary": {
    "total_images_processed": 3,
    "skipped_images": 0
  }
}
```

**cURL Example (two images):**
```bash
curl -X POST http://localhost:3000/analyze-images-group \
  -F "file=@/full/path/dog.jpg" \
  -F "file=@/full/path/fire.jpg" \
  -F 'concepts=["fire","dog","cat"]'
```

### POST /transcribe-audio

Transcribe an uploaded **audio file** to text using OpenAI Whisper.

**Request:** Multipart form-data
* `file`: Audio file (`wav`, `mp3`, `m4a`, etc.) – max 25 MB

**Response:**
```json
{
  "success": true,
  "data": {
    "transcript": "Hello, this is the transcribed text from the audio file."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/transcribe-audio \
  -F "file=@/full/path/audio.wav"
```