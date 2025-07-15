import { VercelRequest, VercelResponse } from '@vercel/node';
import { transcribeAudioHandler } from '../src/handlers/index.js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
    });

    const [fields, files] = await form.parse(req);
    
    const uploadedFile = files.file?.[0];
    if (!uploadedFile) {
      return res.status(400).json({ success: false, error: 'No audio file uploaded' });
    }

    const buffer = fs.readFileSync(uploadedFile.filepath);
    
    const result = await transcribeAudioHandler({
      file: {
        buffer: buffer,
        mimetype: uploadedFile.mimetype || 'audio/wav',
        filename: uploadedFile.originalFilename || 'audio.wav'
      }
    });

    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error in transcribe-audio serverless function:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}