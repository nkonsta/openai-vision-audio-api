import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
import { ImageBufferData } from './types';

// Ensure environment variables are loaded
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const analyzeImage = async (base64Image: string, concepts: string[], mimeType: string = 'image/jpeg') => {
  const prompt = `Check if the image contains any of the following concepts: ${concepts.join(', ')}. Be concise. Respond in JSON format where each concept maps to a confidence percentage between 0 and 100, e.g. { "cat": 85.3, "dog": 12.4 }.`;

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

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json() as any;
  const rawAnswer = result.choices?.[0]?.message?.content;
  
  if (!rawAnswer) {
    throw new Error('OpenAI API returned no content');
  }

  // Parse JSON from OpenAI response (remove markdown formatting if present)
  const jsonMatch = rawAnswer.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch ? jsonMatch[1] : rawAnswer;
  return JSON.parse(jsonString.trim());
};

export const analyzeMultipleImages = async (images: ImageBufferData[], concepts: string[]) => {
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

export const transcribeAudio = async (audioBuffer: Buffer, filename: string, mimeType: string) => {
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
    throw new Error(`Whisper API error: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json() as any;
  return result.text;
};