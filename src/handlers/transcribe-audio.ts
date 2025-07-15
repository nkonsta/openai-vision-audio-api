import { transcribeAudio } from './openai-utils.js';
import { TranscribeAudioResponse, ErrorResponse } from './types.js';

export interface AudioFile {
  buffer: Buffer;
  filename?: string;
  mimetype: string;
}

export interface TranscribeAudioRequest {
  file: AudioFile;
}

export const transcribeAudioHandler = async (request: TranscribeAudioRequest): Promise<TranscribeAudioResponse | ErrorResponse> => {
  const { file } = request;

  if (!file || !file.buffer) {
    return { success: false, error: 'No audio file uploaded.' };
  }

  try {
    const filename = file.filename || 'audio.wav';
    const transcript = await transcribeAudio(file.buffer, filename, file.mimetype);
    
    return { 
      success: true, 
      data: {
        transcript: transcript
      }
    };
  } catch (err: any) {
    console.error('Error transcribing audio:', err);
    if (err.message.includes('Whisper API')) {
      return { success: false, error: 'Failed to transcribe audio.' };
    }
    return { success: false, error: 'Failed to process audio file.' };
  }
};