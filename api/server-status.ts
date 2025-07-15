import { VercelRequest, VercelResponse } from '@vercel/node';
import { serverStatusHandler } from '../src/handlers/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await serverStatusHandler();
    return res.send(result);
  } catch (error) {
    console.error('Error in server-status serverless function:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}