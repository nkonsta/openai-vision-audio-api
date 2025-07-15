import { analyzeImage } from './openai-utils.js';
import { AnalyzeImageRequest, AnalyzeImageResponse, ErrorResponse } from './types.js';

export const analyzeImageHandler = async (requestBody: AnalyzeImageRequest): Promise<AnalyzeImageResponse | ErrorResponse> => {
  const { base64Image, concepts } = requestBody;
  
  if (!base64Image || !concepts || !Array.isArray(concepts)) {
    return { success: false, error: 'Missing image or concepts list.' };
  }

  try {
    const result = await analyzeImage(base64Image, concepts);
    return { success: true, data: result };
  } catch (err: any) {
    console.error('Error analyzing image:', err);
    if (err.message.includes('OpenAI API')) {
      return { success: false, error: 'OpenAI API request failed.' };
    }
    if (err.message.includes('parse')) {
      return { success: false, error: 'Failed to parse AI response as JSON' };
    }
    return { success: false, error: 'OpenAI API request failed.' };
  }
};