import { analyzeImage } from './openai-utils.js';
import { AnalyzeImageResponse, ErrorResponse } from './types.js';

export interface MultipartFile {
  buffer: Buffer;
  filename?: string;
  mimetype: string;
}

export interface AnalyzeImageFileRequest {
  file: MultipartFile;
  concepts: string[];
}

export const analyzeImageFileHandler = async (request: AnalyzeImageFileRequest): Promise<AnalyzeImageResponse | ErrorResponse> => {
  const { file, concepts } = request;

  if (!file || !file.buffer) {
    return { success: false, error: 'No file uploaded.' };
  }

  if (!concepts || !Array.isArray(concepts)) {
    return { success: false, error: 'Missing concepts field.' };
  }

  try {
    const base64Image = file.buffer.toString('base64');
    const result = await analyzeImage(base64Image, concepts, file.mimetype);
    return { success: true, data: result };
  } catch (err: any) {
    console.error('Error analyzing image file:', err);
    if (err.message.includes('OpenAI API')) {
      return { success: false, error: 'OpenAI API request failed.' };
    }
    if (err.message.includes('parse')) {
      return { success: false, error: 'Failed to parse AI response as JSON' };
    }
    return { success: false, error: 'Failed to process image file.' };
  }
};