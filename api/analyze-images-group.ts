import { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeImagesGroupHandler } from '../src/handlers/index.js';
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
      multiples: true,
    });

    const [fields, files] = await form.parse(req);
    
    const conceptsField = fields.concepts?.[0];
    if (!conceptsField) {
      return res.status(400).json({ success: false, error: 'Missing concepts field' });
    }

    let concepts: string[];
    try {
      concepts = JSON.parse(conceptsField);
      if (!Array.isArray(concepts)) {
        throw new Error('Concepts must be an array');
      }
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Concepts must be a valid JSON array' });
    }

    const uploadedFiles = files.file;
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const processedFiles = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    
    const fileData = processedFiles.map(file => ({
      buffer: fs.readFileSync(file.filepath),
      mimetype: file.mimetype || 'image/jpeg',
      filename: file.originalFilename || 'uploaded-image.jpg'
    }));
    
    const result = await analyzeImagesGroupHandler({
      files: fileData,
      concepts
    });

    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error in analyze-images-group serverless function:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}