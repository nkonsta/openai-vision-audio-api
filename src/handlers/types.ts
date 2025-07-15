export interface AnalyzeImageRequest {
  base64Image: string;
  concepts: string[];
}

export interface AnalyzeImageResponse {
  success: boolean;
  data: {
    [key: string]: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface ImageBufferData {
  buffer: Buffer;
  mimeType: string;
}

export interface TranscribeAudioResponse {
  success: boolean;
  data: {
    transcript: string;
  };
}

export interface AnalyzeImagesGroupResponse {
  success: boolean;
  data: {
    [key: string]: number;
  };
  summary: {
    total_images_processed: number;
    skipped_images: number;
  };
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];