import { analyzeMultipleImages } from './openai-utils';
import { AnalyzeImagesGroupResponse, ErrorResponse, ImageBufferData, ALLOWED_IMAGE_MIME_TYPES } from './types';

export interface ImageFile {
  buffer: Buffer;
  filename?: string;
  mimetype: string;
}

export interface AnalyzeImagesGroupRequest {
  files: ImageFile[];
  concepts: string[];
}

export const analyzeImagesGroupHandler = async (request: AnalyzeImagesGroupRequest): Promise<AnalyzeImagesGroupResponse | ErrorResponse> => {
  const { files, concepts } = request;

  if (!concepts || !Array.isArray(concepts)) {
    return { success: false, error: 'Missing concepts field.' };
  }

  if (!files || files.length === 0) {
    return { success: false, error: 'No files uploaded.' };
  }

  const images: ImageBufferData[] = [];
  let skippedImages = 0;

  // Process and validate uploaded files
  for (const file of files) {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      skippedImages++;
      continue;
    }
    if (images.length >= 10) {
      skippedImages++;
      continue;
    }
    images.push({ buffer: file.buffer, mimeType: file.mimetype });
  }

  if (images.length === 0) {
    return { success: false, error: 'No valid images uploaded.' };
  }

  try {
    const analysisResult = await analyzeMultipleImages(images, concepts);
    return {
      success: true,
      data: analysisResult,
      summary: {
        total_images_processed: images.length,
        skipped_images: skippedImages
      }
    };
  } catch (err: any) {
    console.error('Error analyzing images group:', err);
    if (err.message.includes('OpenAI API')) {
      return { success: false, error: 'OpenAI API request failed.' };
    }
    if (err.message.includes('parse')) {
      return { success: false, error: 'Failed to parse AI response as JSON' };
    }
    return { success: false, error: 'Failed to analyze images.' };
  }
};