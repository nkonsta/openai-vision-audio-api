import { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeImageHandler } from '../src/handlers/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await analyzeImageHandler(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error in analyze-image serverless function:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}