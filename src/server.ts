import Fastify from 'fastify';
import dotenv from 'dotenv';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { 
  analyzeImageHandler, 
  analyzeImageFileHandler, 
  transcribeAudioHandler, 
  analyzeImagesGroupHandler, 
  serverStatusHandler,
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  ErrorResponse,
  ALLOWED_IMAGE_MIME_TYPES
} from './handlers/index';

dotenv.config();

const fastify = Fastify({ logger: true });
fastify.register(cors, {
  origin: true
});
fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});
const PORT = Number(process.env.PORT) || 3000;

// POST /analyze-image endpoint
fastify.post<{
  Body: AnalyzeImageRequest;
  Reply: AnalyzeImageResponse | ErrorResponse;
}>('/analyze-image', async (request, reply) => {
  const result = await analyzeImageHandler(request.body);
  
  if (!result.success) {
    return reply.status(400).send(result);
  }
  
  return reply.send(result);
});

// POST /analyze-image-file endpoint (handles file uploads)
fastify.post('/analyze-image-file', async (request, reply) => {
  try {
    // Check if request is multipart or has multipart content-type
    const contentType = request.headers['content-type'] || '';
    if (!request.isMultipart() && !contentType.includes('multipart/form-data')) {
      return reply.status(400).send({ 
        success: false, 
        error: 'Request must be multipart/form-data. Current content-type: ' + contentType 
      });
    }
    
    let parts;
    try {
      parts = request.parts();
    } catch (error: any) {
      console.error('Error parsing multipart data:', error);
      return reply.status(400).send({ 
        success: false, 
        error: 'Invalid multipart data: ' + (error?.message || error) 
      });
    }
    
    let imageBuffer: Buffer | null = null;
    let concepts: string[] | null = null;
    let mimeType = 'image/jpeg';

    try {
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          // Handle file upload
          mimeType = part.mimetype || 'image/jpeg';
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          imageBuffer = Buffer.concat(chunks);
        } else if (part.type === 'field' && part.fieldname === 'concepts') {
          // Handle concepts field
          try {
            const conceptsStr = part.value as string;
            concepts = JSON.parse(conceptsStr);
            if (!Array.isArray(concepts)) {
              throw new Error('Concepts must be an array');
            }
          } catch (err) {
            return reply.status(400).send({ success: false, error: 'Concepts must be a valid JSON array.' });
          }
        }
      }
    } catch (error: any) {
      console.error('Error processing multipart data:', error);
      return reply.status(400).send({ 
        success: false, 
        error: 'Failed to process multipart data: ' + (error?.message || error) 
      });
    }

    if (!imageBuffer || !concepts) {
      const result = await analyzeImageFileHandler({ 
        file: imageBuffer ? { buffer: imageBuffer, mimetype: mimeType } : null as any, 
        concepts: concepts || [] 
      });
      
      if (!result.success) {
        return reply.status(400).send(result);
      }
      
      return reply.send(result);
    }

    const result = await analyzeImageFileHandler({ 
      file: { buffer: imageBuffer, mimetype: mimeType }, 
      concepts 
    });
    
    if (!result.success) {
      return reply.status(400).send(result);
    }
    
    return reply.send(result);
  } catch (err) {
    console.error('Error analyzing image file:', err);
    return reply.status(500).send({ success: false, error: 'Failed to process image file.' });
  }
});

// POST /transcribe-audio endpoint (handles audio file uploads)
fastify.post('/transcribe-audio', async (request, reply) => {
  try {
    // Check if request is multipart or has multipart content-type
    const contentType = request.headers['content-type'] || '';
    if (!request.isMultipart() && !contentType.includes('multipart/form-data')) {
      return reply.status(400).send({ 
        success: false, 
        error: 'Request must be multipart/form-data. Current content-type: ' + contentType 
      });
    }
    
    let parts;
    try {
      parts = request.parts();
    } catch (error: any) {
      console.error('Error parsing multipart data:', error);
      return reply.status(400).send({ 
        success: false, 
        error: 'Invalid multipart data: ' + (error?.message || error) 
      });
    }
    let audioBuffer: Buffer | null = null;
    let filename = 'audio.wav';
    let mimeType = 'audio/wav';

    try {
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          // Handle audio file upload
          filename = part.filename || 'audio.wav';
          mimeType = part.mimetype || 'audio/wav';
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          audioBuffer = Buffer.concat(chunks);
        }
      }
    } catch (error: any) {
      console.error('Error processing multipart data:', error);
      return reply.status(400).send({ 
        success: false, 
        error: 'Failed to process multipart data: ' + (error?.message || error) 
      });
    }

    if (!audioBuffer) {
      const result = await transcribeAudioHandler({ file: null as any });
      return reply.status(400).send(result);
    }

    const result = await transcribeAudioHandler({ 
      file: { buffer: audioBuffer, filename, mimetype: mimeType } 
    });
    
    if (!result.success) {
      return reply.status(500).send(result);
    }
    
    return reply.send(result);
  } catch (err) {
    console.error('Error transcribing audio:', err);
    return reply.status(500).send({ success: false, error: 'Failed to process audio file.' });
  }
});

// POST /analyze-images-group endpoint (handles multiple image uploads)
fastify.post('/analyze-images-group', async (request, reply) => {
  try {
    // Ensure multipart/form-data request
    const contentType = request.headers['content-type'] || '';
    if (!request.isMultipart() && !contentType.includes('multipart/form-data')) {
      return reply.status(400).send({
        success: false,
        error: 'Request must be multipart/form-data. Current content-type: ' + contentType
      });
    }

    let parts;
    try {
      parts = request.parts();
    } catch (error: any) {
      console.error('Error parsing multipart data:', error);
      return reply.status(400).send({
        success: false,
        error: 'Invalid multipart data: ' + (error?.message || error)
      });
    }

    const files: any[] = [];
    let concepts: string[] | null = null;

    try {
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          files.push({ 
            buffer: Buffer.concat(chunks), 
            mimetype: part.mimetype,
            filename: part.filename 
          });
        } else if (part.type === 'field' && part.fieldname === 'concepts') {
          try {
            const conceptsStr = part.value as string;
            concepts = JSON.parse(conceptsStr);
            if (!Array.isArray(concepts)) {
              throw new Error('Concepts must be an array');
            }
          } catch (err) {
            return reply.status(400).send({ success: false, error: 'Concepts must be a valid JSON array.' });
          }
        }
      }
    } catch (error: any) {
      console.error('Error processing multipart data:', error);
      return reply.status(400).send({
        success: false,
        error: 'Failed to process multipart data: ' + (error?.message || error)
      });
    }

    if (!concepts) {
      return reply.status(400).send({ success: false, error: 'Missing concepts field.' });
    }

    if (files.length === 0) {
      return reply.status(400).send({ success: false, error: 'No files uploaded.' });
    }

    const result = await analyzeImagesGroupHandler({ files, concepts });
    
    if (!result.success) {
      return reply.status(400).send(result);
    }
    
    return reply.send(result);
  } catch (err) {
    console.error('Unexpected error in /analyze-images-group:', err);
    return reply.status(500).send({ success: false, error: 'Failed to process images.' });
  }
});

// GET /server-status endpoint
fastify.get('/server-status', async (request, reply) => {
  const result = await serverStatusHandler();
  return reply.send(result);
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();