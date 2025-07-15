import Fastify from 'fastify';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import FormData from 'form-data';

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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface AnalyzeImageRequest {
  base64Image: string;
  concepts: string[];
}

interface AnalyzeImageResponse {
  success: boolean;
  data: {
    [key: string]: number;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
}

// POST /analyze-image endpoint
fastify.post<{
  Body: AnalyzeImageRequest;
  Reply: AnalyzeImageResponse | ErrorResponse;
}>('/analyze-image', async (request, reply) => {
  const { base64Image, concepts } = request.body;
  
  if (!base64Image || !concepts || !Array.isArray(concepts)) {
    return reply.status(400).send({ success: false, error: 'Missing image or concepts list.' });
  }

  const prompt = `Check if the image contains any of the following concepts: ${concepts.join(', ')}. Be concise. Respond in JSON format where each concept maps to a confidence percentage between 0 and 100, e.g. { "cat": 85.3, "dog": 12.4 }.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // model: 'gpt-4o-mini',
        model: 'o4-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_completion_tokens: 1000
      })
    });

    const result = await response.json() as any;

    console.log('OpenAI API response:', JSON.stringify(result, null, 2));
    const rawAnswer = result.choices?.[0]?.message?.content;
    
    if (!rawAnswer) {
      console.error('OpenAI API returned no content');
      return reply.status(500).send({ success: false, error: 'No response from AI' });
    }
        
    // Parse JSON from OpenAI response (remove markdown formatting if present)
    let parsedResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = rawAnswer.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : rawAnswer;
      parsedResult = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      return reply.status(500).send({ success: false, error: 'Failed to parse AI response as JSON' });
    }
    
    return reply.send({ success: true, data: parsedResult });
  } catch (err) {
    console.error('Error analyzing image:', err);
    return reply.status(500).send({ success: false, error: 'OpenAI API request failed.' });
  }
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

    if (!imageBuffer) {
      return reply.status(400).send({ success: false, error: 'No file uploaded.' });
    }

    if (!concepts) {
      return reply.status(400).send({ success: false, error: 'Missing concepts field.' });
    }

    // Convert file buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = `Check if the image contains any of the following concepts: ${concepts.join(', ')}. Respond in JSON format where each concept maps to a confidence percentage between 0 and 100, e.g. { "cat": 85.3, "dog": 12.4 }.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'o4-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_completion_tokens: 1000
      })
    });

    const result = await response.json() as any;
    const rawAnswer = result.choices?.[0]?.message?.content;
    
    if (!rawAnswer) {
      console.error('OpenAI API returned no content');
      return reply.status(500).send({ success: false, error: 'No response from AI' });
    }
    
    console.log('Raw OpenAI response:', rawAnswer);
    
    // Parse JSON from OpenAI response (remove markdown formatting if present)
    let parsedResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = rawAnswer.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : rawAnswer;
      parsedResult = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      return reply.status(500).send({ success: false, error: 'Failed to parse AI response as JSON' });
    }
    
    return reply.send({ success: true, data: parsedResult });
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
      return reply.status(400).send({ success: false, error: 'No audio file uploaded.' });
    }

    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: filename,
      contentType: mimeType
    });
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Whisper API error:', errorData);
      return reply.status(500).send({ success: false, error: 'Failed to transcribe audio.' });
    }

    const result = await response.json() as any;
    
    return reply.send({ 
      success: true, 
      data: {
        transcript: result.text
      }
    });
  } catch (err) {
    console.error('Error transcribing audio:', err);
    return reply.status(500).send({ success: false, error: 'Failed to process audio file.' });
  }
});

// Helper function to analyze multiple images as a group
interface ImageBufferData {
  buffer: Buffer;
  mimeType: string;
}

const analyzeMultipleImages = async (
  images: ImageBufferData[],
  concepts: string[]
): Promise<any> => {
  const prompt = `Analyze ALL the provided images as a group. Check if any of these images contain the following concepts: ${concepts.join(', ')}. Consider the entire collection when determining confidence. Respond in JSON format where each concept maps to a confidence percentage between 0 and 100 based on the overall presence across all images. If a concept never appears, return 0.`;

  const messagesContent = [
    { type: 'text', text: prompt },
    ...images.map(img => ({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType};base64,${img.buffer.toString('base64')}`
      }
    }))
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'o4-mini',
      messages: [
        {
          role: 'user',
          content: messagesContent
        }
      ],
      max_completion_tokens: 3000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API responded with status ${response.status}: ${errorText}`);
  }

  const result = await response.json() as any;
  const rawAnswer = result.choices?.[0]?.message?.content;
  if (!rawAnswer) {
    throw new Error('OpenAI API returned no content');
  }

  // Extract JSON from markdown code blocks if present
  const jsonMatch = rawAnswer.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch ? jsonMatch[1] : rawAnswer;
  return JSON.parse(jsonString.trim());
};

// Allowed image MIME types for group analysis
const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

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

    const images: ImageBufferData[] = [];
    let concepts: string[] | null = null;
    let skippedImages = 0;

    try {
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          // Validate MIME type
          if (!ALLOWED_IMAGE_MIME_TYPES.includes(part.mimetype)) {
            skippedImages++;
            continue;
          }
          if (images.length >= 10) {
            // Skip additional images beyond limit
            skippedImages++;
            continue;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          images.push({ buffer: Buffer.concat(chunks), mimeType: part.mimetype });
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

    if (images.length === 0) {
      return reply.status(400).send({ success: false, error: 'No valid images uploaded.' });
    }

    try {
      const analysisResult = await analyzeMultipleImages(images, concepts);
      return reply.send({
        success: true,
        data: analysisResult,
        summary: {
          total_images_processed: images.length,
          skipped_images: skippedImages
        }
      });
    } catch (err: any) {
      console.error('Error analyzing images group:', err);
      return reply.status(500).send({ success: false, error: err?.message || 'Failed to analyze images.' });
    }
  } catch (err) {
    console.error('Unexpected error in /analyze-images-group:', err);
    return reply.status(500).send({ success: false, error: 'Failed to process images.' });
  }
});

// GET /server-status endpoint
fastify.get('/server-status', async (request, reply) => {
  return reply.send('Server is running');
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