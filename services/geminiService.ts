import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "../types";

export const MODEL_NAME = 'gemini-3-pro-image-preview';

const API_KEY_VALIDATION_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const isApiKeyError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('api key') ||
    message.includes('permission denied') ||
    message.includes('permission_denied') ||
    message.includes('unauthenticated') ||
    message.includes('invalid argument')
  );
};

const normalizeGeminiError = (error: unknown): Error => {
  if (isApiKeyError(error)) {
    return new Error('API_KEY_ERROR');
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Failed to communicate with Gemini.');
};

export const validateApiKey = async (apiKey: string): Promise<void> => {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('API_KEY_MISSING');
  }

  const response = await fetch(`${API_KEY_VALIDATION_URL}?key=${encodeURIComponent(trimmedKey)}`);
  if (response.ok) {
    return;
  }

  let details = 'Unable to validate API key.';

  try {
    const payload = await response.json();
    details = payload?.error?.message || details;
  } catch {
    // Ignore JSON parsing issues and fall back to the default message.
  }

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new Error('API_KEY_ERROR');
  }

  throw new Error(details);
};

export const generateImageFromPrompt = async (
  apiKey: string,
  prompt: string,
  settings: GenerationSettings,
): Promise<string> => {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('API_KEY_MISSING');
  }

  const ai = new GoogleGenAI({ apiKey: trimmedKey });

  try {
    const imageConfig: any = {
      imageSize: settings.resolution,
    };

    if (settings.aspectRatio !== 'Auto') {
      imageConfig.aspectRatio = settings.aspectRatio;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        temperature: settings.temperature,
        imageConfig,
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini.");
    }

    const parts = candidates[0].content.parts;
    let base64Image: string | undefined;

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${base64Image}`;
      }
    }

    throw new Error("No image data found in response.");

  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw normalizeGeminiError(error);
  }
};